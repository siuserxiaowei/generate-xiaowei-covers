#!/usr/bin/env node

import { createHash, randomBytes } from "node:crypto";
import { lstat, mkdir, open, readFile, realpath, rmdir, unlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const catalogPath = path.join(root, "assets", "style-presets.json");
const usage = [
  "Usage: node select-cover-style-pack.mjs <project-dir> --pack PACK_ID [--seed VALUE] [--ratios 3:4,9:16]",
  "       node select-cover-style-pack.mjs <project-dir> --styles ID,ID,... [--seed VALUE] [--ratios 3:4,9:16]",
  "       node select-cover-style-pack.mjs --list",
  "The item count is determined by the explicitly selected pack or style list; there is no default pack.",
].join("\n");

const digest = value => createHash("sha256").update(value).digest("hex");
const dnaFields = ["palette", "typography", "layout", "material", "portraitTreatment", "engine"];

function parse(args) {
  if (args.length === 1 && ["--list", "--help"].includes(args[0])) return { action: args[0] };
  const result = {};
  const seen = new Set();
  for (let i = 0; i < args.length; i += 1) {
    const key = args[i];
    if (key.startsWith("--")) {
      if (!["--pack", "--styles", "--seed", "--ratios"].includes(key) || seen.has(key)) {
        throw new Error(`Unknown or repeated option: ${key}`);
      }
      seen.add(key);
      const value = args[++i];
      if (!value || value.startsWith("--")) throw new Error(`Missing value for ${key}`);
      result[key.slice(2)] = value;
    } else if (!result.project) result.project = path.resolve(key);
    else throw new Error(usage);
  }
  if (!result.project) throw new Error(usage);
  return result;
}

function resolveStyle(catalog, value) {
  const style = catalog.styles.find(item => item.id === value || item.name === value || item.aliases.includes(value));
  if (!style) throw new Error(`Unknown style: ${value}. Use --list.`);
  return style;
}

function resolveRatios(catalog, value) {
  const ratios = value ? value.split(",").map(item => item.trim()).filter(Boolean) : [...catalog.defaultRatios];
  if (!ratios.length || ratios.some(ratio => !Object.hasOwn(catalog.surfaces, ratio))) {
    throw new Error(`Unsupported or empty ratio. Allowed: ${Object.keys(catalog.surfaces).join(", ")}`);
  }
  const unique = [...new Set(ratios)];
  if (unique.includes("21:9") && !unique.includes("1:1")) unique.push("1:1");
  return unique;
}

function distance(a, b) {
  return dnaFields.reduce((total, field) => total + (a.styleDna?.[field] !== b.styleDna?.[field] ? 1 : 0), 0);
}

function assertDistinct(styles) {
  if (styles.length < 2) throw new Error("A style pack needs at least two distinct styles.");
  const ids = styles.map(style => style.id);
  if (new Set(ids).size !== ids.length) throw new Error("A style pack cannot reuse a styleId. Choose distinct complete presets.");
  for (let i = 0; i < styles.length; i += 1) {
    for (let j = i + 1; j < styles.length; j += 1) {
      const d = distance(styles[i], styles[j]);
      if (d < 3) throw new Error(`Styles ${styles[i].id} and ${styles[j].id} differ in only ${d} DNA description fields; choose a more distinct candidate pack. This is not an image-level visual check.`);
    }
  }
}

async function fileInfo(filename) {
  try { return await lstat(filename); }
  catch (error) { if (error.code === "ENOENT") return null; throw error; }
}

async function resolveTarget(project) {
  // Resolve existing ancestors too, so a symlink cannot disguise home or the Skill directory.
  let cursor = project;
  const suffix = [];
  let canonical;
  while (!canonical) {
    try { canonical = path.resolve(await realpath(cursor), ...suffix.reverse()); }
    catch (error) {
      if (error.code !== "ENOENT") throw error;
      if (await fileInfo(cursor)) throw new Error("Unsafe target: an existing path cannot be resolved.");
      const parent = path.dirname(cursor);
      if (parent === cursor) throw error;
      suffix.push(path.basename(cursor));
      cursor = parent;
    }
  }
  const home = await realpath(os.homedir());
  const skillRoot = await realpath(root);
  if (canonical === path.parse(canonical).root || canonical === home ||
      canonical === skillRoot || canonical.startsWith(skillRoot + path.sep)) {
    throw new Error("Unsafe protected target: use a dedicated project directory outside the Skill directory, not the filesystem root or user home.");
  }
  const info = await fileInfo(canonical);
  if (info && !info.isDirectory()) throw new Error("Target project path must be a directory.");
  return canonical;
}

function sameRatios(a, b) {
  return Array.isArray(a) && Array.isArray(b) && isDeepStrictEqual([...a].sort(), [...b].sort());
}

async function requireFile(filename) {
  const info = await fileInfo(filename);
  if (!info?.isFile() || info.isSymbolicLink()) {
    throw new Error(`Incomplete or unsafe style pack: required regular file is missing: ${filename}. Inspect the package before reusing it.`);
  }
}

async function validateReplay(project, record, catalog) {
  if (record.schemaVersion !== 1 || record.mode !== "style_pack" ||
      typeof record.seed !== "string" || !record.seed || !Array.isArray(record.ratios) ||
      !record.ratios.length || new Set(record.ratios).size !== record.ratios.length ||
      record.ratios.some(ratio => !Object.hasOwn(catalog.surfaces, ratio)) ||
      !Array.isArray(record.items) || record.items.length < 2) {
    throw new Error("Invalid existing STYLE_SET.json; inspect it before continuing.");
  }
  await requireFile(path.join(project, "STYLE_SET_BRIEF.md"));
  const itemsInfo = await fileInfo(path.join(project, "items"));
  if (!itemsInfo?.isDirectory() || itemsInfo.isSymbolicLink()) throw new Error("Incomplete or unsafe style pack: items must be a regular directory.");
  for (const [index, item] of record.items.entries()) {
    const id = `style-${String(index + 1).padStart(2, "0")}`;
    if (item.id !== id || item.selectionFile !== `items/${id}/STYLE_SELECTION.json` ||
        item.briefFile !== `items/${id}/STYLE_BRIEF.md` || item.style?.id !== item.styleId ||
        item.seed !== digest(`${record.seed}:${item.styleId}:${index + 1}`).slice(0, 32) ||
        !sameRatios(item.ratios, record.ratios)) {
      throw new Error(`Invalid style pack item ${id}; inspect the package before reusing it.`);
    }
    const itemDir = path.join(project, "items", id);
    const itemInfo = await fileInfo(itemDir);
    if (!itemInfo?.isDirectory() || itemInfo.isSymbolicLink()) throw new Error(`Incomplete or unsafe style pack: ${id} must be a regular directory.`);
    const selectionFile = path.join(project, item.selectionFile);
    await requireFile(selectionFile);
    await requireFile(path.join(project, item.briefFile));
    const selection = JSON.parse(await readFile(selectionFile, "utf8"));
    if (selection.schemaVersion !== 1 || selection.mode !== "style_pack_item" ||
        selection.itemId !== id || selection.styleId !== item.styleId ||
        selection.seed !== item.seed || selection.parentSet !== "../../STYLE_SET.json" ||
        !isDeepStrictEqual(selection.style, item.style) ||
        !sameRatios(Object.keys(selection.surfaces || {}), record.ratios)) {
      throw new Error(`Invalid existing item record ${id}; inspect the package before reusing it.`);
    }
  }
}

async function preflightOutputs(project, record) {
  for (const name of ["STYLE_SET.json", "STYLE_SET_BRIEF.md", "STYLE_SELECTION.json", "STYLE_BRIEF.md"]) {
    if (await fileInfo(path.join(project, name))) throw new Error(`${name} already exists; inspect the project or use a new project directory.`);
  }
  const items = await fileInfo(path.join(project, "items"));
  if (items && (!items.isDirectory() || items.isSymbolicLink())) throw new Error("The items output path is occupied by a file or symlink; existing files were preserved.");
  for (const item of record.items) {
    if (await fileInfo(path.join(project, "items", item.id))) throw new Error(`Item output path ${item.id} already exists; existing files were preserved.`);
  }
}

async function writePackage(project, outputs, itemDirectories) {
  const created = [];
  async function ensureDirectory(dirname) {
    const info = await fileInfo(dirname);
    if (info) {
      if (!info.isDirectory() || info.isSymbolicLink()) throw new Error(`Output directory is occupied by a file or symlink: ${dirname}`);
      return;
    }
    await ensureDirectory(path.dirname(dirname));
    try { await mkdir(dirname); created.push({ path: dirname, type: "directory" }); }
    catch (error) {
      if (error.code !== "EEXIST") throw error;
      const raced = await fileInfo(dirname);
      if (!raced?.isDirectory() || raced.isSymbolicLink()) throw error;
    }
  }
  try {
    await ensureDirectory(project);
    await ensureDirectory(path.join(project, "items"));
    // Reserve all item directories exclusively before publishing any files. A raced-in item is a conflict.
    for (const dirname of itemDirectories) {
      await mkdir(dirname);
      created.push({ path: dirname, type: "directory" });
    }
    for (const { filename, content } of outputs) {
      await ensureDirectory(path.dirname(filename));
      const handle = await open(filename, "wx");
      const info = await handle.stat();
      created.push({ path: filename, type: "file", dev: info.dev, ino: info.ino });
      try { await handle.writeFile(content); }
      finally { await handle.close(); }
    }
  } catch (error) {
    // Only remove artifacts created by this invocation. Preserve raced-in or replaced user files.
    for (const entry of created.reverse()) {
      try {
        if (entry.type === "directory") await rmdir(entry.path);
        else {
          const info = await fileInfo(entry.path);
          if (info?.dev === entry.dev && info.ino === entry.ino) await unlink(entry.path);
        }
      } catch { /* A directory with new user content is deliberately left in place. */ }
    }
    throw error;
  }
}

function surfaces(catalog, ratios) {
  return Object.fromEntries(ratios.map(ratio => [ratio, catalog.surfaces[ratio]]));
}

function itemBrief(item) {
  const style = item.style;
  return [
    `# 风格整套 Item ${item.id}`,
    "",
    `- 风格：${style.name} (${style.id})`,
    `- 风格理由：${item.styleReason}`,
    `- 独立 seed：${item.seed}`,
    `- 引擎：${style.engine}`,
    "- DNA 描述字段差异仅用于候选筛选，实际视觉差异需检查成图。",
    "",
    "## 硬约束",
    "",
    "这张封面只能使用本 item 的完整视觉风格。不要借用其它 item 的字体、材质、调色板、人物处理或版式语法。",
    "同一 item 的不同画幅共享风格快照，但每个画幅必须独立构图；不要机械裁切或拉伸。",
    "",
    "## Visual DNA",
    "",
    ...Object.entries(style.styleDna || {}).map(([key, value]) => `- ${key}: ${value}`),
    "",
    "## 风格说明",
    "",
    style.visual,
    "",
    `人物处理：${style.portrait}`,
    `字体与字效：${style.typography}`,
    `避免：${style.avoid.join("；")}。`,
    "",
  ].join("\n");
}

function rootBrief(record) {
  return [
    "# 小伟多风格整套",
    "",
    `- 模式：${record.mode}`,
    `- Pack：${record.packId}`,
    `- 张数：${record.itemCount}`,
    `- 总 seed：${record.seed}`,
    `- 画幅：${record.ratios.join("、")}`,
    "",
    "## 执行规则",
    "",
    "每个 item 是一张完整风格封面；同一 item 的不同画幅才算变体。",
    "不同 item 必须使用不同 styleId；预设 Visual DNA 描述字段至少三项不同仅作为候选筛选，不代表成图已经通过视觉验收。",
    "共享小伟身份、事实台账和素材来源；每个 item 单独写 COVER_PROMPT.md、FACTS.md、assets/SOURCES.md 与 generation.json。",
    "禁止把 A 风格的字体、B 风格的材质、C 风格的调色板拼成没有定义的新风格。",
    "",
    "## Style map",
    "",
    "| Item | Style | Reason | Engine | Ratios |",
    "| --- | --- | --- | --- | --- |",
    ...record.items.map(item => `| ${item.id} | ${item.styleId} | ${item.styleReason} | ${item.style.engine} | ${item.ratios.join("、")} |`),
    "",
    "## 交付前检查",
    "",
    "- [ ] 每个 item 的 styleId 唯一。",
    "- [ ] 实际成图已逐张检查构图、标题、材质、人物与主题意象的视觉差异；不能用 DNA 字符串计数代替。",
    "- [ ] 同一 item 的各画幅只换构图，不换风格。",
    "- [ ] 每张封面都保留可辨认的小伟身份，并完成缩略图与事实核验。",
    "",
  ].join("\n");
}

async function main() {
  const args = parse(process.argv.slice(2));
  const catalog = JSON.parse(await readFile(catalogPath, "utf8"));
  if (args.action === "--help") { console.log(usage); return; }
  if (args.action === "--list") {
    console.log(JSON.stringify({
      packs: catalog.stylePacks.map(pack => ({ id: pack.id, name: pack.name, itemCount: pack.styleIds.length, styleIds: pack.styleIds })),
      styles: catalog.styles.map(style => ({ id: style.id, name: style.name, engine: style.engine })),
    }, null, 2));
    return;
  }
  if (args.pack && args.styles) throw new Error("Choose --pack or --styles, not both.");
  if (!args.pack && !args.styles) throw new Error("A style pack is required. Pass --pack PACK_ID or --styles ID,ID,...");
  args.project = await resolveTarget(args.project);

  let packId = args.pack || "custom";
  let styleIds;
  let reasons = {};
  if (args.pack) {
    const pack = catalog.stylePacks.find(item => item.id === args.pack || item.name === args.pack);
    if (!pack) throw new Error(`Unknown style pack: ${args.pack}. Use --list.`);
    packId = pack.id;
    styleIds = pack.styleIds;
    reasons = pack.rationales || {};
  } else {
    styleIds = args.styles.split(",").map(item => item.trim()).filter(Boolean);
    if (styleIds.length < 2) throw new Error("A style pack needs at least two distinct styles.");
  }
  const styles = styleIds.map(styleId => resolveStyle(catalog, styleId));
  styleIds = styles.map(style => style.id);
  assertDistinct(styles);
  const ratios = resolveRatios(catalog, args.ratios);
  const selectionPath = path.join(args.project, "STYLE_SET.json");
  const briefPath = path.join(args.project, "STYLE_SET_BRIEF.md");

  let existing;
  if (await fileInfo(selectionPath)) await requireFile(selectionPath);
  try { existing = JSON.parse(await readFile(selectionPath, "utf8")); } catch (error) { if (error.code !== "ENOENT") throw error; }
  if (existing) {
    await validateReplay(args.project, existing, catalog);
    const existingIds = existing.items?.map(item => item.styleId) || [];
    const existingPackId = catalog.stylePacks.find(pack => pack.id === existing.packId || pack.name === existing.packId)?.id || existing.packId;
    if (existingPackId !== packId || !isDeepStrictEqual(existingIds, styleIds) ||
        (args.seed !== undefined && args.seed !== existing.seed) ||
        (args.ratios !== undefined && !sameRatios(existing.ratios, ratios))) {
      throw new Error("This project already has a different STYLE_SET.json; use a new project directory.");
    }
    console.log(JSON.stringify({ reused: true, selectionPath, ...existing, itemCount: existing.items.length, constraints: { ...existing.constraints, candidateOnly: true } }, null, 2));
    return;
  }

  const seed = args.seed || randomBytes(16).toString("hex");
  const record = {
    schemaVersion: 1,
    mode: "style_pack",
    packId,
    itemCount: styles.length,
    catalogVersion: catalog.version,
    catalogSha256: digest(JSON.stringify(catalog)),
    seed,
    ratios,
    constraints: { uniqueStylePerItem: true, minDnaDistance: 3, candidateOnly: true, sameStyleAcrossRatios: true, mixedPresetFieldsAllowed: false },
    sharedInputs: { identityReference: "assets/portrait/xiaowei-original.jpg", identitySupport: "assets/portrait/xiaowei-context.jpg", facts: "FACTS.md", sources: "assets/SOURCES.md" },
    items: styles.map((style, index) => {
      const id = `style-${String(index + 1).padStart(2, "0")}`;
      const itemSeed = digest(`${seed}:${style.id}:${index + 1}`).slice(0, 32);
      return { id, styleId: style.id, styleName: style.name, styleReason: reasons[style.id] || "用户指定的独立完整风格。", seed: itemSeed, ratios, style, selectionFile: `items/${id}/STYLE_SELECTION.json`, briefFile: `items/${id}/STYLE_BRIEF.md` };
    }),
  };
  await preflightOutputs(args.project, record);
  const outputs = [
    { filename: selectionPath, content: JSON.stringify(record, null, 2) + "\n" },
    { filename: briefPath, content: rootBrief(record) },
    ...record.items.flatMap(item => [
      { filename: path.join(args.project, item.selectionFile), content: JSON.stringify({ schemaVersion: 1, mode: "style_pack_item", parentSet: "../../STYLE_SET.json", itemId: item.id, styleId: item.styleId, seed: item.seed, style: item.style, surfaces: surfaces(catalog, ratios) }, null, 2) + "\n" },
      { filename: path.join(args.project, item.briefFile), content: itemBrief(item) },
    ]),
  ];
  await writePackage(args.project, outputs, record.items.map(item => path.join(args.project, "items", item.id)));
  console.log(JSON.stringify({ reused: false, selectionPath, ...record }, null, 2));
}

main().catch(error => { console.error(`select-cover-style-pack: ${error.message}`); process.exitCode = 1; });
