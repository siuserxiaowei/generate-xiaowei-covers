#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, rm, stat, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const script = path.join(root, "scripts/select-cover-style.mjs");
const packScript = path.join(root, "scripts/select-cover-style-pack.mjs");
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
function runPack(args) {
  return JSON.parse(execFileSync(process.execPath, [packScript, ...args], { encoding: "utf8" }));
}
function packFails(args) {
  const result = spawnSync(process.execPath, [packScript, ...args], { encoding: "utf8" });
  assert.notEqual(result.status, 0, result.stdout);
  assert.match(result.stderr, /select-cover-style-pack:/);
  return result;
}
try {
  const catalog = JSON.parse(await readFile(path.join(root, "assets/style-presets.json"), "utf8"));
  const packsListed = runPack(["--list"]);
  assert.deepEqual(packsListed.styles.map(item => item.id), catalog.styles.map(item => item.id));
  assert.ok(packsListed.packs.every(pack => pack.itemCount === pack.styleIds.length));
  assert.match(execFileSync(process.execPath, [packScript, "--help"], { encoding: "utf8" }), /no default pack/);
  const listed = run(["--list"]);
  assert.deepEqual(listed.map(x => x.id), catalog.styles.map(x => x.id));
  assert.equal(new Set(listed.map(x => x.id)).size, listed.length);
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
    const result = run([path.join(tmp, "seed-" + i), "--style", "random", "--seed", "stable-" + i]);
    seen.add(result.style.id);
  }
  assert.ok(seen.size > 1, "Explicit random selection should permit different catalog styles");
  assert.ok([...seen].every(id => listed.some(item => item.id === id)));
  const a = run([path.join(tmp, "repeat-a"), "--style", "random", "--seed", "replay"]);
  const b = run([path.join(tmp, "repeat-b"), "--style", "random", "--seed", "replay"]);
  assert.equal(a.style.id, b.style.id);
  assert.equal(a.catalogSha256, b.catalogSha256);
  checks++;
  const horizontal = run([path.join(tmp, "all"), "--style", "阿囤囤", "--ratios", "3:4,9:16,16:9,4:3,3:1"]);
  assert.equal(horizontal.style.id, "atutun");
  for (const ratio of ["16:9", "4:3", "3:1"]) {
    assert.deepEqual(horizontal.surfaces[ratio].targetPixels, catalog.surfaces[ratio].targetPixels);
    assert.equal(horizontal.surfaces[ratio].pixelsMeaning, "requested_canvas_not_verified_native_output");
    assert.equal(horizontal.surfaces[ratio].nativePixels, undefined);
  }
  const wechat = run([path.join(tmp, "wechat"), "--style", "atutun", "--ratios", "21:9"]);
  assert.deepEqual(Object.keys(wechat.surfaces), ["21:9", "1:1"]);
  checks++;
  const locked = path.join(tmp, "original");
  const before = await readFile(path.join(locked, "STYLE_SELECTION.json"), "utf8");
  fails([locked, "--style", "gbro"]);
  fails([locked, "--ratios", "16:9"]);
  assert.equal(await readFile(path.join(locked, "STYLE_SELECTION.json"), "utf8"), before);
  checks++;
  const unselected = path.join(tmp, "unselected");
  fails([unselected]);
  await assert.rejects(stat(unselected), { code: "ENOENT" });
  const impact = run([path.join(tmp, "impact-alias"), "--style", "冲击型真人"]);
  assert.equal(impact.style.id, "impact");
  checks++;
  const series = run([path.join(tmp, "series-alias"), "--style", "统一系列"]);
  assert.equal(series.style.id, "series");
  assert.equal(series.style.engine, "imagegen");
  assert.equal(series.style.seriesRules.portraitMode, "generated_identity");
  assert.equal(series.style.seriesRules.randomScope, "content_variation_only");
  assert.equal(series.style.seriesRules.paletteMode, "topic_driven");
  assert.equal(series.style.seriesRules.layoutMode, "topic_driven");
  assert.equal(series.style.seriesRules.seriesLabelRequired, false);
  assert.match(await readFile(path.join(tmp, "series-alias", "STYLE_BRIEF.md"), "utf8"), /不贴原照片/);
  checks++;

  const packDir = path.join(tmp, "style-pack");
  const pack = runPack([packDir, "--pack", "xiaowei-diverse-5", "--ratios", "3:4,9:16", "--seed", "pack-replay"]);
  assert.equal(pack.mode, "style_pack");
  assert.equal(pack.items.length, 5);
  assert.equal(new Set(pack.items.map(item => item.styleId)).size, 5);
  assert.equal(pack.constraints.uniqueStylePerItem, true);
  assert.equal(pack.constraints.minDnaDistance, 3);
  assert.equal(pack.constraints.candidateOnly, true);
  assert.deepEqual(pack.items.map(item => item.ratios), Array.from({ length: 5 }, () => ["3:4", "9:16"]));
  assert.ok((await readFile(path.join(packDir, "STYLE_SET_BRIEF.md"), "utf8")).includes("Visual DNA"));
  for (const item of pack.items) {
    assert.equal(JSON.parse(await readFile(path.join(packDir, item.selectionFile), "utf8")).styleId, item.styleId);
    assert.match(await readFile(path.join(packDir, item.briefFile), "utf8"), /只能使用本 item 的完整视觉风格/);
  }
  const replay = runPack([packDir, "--pack", "xiaowei-diverse-5", "--ratios", "3:4,9:16", "--seed", "pack-replay"]);
  assert.equal(replay.reused, true);
  const packBefore = await readFile(path.join(packDir, "STYLE_SET.json"), "utf8");
  packFails([packDir, "--pack", "xiaowei-diverse-5", "--seed", "different-seed"]);
  assert.equal(await readFile(path.join(packDir, "STYLE_SET.json"), "utf8"), packBefore);
  const namedReplay = runPack([packDir, "--pack", "小伟五风格整套", "--ratios", "9:16,3:4"]);
  assert.equal(namedReplay.reused, true);
  checks++;

  const aliasDir = path.join(tmp, "alias-pack");
  const aliasPack = runPack([aliasDir, "--styles", "宝玉,归藏", "--seed", "canonical-alias"]);
  assert.deepEqual(aliasPack.items.map(item => item.styleId), ["baoyu", "editorial"]);
  assert.equal(aliasPack.itemCount, 2);
  assert.equal(runPack([aliasDir, "--styles", "baoyu,editorial", "--seed", "canonical-alias"]).reused, true);
  assert.equal(runPack([aliasDir, "--styles", "宝玉,杂志宋体"]).reused, true);
  checks++;

  const customRatioDir = path.join(tmp, "custom-pack-ratios");
  const customRatios = runPack([customRatioDir, "--styles", "baoyu,editorial", "--ratios", "4:3,3:1"]);
  assert.deepEqual(customRatios.ratios, ["4:3", "3:1"]);
  assert.equal(runPack([customRatioDir, "--styles", "baoyu,editorial"]).reused, true);
  for (const item of customRatios.items) {
    const selection = JSON.parse(await readFile(path.join(customRatioDir, item.selectionFile), "utf8"));
    assert.deepEqual(selection.surfaces["4:3"].targetPixels, catalog.surfaces["4:3"].targetPixels);
  }
  checks++;

  // Reusing a root record requires the whole recorded package to remain present.
  for (const missing of ["STYLE_SET_BRIEF.md", "items/style-01/STYLE_SELECTION.json", "items/style-01/STYLE_BRIEF.md"]) {
    const folder = path.join(tmp, "missing-" + missing.replaceAll("/", "-"));
    runPack([folder, "--styles", "baoyu,editorial"]);
    const rootRecord = await readFile(path.join(folder, "STYLE_SET.json"), "utf8");
    await rm(path.join(folder, missing));
    packFails([folder, "--styles", "baoyu,editorial"]);
    await assert.rejects(stat(path.join(folder, missing)), { code: "ENOENT" });
    assert.equal(await readFile(path.join(folder, "STYLE_SET.json"), "utf8"), rootRecord);
  }
  checks++;

  // All output conflicts must be detected before creating any part of a new pack.
  for (const conflict of ["STYLE_SET_BRIEF.md", "items/style-02", "items"]) {
    const folder = path.join(tmp, "conflict-" + conflict.replaceAll("/", "-"));
    await mkdir(folder);
    if (conflict === "items/style-02") {
      await mkdir(path.join(folder, conflict), { recursive: true });
      await writeFile(path.join(folder, conflict, "user-draft.txt"), "user draft");
    } else await writeFile(path.join(folder, conflict), "user draft");
    packFails([folder, "--styles", "baoyu,editorial"]);
    await assert.rejects(stat(path.join(folder, "STYLE_SET.json")), { code: "ENOENT" });
    await assert.rejects(stat(path.join(folder, "items/style-01")), error => ["ENOENT", "ENOTDIR"].includes(error.code));
    if (conflict === "items/style-02") assert.equal(await readFile(path.join(folder, conflict, "user-draft.txt"), "utf8"), "user draft");
    else assert.equal(await readFile(path.join(folder, conflict), "utf8"), "user draft");
  }
  checks++;

  // A dangling symlink is still an occupied output path.
  const dangling = path.join(tmp, "dangling-output");
  await mkdir(dangling);
  await symlink(path.join(tmp, "nonexistent-brief"), path.join(dangling, "STYLE_SET_BRIEF.md"));
  packFails([dangling, "--styles", "baoyu,editorial"]);
  assert.deepEqual(await readdir(dangling), ["STYLE_SET_BRIEF.md"]);
  checks++;

  // Invalid protected targets are tested in a disposable HOME/skill copy so a regression cannot touch real files.
  const protectedHome = path.join(tmp, "protected-home");
  const protectedSkill = path.join(protectedHome, "skill");
  await mkdir(path.join(protectedSkill, "scripts"), { recursive: true });
  await mkdir(path.join(protectedSkill, "assets"));
  await writeFile(path.join(protectedSkill, "scripts/select-cover-style-pack.mjs"), await readFile(packScript));
  await writeFile(path.join(protectedSkill, "assets/style-presets.json"), JSON.stringify(catalog));
  for (const target of [protectedHome, protectedSkill, path.join(protectedSkill, "nested")]) {
    const result = spawnSync(process.execPath, [path.join(protectedSkill, "scripts/select-cover-style-pack.mjs"), target, "--styles", "baoyu,editorial"], { encoding: "utf8", env: { ...process.env, HOME: protectedHome } });
    assert.notEqual(result.status, 0, result.stdout);
    assert.match(result.stderr, /protected|unsafe/i);
    await assert.rejects(stat(path.join(target, "STYLE_SET.json")), { code: "ENOENT" });
  }
  const homeAlias = path.join(tmp, "home-alias");
  await symlink(protectedHome, homeAlias);
  const aliasResult = spawnSync(process.execPath, [path.join(protectedSkill, "scripts/select-cover-style-pack.mjs"), homeAlias, "--styles", "baoyu,editorial"], { encoding: "utf8", env: { ...process.env, HOME: protectedHome } });
  assert.notEqual(aliasResult.status, 0, aliasResult.stdout);
  assert.match(aliasResult.stderr, /protected|unsafe/i);
  // Exercise '/' with filesystem mutation methods blocked, so a regression cannot write into the real root.
  const guardedEntry = path.join(tmp, "guarded-pack-root.mjs");
  await writeFile(guardedEntry, [
    'import fs from "node:fs/promises";',
    'import { syncBuiltinESMExports } from "node:module";',
    'for (const name of ["mkdir", "open", "writeFile", "unlink", "rmdir", "rename"]) fs[name] = async () => { throw new Error("TEST_MUTATION_BLOCKED"); };',
    'syncBuiltinESMExports();',
    `await import(${JSON.stringify(path.join(protectedSkill, "scripts/select-cover-style-pack.mjs"))});`,
  ].join("\n"));
  const rootResult = spawnSync(process.execPath, [guardedEntry, path.parse(tmp).root, "--styles", "baoyu,editorial"], { encoding: "utf8", env: { ...process.env, HOME: protectedHome } });
  assert.notEqual(rootResult.status, 0, rootResult.stdout);
  assert.match(rootResult.stderr, /protected|unsafe/i);
  assert.doesNotMatch(rootResult.stderr, /TEST_MUTATION_BLOCKED/);
  checks++;

  // A late write failure must roll back only this invocation's newly created outputs.
  const rollbackEntry = path.join(tmp, "failing-pack-write.mjs");
  await writeFile(rollbackEntry, [
    'import fs from "node:fs/promises";',
    'import { syncBuiltinESMExports } from "node:module";',
    'const originalOpen = fs.open;',
    'fs.open = async (filename, ...args) => { if (filename.endsWith("/items/style-02/STYLE_BRIEF.md")) throw new Error("TEST_WRITE_FAILED"); return originalOpen(filename, ...args); };',
    'syncBuiltinESMExports();',
    `await import(${JSON.stringify(path.join(protectedSkill, "scripts/select-cover-style-pack.mjs"))});`,
  ].join("\n"));
  const rollbackDir = path.join(tmp, "rollback-project");
  const rollbackResult = spawnSync(process.execPath, [rollbackEntry, rollbackDir, "--styles", "baoyu,editorial"], { encoding: "utf8", env: { ...process.env, HOME: protectedHome } });
  assert.notEqual(rollbackResult.status, 0, rollbackResult.stdout);
  assert.match(rollbackResult.stderr, /TEST_WRITE_FAILED/);
  await assert.rejects(stat(rollbackDir), { code: "ENOENT" });
  checks++;

  // An item directory created by another process after preflight remains an occupied destination.
  const raceEntry = path.join(tmp, "racing-pack-item.mjs");
  await writeFile(raceEntry, [
    'import fs from "node:fs/promises";',
    'import path from "node:path";',
    'import { syncBuiltinESMExports } from "node:module";',
    'const originalMkdir = fs.mkdir;',
    'fs.mkdir = async (dirname, ...args) => { const result = await originalMkdir(dirname, ...args); if (dirname.endsWith("/items")) { const item = path.join(dirname, "style-02"); await originalMkdir(item); await fs.writeFile(path.join(item, "user-draft.txt"), "raced-in user draft"); } return result; };',
    'syncBuiltinESMExports();',
    `await import(${JSON.stringify(path.join(protectedSkill, "scripts/select-cover-style-pack.mjs"))});`,
  ].join("\n"));
  const raceDir = path.join(tmp, "race-project");
  const raceResult = spawnSync(process.execPath, [raceEntry, raceDir, "--styles", "baoyu,editorial"], { encoding: "utf8", env: { ...process.env, HOME: protectedHome } });
  assert.notEqual(raceResult.status, 0, raceResult.stdout);
  await assert.rejects(stat(path.join(raceDir, "STYLE_SET.json")), { code: "ENOENT" });
  await assert.rejects(stat(path.join(raceDir, "STYLE_SET_BRIEF.md")), { code: "ENOENT" });
  await assert.rejects(stat(path.join(raceDir, "items/style-01")), { code: "ENOENT" });
  assert.equal(await readFile(path.join(raceDir, "items/style-02/user-draft.txt"), "utf8"), "raced-in user draft");
  checks++;

  const noPack = path.join(tmp, "no-implicit-pack");
  packFails([noPack]);
  await assert.rejects(stat(noPack), { code: "ENOENT" });
  packFails([noPack, "--pack", "xiaowei-diverse-5", "--styles", "baoyu,editorial"]);
  packFails([noPack, "--styles", "unknown,editorial"]);
  packFails([noPack, "--styles", "baoyu,editorial", "--ratios", "9:17"]);
  packFails([noPack, "--styles", "baoyu,editorial", "--seed"]);
  packFails([noPack, "--styles", "baoyu,editorial", "--styles", "series,oil"]);
  packFails([path.join(tmp, "duplicate-pack"), "--styles", "series,series"]);
  packFails([path.join(tmp, "unknown-pack"), "--pack", "missing-pack"]);
  packFails([path.join(tmp, "single-pack"), "--styles", "series"]);
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
  run([orphan, "--style", "impact"]);
  await rm(path.join(orphan, "STYLE_SELECTION.json"));
  await writeFile(path.join(orphan, "STYLE_BRIEF.md"), "user draft");
  fails([orphan, "--style", "impact"]);
  assert.equal(await readFile(path.join(orphan, "STYLE_BRIEF.md"), "utf8"), "user draft");
  checks++;
  console.log("Style selection tests passed: " + checks + " groups; " + listed.length + " catalog styles, canonical/seed replay, protected targets, complete-package checks, ratio plans and conflict preservation.");
} finally {
  await rm(tmp, { recursive: true, force: true });
}
