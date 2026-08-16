#!/usr/bin/env node

import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.dirname(scriptDir);

const requiredFiles = [
  "SKILL.md",
  "agents/openai.yaml",
  "LICENSE",
  "NOTICE.md",
  "assets/COVER_PROMPT.template.md",
  "assets/FACTS.template.md",
  "assets/SOURCES.md",
  "assets/templates/vertical.html",
  "assets/templates/wechat.html",
  "references/brand-system.md",
  "references/content-routing.md",
  "references/input-schema.md",
  "scripts/new-cover-project.mjs",
  "scripts/render-covers.mjs",
];

function fail(message) {
  throw new Error(message);
}

async function assertFile(relativePath) {
  const fullPath = path.join(root, relativePath);
  const info = await stat(fullPath).catch(() => null);
  if (!info?.isFile()) fail(`Required file is missing: ${relativePath}`);
}

async function validateSkillFrontmatter() {
  const markdown = await readFile(path.join(root, "SKILL.md"), "utf8");
  const frontmatter = markdown.match(/^---\n([\s\S]*?)\n---/u)?.[1];
  if (!frontmatter) fail("SKILL.md has no valid YAML frontmatter block.");

  const name = frontmatter.match(/^name:\s*(.+)$/mu)?.[1]?.trim();
  const description = frontmatter.match(/^description:\s*(.+)$/mu)?.[1]?.trim();
  const keys = [...frontmatter.matchAll(/^([a-z][a-z0-9_-]*):/gmu)].map((match) => match[1]);

  if (name !== "generate-xiaowei-covers") fail(`Unexpected skill name: ${name || "missing"}`);
  if (!description || description.length > 1024) fail("Skill description is missing or too long.");
  const unexpectedKeys = keys.filter((key) => !["name", "description"].includes(key));
  if (unexpectedKeys.length) fail(`Unexpected SKILL.md frontmatter keys: ${unexpectedKeys.join(", ")}`);
}

async function validateTemplateAssets(relativeTemplatePath) {
  const templatePath = path.join(root, relativeTemplatePath);
  const html = await readFile(templatePath, "utf8");
  const references = new Set(
    [...html.matchAll(/assets\/([^"'()?#<>\s]+)/gu)].map((match) => match[1]),
  );

  const missing = [];
  for (const reference of references) {
    const normalized = path.normalize(reference);
    if (normalized.startsWith("..") || path.isAbsolute(normalized)) {
      fail(`${relativeTemplatePath} contains unsafe asset path: assets/${reference}`);
    }
    const info = await stat(path.join(root, "assets", normalized)).catch(() => null);
    if (!info?.isFile()) missing.push(`assets/${reference}`);
  }

  if (missing.length) {
    fail(`${relativeTemplatePath} references missing assets:\n${missing.sort().join("\n")}`);
  }

  const exports = [...html.matchAll(/\sdata-export(?:\s|>)/gu)].length;
  if (exports === 0) fail(`${relativeTemplatePath} has no data-export nodes.`);
  return exports;
}

async function main() {
  for (const file of requiredFiles) await assertFile(file);
  await validateSkillFrontmatter();

  const verticalExports = await validateTemplateAssets("assets/templates/vertical.html");
  const wechatExports = await validateTemplateAssets("assets/templates/wechat.html");

  if (verticalExports !== 6) fail(`Expected 6 vertical exports, found ${verticalExports}.`);
  if (wechatExports !== 18) fail(`Expected 18 WeChat exports, found ${wechatExports}.`);

  console.log("Repository validation passed.");
  console.log(`Vertical exports: ${verticalExports}`);
  console.log(`WeChat exports: ${wechatExports}`);
}

main().catch((error) => {
  console.error(`validate-repo: ${error.message}`);
  process.exitCode = 1;
});
