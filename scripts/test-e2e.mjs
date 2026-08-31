#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { candidateTimestamps } from "./extract-video-frames.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.dirname(scriptDir);
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function fail(message) {
  throw new Error(message);
}

function run(scriptName, args) {
  const result = spawnSync(process.execPath, [path.join(scriptDir, scriptName), ...args], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) fail(`${scriptName} could not start: ${result.error.message}`);
  if (result.status !== 0) fail(`${scriptName} exited with status ${result.status}.`);
}

function runExpectFailure(scriptName, args, messagePattern) {
  const result = spawnSync(process.execPath, [path.join(scriptDir, scriptName), ...args], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error) fail(`${scriptName} could not start: ${result.error.message}`);
  assert.notEqual(result.status, 0, `${scriptName} should have rejected unsafe text.`);
  assert.match(`${result.stdout}\n${result.stderr}`, messagePattern);
}

async function assertDirectory(directoryPath) {
  const info = await stat(directoryPath).catch(() => null);
  if (!info?.isDirectory()) fail(`Expected directory is missing: ${directoryPath}`);
}

async function assertPng(filePath, expectedWidth, expectedHeight) {
  const buffer = await readFile(filePath);
  if (buffer.length < 24 || !buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    fail(`Expected PNG is invalid: ${filePath}`);
  }
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  assert.equal(width, expectedWidth, `${path.basename(filePath)} width`);
  assert.equal(height, expectedHeight, `${path.basename(filePath)} height`);
}

async function createAndRender(tempRoot, format, expectedFiles) {
  const projectDir = path.join(tempRoot, format);
  const outputDir = path.join(projectDir, "output");
  run("new-cover-project.mjs", [projectDir, format]);
  await assertDirectory(path.join(projectDir, "assets", "evidence"));
  run("render-covers.mjs", [path.join(projectDir, "cover.html"), outputDir, "--only", "release"]);
  for (const expected of expectedFiles) {
    await assertPng(path.join(outputDir, expected.file), expected.width, expected.height);
  }
  return projectDir;
}

async function main() {
  assert.deepEqual(candidateTimestamps(100, 3, 0.04, 0.96), [4, 50, 96]);

  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "xiaowei-cover-e2e-"));
  try {
    const verticalProject = await createAndRender(tempRoot, "vertical", [
      { file: "xiaowei-01-release-3x4.png", width: 1080, height: 1440 },
    ]);
    const verticalHtmlPath = path.join(verticalProject, "cover.html");
    const verticalHtml = await readFile(verticalHtmlPath, "utf8");
    await writeFile(
      verticalHtmlPath,
      verticalHtml.replace(
        "Qwen3-8B<br>",
        "THIS-UNBROKEN-TITLE-IS-INTENTIONALLY-FAR-TOO-LONG-FOR-THE-COVER<br>",
      ),
    );
    runExpectFailure(
      "render-covers.mjs",
      [verticalHtmlPath, path.join(verticalProject, "output"), "--only", "release"],
      /text safe-area overflow/u,
    );
    await createAndRender(tempRoot, "wechat", [
      { file: "wechat-01-release-21x9.png", width: 2100, height: 900 },
      { file: "wechat-01-release-1x1.png", width: 1080, height: 1080 },
      { file: "wechat-01-release-pair-preview.png", width: 1944, height: 620 },
    ]);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }

  console.log("End-to-end project creation and rendering passed.");
}

main().catch((error) => {
  console.error(`test-e2e: ${error.message}`);
  process.exitCode = 1;
});
