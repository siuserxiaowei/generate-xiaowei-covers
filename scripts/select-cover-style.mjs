#!/usr/bin/env node
import { createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const usage = "Usage: node select-cover-style.mjs <project-dir> [--style random|ID|中文名] [--seed VALUE] [--ratios 3:4,9:16,16:9]\n       node select-cover-style.mjs --list";
const digest = value => createHash("sha256").update(value).digest("hex");

function parse(args) {
  if (args.length === 1 && ["--list", "--help"].includes(args[0])) return { action: args[0] };
  const result = {};
  const seen = new Set();
  for (let i = 0; i < args.length; i++) {
    const key = args[i];
    if (key.startsWith("--")) {
      if (!["--style", "--seed", "--ratios"].includes(key) || seen.has(key)) throw new Error("Unknown or repeated option: " + key);
      seen.add(key);
      const value = args[++i];
      if (!value || value.startsWith("--")) throw new Error("Missing value for " + key);
      result[key.slice(2)] = value;
    } else if (!result.project) result.project = path.resolve(key);
    else throw new Error(usage);
  }
  if (!result.project) throw new Error(usage);
  return result;
}

function resolveStyle(catalog, value) {
  if (value === undefined || value === "random") return null;
  const style = catalog.styles.find(s => s.id === value || s.name === value || s.aliases.includes(value));
  if (!style) throw new Error("Unknown style: " + value + ". Use --list.");
  return style;
}

function resolveRatios(catalog, value) {
  const ratios = value ? value.split(",").map(x => x.trim()) : [...catalog.defaultRatios];
  if (!ratios.length || ratios.some(r => !Object.hasOwn(catalog.surfaces, r))) throw new Error("Unsupported or empty ratio. Allowed: " + Object.keys(catalog.surfaces).join(", "));
  const unique = [...new Set(ratios)];
  if (unique.includes("21:9") && !unique.includes("1:1")) unique.push("1:1");
  return unique;
}

function brief(record) {
  const s = record.style;
  return [
    "# 本次封面风格",
    "",
    "- 风格：" + s.name + " (" + s.id + ")",
    "- 选择方式：" + record.mode,
    "- seed：" + record.seed,
    "- 引擎：" + s.engine,
    "- 来源：" + s.source,
    "",
    "## 固定规则",
    "",
    "同一批次所有画幅共用本次风格、人物身份、主题和强调色；复跑读取现有选择，不重新抽签。",
    "先填写 COVER_PROMPT.md 的本次精确文案与 FACTS.md；这里的风格规则不提供事实或替你决定观点。",
    "先读本Skill references/identity-and-pose.md。身份固定，默认按内容变化姿势，不默认拿话筒；纪实或明确保留原动作时才锁定姿态。旧风格快照中的动作保留词句不能覆盖本次人物要求。",
    "",
    ...(s.id === "series" ? ["先读 references/series-cover.md 并复用本系列 SERIES.json。照片只参考身份；人物必须重新生成，不贴原照片。按主题变化配色、构图、场景、动作和对象，保持身份与大字拼贴语言；不继承被否定的v1固定模板。", ""] : []),
    "## 视觉",
    "",
    s.visual,
    "",
    "人物：" + s.portrait,
    "",
    "字体：" + s.typography,
    "",
    "避免：" + s.avoid.join("；") + "。",
    "",
    "适配边界：" + s.adaptation,
    "",
    "## 本次画幅",
    "",
    ...Object.entries(record.surfaces).map(([ratio, p]) => "- " + ratio + " / " + p.target + "：原生HTML参考尺寸 " + p.nativePixels.join("×") + "；" + p.composition),
    "",
    "imagegen 的实际输出尺寸以工具结果为准，逐张记录；不把提示词目标尺寸当成已实现的像素尺寸。",
    "HTML模式保留可编辑源文件；imagegen模式保留完整提示词和参考图片，不能把成品PNG称为可拖动图层模板。",
    "每个画幅独立构图；先生成一张母图，再用它和同一人物原图生成同批次其它画幅。",
    "",
  ].join("\n");
}

async function main() {
  const args = parse(process.argv.slice(2));
  if (args.action === "--help") { console.log(usage); return; }
  const raw = await readFile(path.join(root, "assets/style-presets.json"), "utf8");
  const catalog = JSON.parse(raw);
  if (args.action === "--list") {
    console.log(JSON.stringify(catalog.styles.map(({ id, name, engine }) => ({ id, name, engine })), null, 2));
    return;
  }
  const requestedStyle = resolveStyle(catalog, args.style);
  const ratios = resolveRatios(catalog, args.ratios);
  const selectionPath = path.join(args.project, "STYLE_SELECTION.json");
  const briefPath = path.join(args.project, "STYLE_BRIEF.md");
  let existing;
  try { existing = JSON.parse(await readFile(selectionPath, "utf8")); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  if (existing) {
    if (existing.schemaVersion !== 1 || !catalog.styles.some(s => s.id === existing.style?.id) || !existing.surfaces) throw new Error("Invalid existing STYLE_SELECTION.json; inspect it before continuing.");
    if ((requestedStyle && requestedStyle.id !== existing.style.id) ||
        (args.seed !== undefined && args.seed !== existing.seed) ||
        (args.ratios && JSON.stringify(Object.keys(existing.surfaces).sort()) !== JSON.stringify([...ratios].sort()))) {
      throw new Error("This project already has a different selection. Use a new project directory for a new style/seed/ratio set; existing files were preserved.");
    }
    try { await stat(briefPath); }
    catch (error) { if (error.code !== "ENOENT") throw error; await writeFile(briefPath, brief(existing), { flag: "wx" }); }
    console.log(JSON.stringify({ reused: true, selectionPath, ...existing }, null, 2));
    return;
  }
  if (args.style === undefined) throw new Error("Choose a style from the content brief and pass --style ID. Random selection requires explicit --style random.");
  const seed = args.seed ?? randomBytes(16).toString("hex");
  const index = Number(BigInt("0x" + digest("xiaowei-style-v1:" + seed)) % BigInt(catalog.styles.length));
  const style = requestedStyle ?? catalog.styles[index];
  const record = {
    schemaVersion: 1, catalogVersion: catalog.version, catalogSha256: digest(raw),
    mode: requestedStyle ? "specified" : "random", seed, style,
    surfaces: Object.fromEntries(ratios.map(r => [r, catalog.surfaces[r]])),
  };
  // Check both destinations before writing so an existing brief is not overwritten.
  try { await stat(briefPath); throw new Error("STYLE_BRIEF.md already exists without a selection; inspect the project."); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  await mkdir(args.project, { recursive: true });
  await writeFile(selectionPath, JSON.stringify(record, null, 2) + "\n", { flag: "wx" });
  await writeFile(briefPath, brief(record), { flag: "wx" });
  console.log(JSON.stringify({ reused: false, selectionPath, ...record }, null, 2));
}

main().catch(error => { console.error("select-cover-style: " + error.message); process.exitCode = 1; });
