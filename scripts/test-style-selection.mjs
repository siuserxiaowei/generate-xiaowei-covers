#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const script = path.join(root, "scripts/select-cover-style.mjs");
const tmp = await mkdtemp(path.join(os.tmpdir(), "xiaowei-style-test-"));
let checks = 0;
function run(args) {
  return JSON.parse(execFileSync(process.execPath, [script, ...args], { encoding: "utf8" }));
}
function fails(args) {
  const result = spawnSync(process.execPath, [script, ...args], { encoding: "utf8" });
  assert.notEqual(result.status, 0, result.stdout);
  assert.match(result.stderr, /select-cover-style:/);
}
try {
  const listed = run(["--list"]);
  assert.equal(listed.length, 6);
  assert.equal(new Set(listed.map(x => x.id)).size, 6);
  checks++;
  for (const item of listed) {
    const folder = path.join(tmp, item.id);
    const selected = run([folder, "--style", item.id]);
    assert.equal(selected.style.id, item.id);
    assert.equal(selected.mode, "specified");
    assert.deepEqual(Object.keys(selected.surfaces), ["3:4", "9:16"]);
    assert.ok(["html", "imagegen"].includes(selected.style.engine));
    const record = await readFile(path.join(folder, "STYLE_SELECTION.json"), "utf8");
    const rerun = run([folder]);
    assert.equal(rerun.reused, true);
    assert.equal(await readFile(path.join(folder, "STYLE_SELECTION.json"), "utf8"), record);
    assert.match(await readFile(path.join(folder, "STYLE_BRIEF.md"), "utf8"), /9:16/);
    checks++;
  }
  const seen = new Set();
  for (let i = 0; i < 36; i++) {
    const result = run([path.join(tmp, "seed-" + i), "--seed", "stable-" + i]);
    seen.add(result.style.id);
  }
  assert.equal(seen.size, listed.length, "Fixed seed sample should cover the whole catalog");
  const a = run([path.join(tmp, "repeat-a"), "--seed", "replay"]);
  const b = run([path.join(tmp, "repeat-b"), "--seed", "replay"]);
  assert.equal(a.style.id, b.style.id);
  assert.equal(a.catalogSha256, b.catalogSha256);
  checks++;
  const horizontal = run([path.join(tmp, "all"), "--style", "阿囤囤", "--ratios", "3:4,9:16,16:9"]);
  assert.equal(horizontal.style.id, "atutun");
  assert.deepEqual(horizontal.surfaces["16:9"].nativePixels, [3840, 2160]);
  const wechat = run([path.join(tmp, "wechat"), "--ratios", "21:9"]);
  assert.deepEqual(Object.keys(wechat.surfaces), ["21:9", "1:1"]);
  checks++;
  const locked = path.join(tmp, "original");
  const before = await readFile(path.join(locked, "STYLE_SELECTION.json"), "utf8");
  fails([locked, "--style", "gbro"]);
  fails([locked, "--ratios", "16:9"]);
  assert.equal(await readFile(path.join(locked, "STYLE_SELECTION.json"), "utf8"), before);
  checks++;
  const invalid = path.join(tmp, "invalid");
  fails([invalid, "--style", "unknown"]);
  fails([invalid, "--ratios", "9:17"]);
  fails([invalid, "--seed"]);
  fails([invalid, "--style", "original", "--style", "gbro"]);
  await assert.rejects(stat(invalid), { code: "ENOENT" });
  checks++;
  // Existing user brief must never be replaced by selecting a style.
  const orphan = path.join(tmp, "orphan");
  run([orphan]);
  await rm(path.join(orphan, "STYLE_SELECTION.json"));
  await writeFile(path.join(orphan, "STYLE_BRIEF.md"), "user draft");
  fails([orphan]);
  assert.equal(await readFile(path.join(orphan, "STYLE_BRIEF.md"), "utf8"), "user draft");
  checks++;
  console.log("Style selection tests passed: " + checks + " groups; all 6 styles, seed replay, ratio plans, existing-file preservation and invalid inputs.");
} finally {
  await rm(tmp, { recursive: true, force: true });
}
