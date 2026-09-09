#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.dirname(scriptDir);

const requiredFiles = [
  "SKILL.md",
  "agents/openai.yaml",
  "skills/xiaowei-content/SKILL.md",
  "skills/xiaowei-content/agents/openai.yaml",
  "skills/xiaowei-content/references/project-state.md",
  "skills/xiaowei-content/references/sources.md",
  "LICENSE",
  "NOTICE.md",
  "PROVENANCE.md",
  "SOURCES.md",
  "THIRD_PARTY_NOTICES.md",
  "ASSET_RIGHTS.csv",
  "assets/COVER_PROMPT.template.md",
  "assets/FACTS.template.md",
  "assets/SOURCES.md",
  "assets/templates/vertical.html",
  "assets/templates/wechat.html",
  "references/brand-system.md",
  "references/content-routing.md",
  "references/input-schema.md",
  "references/style-presets.md",
  "assets/style-presets.json",
  "scripts/select-cover-style.mjs",
  "scripts/test-style-selection.mjs",
  "references/claim-to-pixel-contract.md",
  "scripts/new-cover-project.mjs",
  "scripts/extract-video-frames.mjs",
  "scripts/render-covers.mjs",
  "scripts/claim-to-pixel.mjs",
  "scripts/demo-claim-to-pixel.mjs",
  "scripts/test-e2e.mjs",
  "scripts/test-claim-to-pixel.mjs",
  "contest/README.md",
  "contest/WEIBO_DRAFT.md",
  "contest/DEMO_SCRIPT_75S.md",
  "contest/demo/PROMPT.md",
  "contest/demo/claim-to-pixel.json",
  "contest/demo/claim-to-pixel.invalid.json",
  "contest/demo/artifacts/RUN_SUMMARY.json",
  "contest/demo/artifacts/board/claim2cover-demo-board.png",
  "contest/demo/artifacts/build/png/claim2cover-xiaohongshu-3x4.png",
  "contest/demo/artifacts/build/png/claim2cover-wechat-21x9.png",
  "contest/demo/artifacts/build/png/claim2cover-wechat-1x1.png",
];

const publicTextArtifacts = [
  "contest/demo/artifacts/FAIL.log",
  "contest/demo/artifacts/PASS.log",
  "contest/demo/artifacts/DEMO.html",
  "contest/demo/artifacts/SHOT_LIST.md",
  "contest/demo/artifacts/RUN_SUMMARY.json",
  "contest/demo/artifacts/BOARD_RENDER.log",
  "contest/demo/artifacts/build/CONTRACT_REPORT.json",
  "contest/demo/artifacts/build/RENDER.log",
];

function fail(message) {
  throw new Error(message);
}

async function assertFile(relativePath) {
  const fullPath = path.join(root, relativePath);
  const info = await stat(fullPath).catch(() => null);
  if (!info?.isFile()) fail(`Required file is missing: ${relativePath}`);
}

async function validateSkillFrontmatter(relativePath = "SKILL.md", expectedName = "generate-xiaowei-covers") {
  const markdown = await readFile(path.join(root, relativePath), "utf8");
  const frontmatter = markdown.match(/^---\n([\s\S]*?)\n---/u)?.[1];
  if (!frontmatter) fail("SKILL.md has no valid YAML frontmatter block.");

  const name = frontmatter.match(/^name:\s*(.+)$/mu)?.[1]?.trim();
  const description = frontmatter.match(/^description:\s*(.+)$/mu)?.[1]?.trim();
  const keys = [...frontmatter.matchAll(/^([a-z][a-z0-9_-]*):/gmu)].map((match) => match[1]);

  if (name !== expectedName) fail(`Unexpected skill name in ${relativePath}: ${name || "missing"}`);
  if (!description || description.length > 1024) fail("Skill description is missing or too long.");
  const unexpectedKeys = keys.filter((key) => !["name", "description"].includes(key));
  if (unexpectedKeys.length) fail(`Unexpected SKILL.md frontmatter keys: ${unexpectedKeys.join(", ")}`);
}

async function validateVerticalTextSafeAreas() {
  const html = await readFile(path.join(root, "assets/templates/vertical.html"), "utf8");
  const safeAreas = [...html.matchAll(/\sdata-text-safe=(?:"[^"]*"|'[^']*')/gu)].length;
  if (safeAreas !== 12) {
    fail(`Expected 12 vertical text-safe regions, found ${safeAreas}.`);
  }
  return safeAreas;
}

async function validateClaim2CoverFixture() {
  const fixture = JSON.parse(
    await readFile(path.join(root, "contest/demo/claim-to-pixel.json"), "utf8"),
  );
  if (fixture.schemaVersion !== 1) fail("Claim2Cover fixture must use schemaVersion 1.");
  if (fixture.aiDraft?.liveAiClaimed !== false) {
    fail("Recorded Claim2Cover fixture must declare liveAiClaimed: false.");
  }
  const platformKeys = Object.keys(fixture.platforms || {}).sort();
  if (platformKeys.join(",") !== "wechatSquare,wechatWide,xiaohongshu") {
    fail("Claim2Cover fixture must contain exactly three platform briefs.");
  }
  const types = new Set((fixture.claims || []).map((claim) => claim.type));
  for (const required of ["fact", "judgment", "unknown"]) {
    if (!types.has(required)) fail(`Claim2Cover fixture is missing ${required}.`);
  }

  const summary = JSON.parse(
    await readFile(path.join(root, "contest/demo/artifacts/RUN_SUMMARY.json"), "utf8"),
  );
  if (summary.liveAiClaimed !== false) fail("Frozen demo must declare liveAiClaimed: false.");
  if (summary.fixedBuild?.status !== "PENDING HUMAN SIGN-OFF") {
    fail("Frozen demo must remain pending human sign-off.");
  }
  if (summary.fixedBuild?.gatesPassed !== true || summary.fixedBuild?.publishReady !== false) {
    fail("Frozen demo must show passing gates without claiming publish readiness.");
  }
  if (summary.sourceRevision?.dirty !== false || !summary.sourceRevision?.commit) {
    fail("Frozen demo must record a clean source commit.");
  }
}

async function validateProvenanceFoundation() {
  const provenance = await readFile(path.join(root, "PROVENANCE.md"), "utf8");
  const foundation = provenance.match(
    /stable public foundation before Claim2Cover is commit `([a-f0-9]{40})`/u,
  )?.[1];
  if (!foundation) fail("PROVENANCE.md must record a full foundation commit hash.");
  const resolved = spawnSync("git", ["-C", root, "cat-file", "-e", `${foundation}^{commit}`], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (resolved.status !== 0) {
    fail(`PROVENANCE.md foundation commit does not resolve: ${foundation}`);
  }
}

async function validatePublicArtifactPrivacy() {
  for (const relativePath of publicTextArtifacts) {
    const content = await readFile(path.join(root, relativePath), "utf8");
    if (/\/Users\/|\/home\/|\/private\/tmp\/|\/tmp\/claim2cover-|[A-Za-z]:\\Users\\/u.test(content)) {
      fail(`Frozen public artifact exposes a machine-local path: ${relativePath}`);
    }
  }
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
  await validateSkillFrontmatter("skills/xiaowei-content/SKILL.md", "xiaowei-content");
  await validateProvenanceFoundation();
  await validateClaim2CoverFixture();
  await validatePublicArtifactPrivacy();
  const verticalTextSafeAreas = await validateVerticalTextSafeAreas();

  const verticalExports = await validateTemplateAssets("assets/templates/vertical.html");
  const wechatExports = await validateTemplateAssets("assets/templates/wechat.html");

  if (verticalExports !== 6) fail(`Expected 6 vertical exports, found ${verticalExports}.`);
  if (wechatExports !== 18) fail(`Expected 18 WeChat exports, found ${wechatExports}.`);

  console.log("Repository validation passed.");
  console.log(`Vertical exports: ${verticalExports}`);
  console.log(`WeChat exports: ${wechatExports}`);
  console.log(`Vertical text-safe regions: ${verticalTextSafeAreas}`);
  console.log("Claim2Cover recorded fixture: valid metadata");
}

main().catch((error) => {
  console.error(`validate-repo: ${error.message}`);
  process.exitCode = 1;
});
