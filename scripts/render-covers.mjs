#!/usr/bin/env node

import { execFileSync, spawn } from "node:child_process";
import { createRequire } from "node:module";
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const EXPORT_LAYOUT_CSS = [
  "html,body{margin:0!important;padding:0!important;}",
  "body{align-items:flex-start!important;align-content:flex-start!important;justify-content:flex-start!important;justify-items:start!important;}",
  ".sheet{align-items:flex-start!important;align-content:flex-start!important;justify-content:flex-start!important;justify-items:start!important;}",
  "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important;}",
].join("");

function usage() {
  return [
    "Usage: node render-covers.mjs <cover.html> [output-dir] [--only <tokens>]",
    "",
    "Exports every element marked with [data-export] as a PNG.",
    "The output name comes from data-file, or from the element id when",
    "data-file is absent. The default output directory is ./output next",
    "to the HTML file. --only accepts comma-separated ids, data-file names",
    "(with or without .png), data-route, data-pair, or data-preview-pair values.",
    "It may appear before or after output-dir.",
  ].join("\n");
}

function fail(message) {
  throw new Error(message);
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function parseCliArgs(args) {
  const positionals = [];
  let onlyValue = null;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--only") {
      if (onlyValue != null) fail("--only may be provided only once.");
      const value = args[index + 1];
      if (value == null || value.startsWith("--")) fail("--only requires a value.");
      onlyValue = value;
      index += 1;
      continue;
    }
    if (arg.startsWith("--only=")) {
      if (onlyValue != null) fail("--only may be provided only once.");
      onlyValue = arg.slice("--only=".length);
      continue;
    }
    if (arg.startsWith("-")) fail(`Unknown option: ${arg}\n${usage()}`);
    positionals.push(arg);
  }

  if (positionals.length < 1 || positionals.length > 2) fail(usage());
  const onlyTokens = onlyValue == null
    ? []
    : onlyValue
        .split(",")
        .map((token) => token.trim())
        .filter(Boolean);
  if (onlyValue != null && onlyTokens.length === 0) fail("--only requires at least one token.");

  return {
    htmlArg: positionals[0],
    outputArg: positionals[1],
    onlyTokens: unique(onlyTokens),
  };
}

function selectionKey(value) {
  return String(value || "").trim().replace(/\.png$/iu, "");
}

function selectExportItems(exports, onlyTokens, htmlPath) {
  if (exports.length === 0) fail(`No [data-export] elements found in ${htmlPath}.`);
  if (onlyTokens.length === 0) return exports;

  const selected = exports.filter((item) => {
    const candidates = [
      item.id,
      item.dataFile,
      item.dataRoute,
      item.dataPair,
      item.dataPreviewPair,
    ]
      .filter(Boolean)
      .map(selectionKey);
    return onlyTokens.some((token) => candidates.includes(selectionKey(token)));
  });
  if (selected.length === 0) {
    fail(`--only matched no [data-export] elements: ${onlyTokens.join(", ")}`);
  }
  return selected;
}

function ancestorNodeModules(startPath, packageName) {
  const candidates = [];
  let current = path.resolve(startPath);
  while (true) {
    candidates.push(path.join(current, "node_modules", packageName));
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return candidates;
}

async function cacheLinkedPlaywrightPackages() {
  const roots = [
    path.join(os.homedir(), "Library", "Caches", "ms-playwright", ".links"),
    path.join(os.homedir(), ".cache", "ms-playwright", ".links"),
  ];
  const candidates = [];

  for (const root of roots) {
    let entries;
    try {
      entries = await readdir(root, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isFile()) continue;
      try {
        const linkedPath = (await readFile(path.join(root, entry.name), "utf8")).trim();
        if (!linkedPath) continue;
        candidates.push(linkedPath);
        candidates.push(path.join(linkedPath, "node_modules", "playwright"));
        candidates.push(path.join(linkedPath, "node_modules", "playwright-core"));
        if (path.basename(linkedPath) === "playwright-core") {
          candidates.push(path.join(path.dirname(linkedPath), "playwright"));
        }
      } catch {
        // A stale Playwright cache link is harmless; try the remaining links.
      }
    }
  }

  return candidates;
}

async function loadPlaywright(searchFrom) {
  let globalRoot = "";
  try {
    globalRoot = execFileSync("npm", ["root", "-g"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    // npm is optional when Playwright resolves normally.
  }

  const nodePathRoots = (process.env.NODE_PATH || "")
    .split(path.delimiter)
    .filter(Boolean);
  const explicit = process.env.PLAYWRIGHT_MODULE;
  const candidates = unique([
    explicit,
    "playwright",
    "playwright-core",
    ...ancestorNodeModules(searchFrom, "playwright"),
    ...ancestorNodeModules(searchFrom, "playwright-core"),
    ...ancestorNodeModules(process.cwd(), "playwright"),
    ...ancestorNodeModules(process.cwd(), "playwright-core"),
    ...nodePathRoots.flatMap((root) => [
      path.join(root, "playwright"),
      path.join(root, "playwright-core"),
    ]),
    globalRoot && path.join(globalRoot, "playwright"),
    globalRoot && path.join(globalRoot, "playwright-core"),
    ...(await cacheLinkedPlaywrightPackages()),
  ]);

  const failures = [];
  for (const candidate of candidates) {
    try {
      const module = require(candidate);
      if (module?.chromium) return { chromium: module.chromium, source: candidate };
      failures.push(`${candidate}: module has no chromium export`);
    } catch (error) {
      if (explicit === candidate) failures.push(`${candidate}: ${error.message}`);
    }
  }

  const detail = failures.length ? `\n${failures.join("\n")}` : "";
  fail(
    "Could not load an installed Playwright package. Install playwright, run from " +
      "a project that has it, or set PLAYWRIGHT_MODULE to its package directory." +
      detail,
  );
}

async function launchChromium(chromium) {
  const attempts = [
    { label: "bundled Chromium", options: { headless: true } },
    { label: "Chrome channel", options: { headless: true, channel: "chrome" } },
  ];
  const macChrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  try {
    await access(macChrome);
    attempts.push({
      label: "system Google Chrome",
      options: { headless: true, executablePath: macChrome },
    });
  } catch {
    // System Chrome is only a fallback.
  }

  const errors = [];
  for (const attempt of attempts) {
    try {
      return await chromium.launch(attempt.options);
    } catch (error) {
      errors.push(`${attempt.label}: ${error.message}`);
    }
  }
  fail(`Could not launch Chromium.\n${errors.join("\n")}`);
}

class CdpClient {
  constructor(url) {
    this.url = url;
    this.nextId = 1;
    this.pending = new Map();
    this.eventWaiters = new Map();
    this.socket = null;
  }

  async connect() {
    this.socket = new WebSocket(this.url);
    await new Promise((resolve, reject) => {
      const handleOpen = () => {
        cleanup();
        resolve();
      };
      const handleError = () => {
        cleanup();
        reject(new Error(`Could not connect to Chrome DevTools: ${this.url}`));
      };
      const cleanup = () => {
        this.socket.removeEventListener("open", handleOpen);
        this.socket.removeEventListener("error", handleError);
      };
      this.socket.addEventListener("open", handleOpen, { once: true });
      this.socket.addEventListener("error", handleError, { once: true });
    });

    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(String(event.data));
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(message.error.message));
        else pending.resolve(message.result || {});
        return;
      }

      const waiters = this.eventWaiters.get(message.method);
      if (!waiters?.length) return;
      this.eventWaiters.delete(message.method);
      for (const waiter of waiters) waiter.resolve(message.params || {});
    });

    this.socket.addEventListener("close", () => {
      const error = new Error("Chrome DevTools connection closed unexpectedly.");
      for (const pending of this.pending.values()) pending.reject(error);
      this.pending.clear();
      for (const waiters of this.eventWaiters.values()) {
        for (const waiter of waiters) waiter.reject(error);
      }
      this.eventWaiters.clear();
    });
  }

  send(method, params = {}) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error("Chrome DevTools connection is not open."));
    }
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  waitFor(method, timeoutMs = 30_000) {
    return new Promise((resolve, reject) => {
      const waiters = this.eventWaiters.get(method) || [];
      const waiter = {
        resolve: (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      };
      const timer = setTimeout(() => {
        const active = this.eventWaiters.get(method) || [];
        this.eventWaiters.set(
          method,
          active.filter((entry) => entry !== waiter),
        );
        reject(new Error(`Timed out waiting for Chrome event ${method}.`));
      }, timeoutMs);
      waiters.push(waiter);
      this.eventWaiters.set(method, waiters);
    });
  }

  close() {
    if (this.socket && this.socket.readyState < WebSocket.CLOSING) this.socket.close();
  }
}

function waitForDevToolsUrl(child, timeoutMs = 30_000) {
  return new Promise((resolve, reject) => {
    let stderr = "";
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out starting Google Chrome.\n${stderr}`));
    }, timeoutMs);

    const handleData = (chunk) => {
      stderr += chunk.toString();
      const match = stderr.match(/DevTools listening on (ws:\/\/[^\s]+)/u);
      if (!match) return;
      cleanup();
      resolve(match[1]);
    };
    const handleExit = (code, signal) => {
      cleanup();
      reject(
        new Error(
          `Google Chrome exited before DevTools was ready (code ${code}, signal ${signal}).\n${stderr}`,
        ),
      );
    };
    const cleanup = () => {
      clearTimeout(timer);
      child.stderr.off("data", handleData);
      child.off("exit", handleExit);
    };

    child.stderr.on("data", handleData);
    child.once("exit", handleExit);
  });
}

async function waitForChromePage(debuggerUrl) {
  const parsed = new URL(debuggerUrl);
  const endpoint = `http://${parsed.host}/json/list`;
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(endpoint);
      const targets = await response.json();
      const page = targets.find((target) => target.type === "page" && target.webSocketDebuggerUrl);
      if (page) return page.webSocketDebuggerUrl;
    } catch {
      // Chrome may need a few milliseconds after advertising DevTools.
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  fail("Chrome started, but no debuggable page became available.");
}

async function evaluateCdp(client, expression) {
  const result = await client.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
    userGesture: false,
  });
  if (result.exceptionDetails) {
    const description =
      result.exceptionDetails.exception?.description ||
      result.exceptionDetails.text ||
      "Unknown page evaluation error";
    fail(description);
  }
  return result.result?.value;
}

function normalizePngName(rawName, index) {
  const value = String(rawName || "").trim();
  if (!value) fail(`Export ${index + 1} has neither data-file nor id.`);
  if (value === "." || value === ".." || path.basename(value) !== value) {
    fail(`Invalid output name "${value}"; data-file/id must be a file name, not a path.`);
  }

  const extension = path.extname(value).toLowerCase();
  if (extension && extension !== ".png") {
    fail(`Invalid output name "${value}"; only PNG output is supported.`);
  }
  const fileName = extension ? value : `${value}.png`;
  if (/[/\\\0]/u.test(fileName)) fail(`Invalid output name "${value}".`);
  return fileName;
}

function parseDeclaredDimension(value, label, exportName) {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    fail(`${exportName}: ${label} must be a positive integer, received "${value}".`);
  }
  return parsed;
}

function readPngDimensions(buffer, filePath) {
  if (buffer.length < 24 || !buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    fail(`${filePath}: output is not a valid PNG file.`);
  }
  if (buffer.subarray(12, 16).toString("ascii") !== "IHDR") {
    fail(`${filePath}: PNG is missing its IHDR header.`);
  }
  if (buffer.length < 12 || buffer.subarray(-8, -4).toString("ascii") !== "IEND") {
    fail(`${filePath}: PNG is incomplete or missing its IEND trailer.`);
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

async function waitForPageAssets(page) {
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;

    const images = [...document.images];
    for (const image of images) image.loading = "eager";
    await Promise.all(
      images.map(
        (image) =>
          new Promise((resolve, reject) => {
            const verify = () => {
              if (image.naturalWidth > 0 && image.naturalHeight > 0) resolve();
              else reject(new Error(`Image failed to load: ${image.currentSrc || image.src}`));
            };

            if (image.complete) {
              verify();
              return;
            }
            image.addEventListener("load", verify, { once: true });
            image.addEventListener(
              "error",
              () => reject(new Error(`Image failed to load: ${image.currentSrc || image.src}`)),
              { once: true },
            );
          }),
      ),
    );

    await Promise.all(
      images.map(async (image) => {
        if (typeof image.decode !== "function") return;
        try {
          await image.decode();
        } catch {
          // A loaded SVG or browser-cached image may not support decode reliably.
        }
      }),
    );

    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}

function validateExportItems(exports, htmlPath) {
  if (exports.length === 0) fail(`No [data-export] elements found in ${htmlPath}.`);

  const usedNames = new Set();
  return exports.map((item, index) => {
    const fileName = normalizePngName(item.dataFile || item.id, index);
    if (usedNames.has(fileName)) fail(`Duplicate output name: ${fileName}`);
    usedNames.add(fileName);

    if (item.display === "none" || item.visibility === "hidden") {
      fail(`${fileName}: export node is not visible.`);
    }
    if (!Number.isFinite(item.width) || !Number.isFinite(item.height)) {
      fail(`${fileName}: export node has non-finite dimensions.`);
    }
    if (item.width <= 0 || item.height <= 0) {
      fail(`${fileName}: export node has zero dimensions.`);
    }
    if (
      item.x != null &&
      (!Number.isFinite(item.x) || !Number.isFinite(item.y) || item.x < 0 || item.y < 0)
    ) {
      fail(`${fileName}: export node lies outside the capturable page area.`);
    }

    const measuredWidth = Math.round(item.width);
    const measuredHeight = Math.round(item.height);
    if (
      Math.abs(item.width - measuredWidth) > 0.01 ||
      Math.abs(item.height - measuredHeight) > 0.01
    ) {
      fail(
        `${fileName}: export node must use whole CSS pixels; measured ` +
          `${item.width}x${item.height}.`,
      );
    }

    const declaredWidth = parseDeclaredDimension(item.dataWidth, "data-width", fileName);
    const declaredHeight = parseDeclaredDimension(item.dataHeight, "data-height", fileName);
    if (declaredWidth != null && declaredWidth !== measuredWidth) {
      fail(`${fileName}: expected width ${declaredWidth}, measured ${measuredWidth}.`);
    }
    if (declaredHeight != null && declaredHeight !== measuredHeight) {
      fail(`${fileName}: expected height ${declaredHeight}, measured ${measuredHeight}.`);
    }

    return { ...item, fileName, measuredWidth, measuredHeight };
  });
}

async function validatePngOutput(outputPath, expectedWidth, expectedHeight) {
  const png = await readFile(outputPath);
  const pngSize = readPngDimensions(png, outputPath);
  if (pngSize.width !== expectedWidth || pngSize.height !== expectedHeight) {
    fail(
      `${path.basename(outputPath)}: PNG is ${pngSize.width}x${pngSize.height}, expected ` +
        `${expectedWidth}x${expectedHeight}.`,
    );
  }
  return pngSize;
}

async function renderWithPlaywright(browser, htmlPath, outputDir, onlyTokens) {
  let exported = 0;
  const context = await browser.newContext({
    deviceScaleFactor: 1,
    viewport: { width: 1920, height: 1440 },
  });

  try {
    const page = await context.newPage();
    page.setDefaultTimeout(30_000);
    await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "load" });
    await waitForPageAssets(page);
    await page.addStyleTag({ content: EXPORT_LAYOUT_CSS });
    await page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
    );

    const readExports = () => page.locator("[data-export]").evaluateAll((elements) =>
      elements.map((element, exportIndex) => {
        const rect = element.getBoundingClientRect();
        return {
          exportIndex,
          id: element.id,
          dataFile: element.getAttribute("data-file"),
          dataRoute: element.getAttribute("data-route"),
          dataPair: element.getAttribute("data-pair"),
          dataPreviewPair: element.getAttribute("data-preview-pair"),
          dataWidth: element.getAttribute("data-width"),
          dataHeight: element.getAttribute("data-height"),
          width: rect.width,
          height: rect.height,
          display: getComputedStyle(element).display,
          visibility: getComputedStyle(element).visibility,
        };
      }),
    );
    let rawExports = await readExports();
    if (rawExports.length === 0) fail(`No [data-export] elements found in ${htmlPath}.`);

    const maxWidth = Math.ceil(Math.max(...rawExports.map((item) => item.width)));
    const maxHeight = Math.ceil(Math.max(...rawExports.map((item) => item.height)));
    await page.setViewportSize({
      width: Math.max(1920, maxWidth + 32),
      height: Math.max(1440, maxHeight + 32),
    });
    await page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
    );
    rawExports = await readExports();
    const exports = validateExportItems(
      selectExportItems(rawExports, onlyTokens, htmlPath),
      htmlPath,
    );

    for (const item of exports) {
      const outputPath = path.join(outputDir, item.fileName);
      const locator = page.locator("[data-export]").nth(item.exportIndex);
      await locator.scrollIntoViewIfNeeded();
      await page.evaluate(
        () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
      );
      await locator.screenshot({
        animations: "disabled",
        path: outputPath,
        type: "png",
      });
      const pngSize = await validatePngOutput(
        outputPath,
        item.measuredWidth,
        item.measuredHeight,
      );
      exported += 1;
      console.log(`rendered ${item.fileName} (${pngSize.width}x${pngSize.height})`);
    }
  } finally {
    await context.close();
  }

  return exported;
}

async function findChromeExecutable() {
  const explicit = process.env.CHROME_PATH;
  const candidates = unique([
    explicit,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ]);
  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try the next browser location.
    }
  }
  fail("Playwright is unavailable and no local Chrome/Chromium executable was found.");
}

async function stopChild(child) {
  if (child.exitCode != null || child.signalCode != null) return;
  child.kill("SIGTERM");
  const exited = await Promise.race([
    new Promise((resolve) => child.once("exit", () => resolve(true))),
    new Promise((resolve) => setTimeout(() => resolve(false), 2_000)),
  ]);
  if (!exited && child.exitCode == null && child.signalCode == null) child.kill("SIGKILL");
}

async function renderWithSystemChrome(htmlPath, outputDir, onlyTokens) {
  const chromePath = await findChromeExecutable();
  const profileDir = await mkdtemp(path.join(os.tmpdir(), "xiaowei-cover-chrome-"));
  const child = spawn(
    chromePath,
    [
      "--headless=new",
      "--disable-background-networking",
      "--disable-component-update",
      "--disable-extensions",
      "--disable-gpu",
      "--hide-scrollbars",
      "--no-default-browser-check",
      "--no-first-run",
      "--remote-allow-origins=*",
      "--remote-debugging-port=0",
      "--force-device-scale-factor=1",
      "--window-size=1920,1440",
      `--user-data-dir=${profileDir}`,
      "about:blank",
    ],
    { stdio: ["ignore", "ignore", "pipe"] },
  );
  let client;

  try {
    const debuggerUrl = await waitForDevToolsUrl(child);
    const pageSocket = await waitForChromePage(debuggerUrl);
    client = new CdpClient(pageSocket);
    await client.connect();
    await client.send("Page.enable");
    await client.send("Runtime.enable");
    await client.send("Emulation.setDeviceMetricsOverride", {
      width: 1920,
      height: 1440,
      deviceScaleFactor: 1,
      mobile: false,
    });

    const loaded = client.waitFor("Page.loadEventFired");
    const navigation = await client.send("Page.navigate", {
      url: pathToFileURL(htmlPath).href,
    });
    if (navigation.errorText) fail(`Chrome navigation failed: ${navigation.errorText}`);
    await loaded;

    await evaluateCdp(
      client,
      String.raw`(async () => {
        if (document.fonts?.ready) await document.fonts.ready;
        const images = [...document.images];
        for (const image of images) image.loading = "eager";
        await Promise.all(images.map((image) => new Promise((resolve, reject) => {
          const verify = () => image.naturalWidth > 0 && image.naturalHeight > 0
            ? resolve()
            : reject(new Error("Image failed to load: " + (image.currentSrc || image.src)));
          if (image.complete) return verify();
          image.addEventListener("load", verify, { once: true });
          image.addEventListener("error", () => reject(new Error(
            "Image failed to load: " + (image.currentSrc || image.src)
          )), { once: true });
        })));
        await Promise.all(images.map(async (image) => {
          if (typeof image.decode !== "function") return;
          try { await image.decode(); } catch {}
        }));
        const style = document.createElement("style");
        style.textContent = ${JSON.stringify(EXPORT_LAYOUT_CSS)};
        document.head.appendChild(style);
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        return true;
      })()`,
    );

    let rawExports = await evaluateCdp(
      client,
      String.raw`[...document.querySelectorAll("[data-export]")].map((element, exportIndex) => {
        const rect = element.getBoundingClientRect();
        return {
          exportIndex,
          id: element.id,
          dataFile: element.getAttribute("data-file"),
          dataRoute: element.getAttribute("data-route"),
          dataPair: element.getAttribute("data-pair"),
          dataPreviewPair: element.getAttribute("data-preview-pair"),
          dataWidth: element.getAttribute("data-width"),
          dataHeight: element.getAttribute("data-height"),
          x: rect.left + scrollX,
          y: rect.top + scrollY,
          width: rect.width,
          height: rect.height,
          display: getComputedStyle(element).display,
          visibility: getComputedStyle(element).visibility,
        };
      })`,
    );
    if (rawExports.length === 0) fail(`No [data-export] elements found in ${htmlPath}.`);

    const maxWidth = Math.ceil(Math.max(...rawExports.map((item) => item.width)));
    const maxHeight = Math.ceil(Math.max(...rawExports.map((item) => item.height)));
    await client.send("Emulation.setDeviceMetricsOverride", {
      width: Math.max(1920, maxWidth + 32),
      height: Math.max(1440, maxHeight + 32),
      deviceScaleFactor: 1,
      mobile: false,
    });
    await evaluateCdp(
      client,
      String.raw`new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))`,
    );
    rawExports = await evaluateCdp(
      client,
      String.raw`[...document.querySelectorAll("[data-export]")].map((element, exportIndex) => {
        const rect = element.getBoundingClientRect();
        return {
          exportIndex,
          id: element.id,
          dataFile: element.getAttribute("data-file"),
          dataRoute: element.getAttribute("data-route"),
          dataPair: element.getAttribute("data-pair"),
          dataPreviewPair: element.getAttribute("data-preview-pair"),
          dataWidth: element.getAttribute("data-width"),
          dataHeight: element.getAttribute("data-height"),
          x: rect.left + scrollX,
          y: rect.top + scrollY,
          width: rect.width,
          height: rect.height,
          display: getComputedStyle(element).display,
          visibility: getComputedStyle(element).visibility,
        };
      })`,
    );
    const exports = validateExportItems(
      selectExportItems(rawExports, onlyTokens, htmlPath),
      htmlPath,
    );

    let exported = 0;
    for (const item of exports) {
      const captureRect = await evaluateCdp(
        client,
        String.raw`(async () => {
          const element = document.querySelectorAll("[data-export]")[${item.exportIndex}];
          element.scrollIntoView({ block: "start", inline: "start" });
          await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          const rect = element.getBoundingClientRect();
          return {
            x: rect.left + scrollX,
            y: rect.top + scrollY,
            width: rect.width,
            height: rect.height,
          };
        })()`,
      );
      if (
        Math.round(captureRect.width) !== item.measuredWidth ||
        Math.round(captureRect.height) !== item.measuredHeight
      ) {
        fail(`${item.fileName}: dimensions changed while preparing the screenshot.`);
      }
      const screenshot = await client.send("Page.captureScreenshot", {
        format: "png",
        fromSurface: true,
        captureBeyondViewport: true,
        clip: {
          x: captureRect.x,
          y: captureRect.y,
          width: item.measuredWidth,
          height: item.measuredHeight,
          scale: 1,
        },
      });
      const outputPath = path.join(outputDir, item.fileName);
      await writeFile(outputPath, Buffer.from(screenshot.data, "base64"));
      const pngSize = await validatePngOutput(
        outputPath,
        item.measuredWidth,
        item.measuredHeight,
      );
      exported += 1;
      console.log(`rendered ${item.fileName} (${pngSize.width}x${pngSize.height})`);
    }
    return { exported, source: chromePath };
  } finally {
    client?.close();
    await stopChild(child);
    await rm(profileDir, { recursive: true, force: true });
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    console.log(usage());
    return;
  }
  const { htmlArg, outputArg, onlyTokens } = parseCliArgs(args);

  const htmlPath = path.resolve(htmlArg);
  const htmlStat = await stat(htmlPath).catch(() => null);
  if (!htmlStat?.isFile()) fail(`HTML file does not exist: ${htmlPath}`);

  const outputDir = path.resolve(outputArg || path.join(path.dirname(htmlPath), "output"));
  await mkdir(outputDir, { recursive: true });

  let playwright;
  let browser;
  try {
    playwright = await loadPlaywright(path.dirname(htmlPath));
    browser = await launchChromium(playwright.chromium);
  } catch (error) {
    console.warn(`Playwright unavailable; using local Chrome fallback. ${error.message}`);
  }

  if (browser) {
    let exported;
    try {
      exported = await renderWithPlaywright(browser, htmlPath, outputDir, onlyTokens);
    } finally {
      await browser.close();
    }
    console.log(`Exported ${exported} cover(s) to ${outputDir}`);
    console.log(`Renderer: Playwright (${playwright.source})`);
    return;
  }

  const fallback = await renderWithSystemChrome(htmlPath, outputDir, onlyTokens);
  console.log(`Exported ${fallback.exported} cover(s) to ${outputDir}`);
  console.log(`Renderer: Chrome DevTools (${fallback.source})`);
}

main().catch((error) => {
  console.error(`render-covers: ${error.message}`);
  process.exitCode = 1;
});
