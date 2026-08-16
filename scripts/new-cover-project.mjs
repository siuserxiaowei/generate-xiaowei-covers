#!/usr/bin/env node

import {
  access,
  cp,
  mkdir,
  readFile,
  readdir,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const skillRoot = path.dirname(scriptDir);
const validFormats = new Set(["vertical", "wechat"]);

function usage() {
  return [
    "Usage: node new-cover-project.mjs <target-dir> <vertical|wechat>",
    "",
    "Creates a new cover project with COVER_PROMPT.md, FACTS.md, editable HTML,",
    "bundled assets, and output/ without overwriting an existing target.",
  ].join("\n");
}

function fail(message) {
  throw new Error(message);
}

async function pathExists(targetPath) {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function assertDirectory(directoryPath, label) {
  const info = await stat(directoryPath).catch(() => null);
  if (!info?.isDirectory()) fail(`${label} directory is missing: ${directoryPath}`);
}

async function assertTemplateAssets(templatePath) {
  const html = await readFile(templatePath, "utf8");
  const references = new Set(
    [...html.matchAll(/assets\/([^"'()?#<>\s]+)/gu)].map((match) => match[1]),
  );
  const missing = [];
  for (const relativePath of references) {
    const normalized = path.normalize(relativePath);
    if (normalized.startsWith("..") || path.isAbsolute(normalized)) {
      fail(`Template contains an unsafe asset path: assets/${relativePath}`);
    }
    const sourcePath = path.join(skillRoot, "assets", normalized);
    const info = await stat(sourcePath).catch(() => null);
    if (!info?.isFile()) missing.push(`assets/${relativePath}`);
  }
  if (missing.length) {
    fail(
      `Template references missing bundled assets:\n${missing
        .sort()
        .map((item) => `- ${item}`)
        .join("\n")}`,
    );
  }
}

async function listFiles(directoryPath, prefix = "") {
  const entries = await readdir(directoryPath, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const relativePath = path.join(prefix, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(path.join(directoryPath, entry.name), relativePath)));
    } else if (entry.isFile()) {
      files.push(relativePath);
    }
  }
  return files;
}

async function sourcesMarkdown(format, portraitFiles, brandFiles) {
  const sourceTemplate = path.join(skillRoot, "assets", "SOURCES.md");
  if (await pathExists(sourceTemplate)) return readFile(sourceTemplate, "utf8");

  const lines = [
    "# Asset Sources",
    "",
    `Project template: \`${format}\``,
    "",
    "> Update this file whenever you add or replace a photo, screenshot, logo,",
    "> icon, or other third-party asset. Record the original URL, owner, license,",
    "> retrieval date, and any required attribution.",
    "",
    "## Portrait assets",
    "",
  ];

  if (portraitFiles.length) {
    lines.push(...portraitFiles.map((file) => `- \`portrait/${file}\` — bundled default; replace source details before publishing.`));
  } else {
    lines.push("- No bundled portrait assets.");
  }

  lines.push("", "## Brand assets", "");
  if (brandFiles.length) {
    lines.push(...brandFiles.map((file) => `- \`brand/${file}\` — bundled default; verify trademark and usage terms before publishing.`));
  } else {
    lines.push("- No bundled brand assets.");
  }

  lines.push("");
  return `${lines.join("\n")}\n`;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    console.log(usage());
    return;
  }
  if (args.length !== 2) fail(usage());

  const [targetArg, format] = args;
  if (!validFormats.has(format)) fail(`Unknown format "${format}".\n${usage()}`);

  const targetDir = path.resolve(targetArg);
  if (targetDir === path.parse(targetDir).root) fail("Refusing to use a filesystem root as the target.");
  if (await pathExists(targetDir)) fail(`Target already exists; nothing was changed: ${targetDir}`);

  const templatePath = path.join(skillRoot, "assets", "templates", `${format}.html`);
  const templateInfo = await stat(templatePath).catch(() => null);
  if (!templateInfo?.isFile()) fail(`Template is missing: ${templatePath}`);
  await assertTemplateAssets(templatePath);

  const factsTemplatePath = path.join(skillRoot, "assets", "FACTS.template.md");
  const factsTemplateInfo = await stat(factsTemplatePath).catch(() => null);
  if (!factsTemplateInfo?.isFile()) {
    fail(`Facts template is missing: ${factsTemplatePath}`);
  }

  const coverPromptTemplatePath = path.join(skillRoot, "assets", "COVER_PROMPT.template.md");
  const coverPromptTemplateInfo = await stat(coverPromptTemplatePath).catch(() => null);
  if (!coverPromptTemplateInfo?.isFile()) {
    fail(`Cover prompt template is missing: ${coverPromptTemplatePath}`);
  }

  const portraitSource = path.join(skillRoot, "assets", "portrait");
  const brandSource = path.join(skillRoot, "assets", "brand");
  await assertDirectory(portraitSource, "Portrait assets");
  await assertDirectory(brandSource, "Brand assets");

  const portraitFiles = await listFiles(portraitSource);
  const brandFiles = await listFiles(brandSource);
  const sources = await sourcesMarkdown(format, portraitFiles, brandFiles);

  const parentDir = path.dirname(targetDir);
  await mkdir(parentDir, { recursive: true });
  try {
    await mkdir(targetDir, { recursive: false });
  } catch (error) {
    if (error?.code === "EEXIST") {
      fail(`Target already exists; nothing was changed: ${targetDir}`);
    }
    throw error;
  }

  try {
    await mkdir(path.join(targetDir, "assets"), { recursive: false });
    await mkdir(path.join(targetDir, "output"), { recursive: false });

    await cp(templatePath, path.join(targetDir, "cover.html"), {
      force: false,
      errorOnExist: true,
    });
    await cp(factsTemplatePath, path.join(targetDir, "FACTS.md"), {
      force: false,
      errorOnExist: true,
    });
    await cp(coverPromptTemplatePath, path.join(targetDir, "COVER_PROMPT.md"), {
      force: false,
      errorOnExist: true,
    });
    await cp(path.join(skillRoot, "LICENSE"), path.join(targetDir, "LICENSE"), {
      force: false,
      errorOnExist: true,
    });
    await cp(portraitSource, path.join(targetDir, "assets", "portrait"), {
      recursive: true,
      force: false,
      errorOnExist: true,
    });
    await cp(brandSource, path.join(targetDir, "assets", "brand"), {
      recursive: true,
      force: false,
      errorOnExist: true,
    });
    await writeFile(path.join(targetDir, "assets", "SOURCES.md"), sources, {
      encoding: "utf8",
      flag: "wx",
    });
  } catch (error) {
    fail(
      `Project creation failed after reserving ${targetDir}; no existing files were ` +
        `overwritten. Inspect or remove the partial project before retrying. ${error.message}`,
    );
  }

  console.log(`Created ${format} cover project: ${targetDir}`);
  console.log(`Template: ${path.join(targetDir, "cover.html")}`);
  console.log(`Cover prompt: ${path.join(targetDir, "COVER_PROMPT.md")}`);
  console.log(`Render: node ${path.join(skillRoot, "scripts", "render-covers.mjs")} ${path.join(targetDir, "cover.html")}`);
}

main().catch((error) => {
  console.error(`new-cover-project: ${error.message}`);
  process.exitCode = 1;
});
