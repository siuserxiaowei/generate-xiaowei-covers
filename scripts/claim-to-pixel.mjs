#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  access,
  mkdir,
  readFile,
  rename,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const skillRoot = path.dirname(scriptDir);
const CONTRACT_NAME = "Claim-to-Pixel";
const CONTRACT_VERSION = 1;
const SIGNOFF_CONFIRMATION = "reviewed-facts-rights-previews";

const SURFACES = {
  xiaohongshu: {
    ratio: "3:4",
    width: 1080,
    height: 1440,
    maxTitleChars: 18,
    maxTitleLines: 2,
    maxPromiseChars: 34,
    outputFile: "claim2cover-xiaohongshu-3x4.png",
  },
  wechatWide: {
    ratio: "21:9",
    width: 2100,
    height: 900,
    maxTitleChars: 14,
    maxTitleLines: 2,
    maxPromiseChars: 28,
    outputFile: "claim2cover-wechat-21x9.png",
  },
  wechatSquare: {
    ratio: "1:1",
    width: 1080,
    height: 1080,
    maxTitleChars: 10,
    maxTitleLines: 2,
    maxPromiseChars: 18,
    outputFile: "claim2cover-wechat-1x1.png",
  },
};

const CLAIM_STATUSES = {
  fact: new Set(["verified", "pending"]),
  judgment: new Set(["editorial"]),
  unknown: new Set(["unverified"]),
};

const RIGHTS_STATUSES = new Set([
  "owned",
  "generated-owned",
  "licensed",
  "public-domain",
  "trademark-context-only",
  "unverified",
]);

const ABSOLUTE_PHRASES = [
  "百分之百",
  "全面领先",
  "全网第一",
  "全网唯一",
  "零风险",
  "零失败",
  "最强",
  "最快",
  "第一",
  "唯一",
  "永久",
  "绝对",
  "保证",
  "必然",
  "彻底",
];

function usage() {
  return [
    "Claim2Cover Claim-to-Pixel contract",
    "",
    "Usage:",
    "  node claim-to-pixel.mjs validate <manifest.json> [--require-clean]",
    "  node claim-to-pixel.mjs build <manifest.json> <output-dir> [--no-render] [--require-clean]",
    "  node claim-to-pixel.mjs signoff <manifest.json> --reviewer <name> --note <note> \\",
    `    --confirm ${SIGNOFF_CONFIRMATION} [--reviewed-at <ISO-8601>]`,
    "  node claim-to-pixel.mjs release-check <manifest.json>",
    "",
    "validate checks the content contract but leaves public release pending until a human signs off.",
    "release-check additionally requires a human sign-off and a clean Git commit.",
  ].join("\n");
}

class CliError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function fail(code, message) {
  throw new CliError(code, message);
}

function isRecord(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function nonEmpty(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizedText(value) {
  return String(value || "")
    .normalize("NFKC")
    .replace(/[\s，。！？、：；「」『』（）()【】\[\]“”‘’'"·—–-]+/gu, "")
    .toLowerCase();
}

function graphemeCount(value) {
  return [...String(value || "").replace(/\s/gu, "")].length;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function markdownCell(value) {
  return String(value ?? "").replaceAll("|", "\\|").replace(/\s+/gu, " ").trim();
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n\r]/u.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function jsonText(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function stableJsonValue(value) {
  if (Array.isArray(value)) return value.map(stableJsonValue);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, stableJsonValue(value[key])]),
  );
}

function approvalPayloadSha256(manifest) {
  const { humanSignoff: _humanSignoff, ...approvalPayload } = manifest;
  return sha256(JSON.stringify(stableJsonValue(approvalPayload)));
}

function issue(issues, gate, code, location, message) {
  issues.push({ gate, code, location, message });
}

function parseDateOnly(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(String(value || ""))) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function parseIsoDateTime(value) {
  if (!nonEmpty(value)) return false;
  const time = new Date(value).getTime();
  return Number.isFinite(time);
}

function extractRiskTokens(title) {
  const tokens = new Set();
  const text = String(title || "").normalize("NFKC");
  for (const phrase of ABSOLUTE_PHRASES) {
    if (text.includes(phrase)) tokens.add(phrase);
  }
  for (const match of text.matchAll(/\d+(?:\.\d+)?\s*(?:%|％|倍|x|万|亿|元|秒|分钟|小时|天|步|种|个|项|gb|mb|tb|b)?/giu)) {
    if (match[0].trim()) tokens.add(match[0].trim());
  }
  for (const match of text.matchAll(/[零一二三四五六七八九十百千万亿两]+\s*(?:倍|步|种|个|项|分钟|小时|天)/gu)) {
    if (match[0].trim()) tokens.add(match[0].trim());
  }
  return [...tokens];
}

function runGit(startDirectory, args) {
  const result = spawnSync("git", ["-C", startDirectory, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error || result.status !== 0) return null;
  return result.stdout.trim();
}

function repositoryState(manifestPath) {
  const startDirectory = path.dirname(manifestPath);
  const root = runGit(startDirectory, ["rev-parse", "--show-toplevel"]);
  if (!root) {
    return {
      available: false,
      root: null,
      commit: null,
      shortCommit: null,
      dirty: null,
      changeCount: null,
    };
  }
  const commit = runGit(root, ["rev-parse", "HEAD"]);
  const status = runGit(root, ["status", "--porcelain=v1", "--untracked-files=all"]);
  const changes = status ? status.split("\n").filter(Boolean) : [];
  return {
    available: true,
    root,
    commit,
    shortCommit: commit?.slice(0, 12) || null,
    dirty: changes.length > 0,
    changeCount: changes.length,
  };
}

async function readManifest(manifestArg) {
  const manifestPath = path.resolve(manifestArg);
  const info = await stat(manifestPath).catch(() => null);
  if (!info?.isFile()) fail("CTP_INPUT", `Manifest does not exist: ${manifestPath}`);
  const raw = await readFile(manifestPath, "utf8");
  let manifest;
  try {
    manifest = JSON.parse(raw);
  } catch (error) {
    fail("CTP_JSON", `Manifest is not valid JSON: ${error.message}`);
  }
  return { manifestPath, raw, manifest };
}

async function validateContract(manifest, manifestPath) {
  const issues = [];
  const gateNames = [
    "schema",
    "claim-ledger",
    "sources",
    "title-truth",
    "independent-briefs",
    "asset-rights",
    "safe-areas",
    "human-signoff",
  ];

  if (!isRecord(manifest)) {
    issue(issues, "schema", "CTP_SCHEMA_ROOT", "$", "Manifest root must be an object.");
    return { issues, gates: gateNames.map((name) => ({ name, pass: name !== "schema" ? false : false })) };
  }

  if (manifest.schemaVersion !== CONTRACT_VERSION) {
    issue(
      issues,
      "schema",
      "CTP_SCHEMA_VERSION",
      "schemaVersion",
      `Expected schemaVersion ${CONTRACT_VERSION}.`,
    );
  }
  if (!isRecord(manifest.project)) {
    issue(issues, "schema", "CTP_PROJECT", "project", "project must be an object.");
  } else {
    if (!/^[a-z0-9][a-z0-9-]{1,62}$/u.test(String(manifest.project.id || ""))) {
      issue(
        issues,
        "schema",
        "CTP_PROJECT_ID",
        "project.id",
        "project.id must be a lowercase kebab-case identifier.",
      );
    }
    if (!nonEmpty(manifest.project.name)) {
      issue(issues, "schema", "CTP_PROJECT_NAME", "project.name", "project.name is required.");
    }
    if (!["draft", "public"].includes(manifest.project.publicationIntent)) {
      issue(
        issues,
        "schema",
        "CTP_PUBLICATION_INTENT",
        "project.publicationIntent",
        "publicationIntent must be draft or public.",
      );
    }
  }

  if (!isRecord(manifest.aiDraft)) {
    issue(
      issues,
      "schema",
      "CTP_AI_PROVENANCE",
      "aiDraft",
      "aiDraft must separate semantic authorship from deterministic validation.",
    );
  } else {
    if (typeof manifest.aiDraft.liveAiClaimed !== "boolean") {
      issue(
        issues,
        "schema",
        "CTP_AI_LIVE_CLAIM",
        "aiDraft.liveAiClaimed",
        "liveAiClaimed must explicitly be true or false.",
      );
    }
    if (!nonEmpty(manifest.aiDraft.mode) || !nonEmpty(manifest.aiDraft.semanticRole) || !nonEmpty(manifest.aiDraft.deterministicRole)) {
      issue(
        issues,
        "schema",
        "CTP_AI_ROLES",
        "aiDraft",
        "Record mode, semanticRole, and deterministicRole.",
      );
    }
    if (!nonEmpty(manifest.aiDraft.promptSource) || path.isAbsolute(String(manifest.aiDraft.promptSource))) {
      issue(
        issues,
        "schema",
        "CTP_AI_PROMPT_SOURCE",
        "aiDraft.promptSource",
        "promptSource must be a relative repository path.",
      );
    } else {
      const gitForPrompt = repositoryState(manifestPath);
      const promptPath = gitForPrompt.available
        ? path.resolve(gitForPrompt.root, manifest.aiDraft.promptSource)
        : null;
      const insideRoot = promptPath &&
        (promptPath === gitForPrompt.root || promptPath.startsWith(`${gitForPrompt.root}${path.sep}`));
      const promptInfo = insideRoot ? await stat(promptPath).catch(() => null) : null;
      if (!promptInfo?.isFile()) {
        issue(
          issues,
          "schema",
          "CTP_AI_PROMPT_MISSING",
          "aiDraft.promptSource",
          `Prompt provenance file does not exist: ${manifest.aiDraft.promptSource}`,
        );
      }
    }
  }

  const sources = Array.isArray(manifest.sources) ? manifest.sources : [];
  if (!Array.isArray(manifest.sources) || sources.length === 0) {
    issue(issues, "sources", "CTP_SOURCES", "sources", "At least one source record is required.");
  }
  const sourceMap = new Map();
  const git = repositoryState(manifestPath);
  for (const [index, source] of sources.entries()) {
    const location = `sources[${index}]`;
    if (!isRecord(source)) {
      issue(issues, "sources", "CTP_SOURCE_RECORD", location, "Source must be an object.");
      continue;
    }
    if (!/^[a-z][a-z0-9_-]*$/u.test(String(source.id || ""))) {
      issue(issues, "sources", "CTP_SOURCE_ID", `${location}.id`, "Source id is invalid.");
    } else if (sourceMap.has(source.id)) {
      issue(issues, "sources", "CTP_SOURCE_DUPLICATE", `${location}.id`, `Duplicate source id ${source.id}.`);
    } else {
      sourceMap.set(source.id, source);
    }
    if (!nonEmpty(source.title)) {
      issue(issues, "sources", "CTP_SOURCE_TITLE", `${location}.title`, "Source title is required.");
    }
    if (!parseDateOnly(source.checkedAt)) {
      issue(
        issues,
        "sources",
        "CTP_SOURCE_DATE",
        `${location}.checkedAt`,
        "checkedAt must be a real YYYY-MM-DD date.",
      );
    }
    if (source.kind === "url") {
      try {
        const parsed = new URL(source.url);
        if (parsed.protocol !== "https:") throw new Error("not HTTPS");
      } catch {
        issue(
          issues,
          "sources",
          "CTP_SOURCE_URL",
          `${location}.url`,
          "URL sources must use a valid https:// URL.",
        );
      }
    } else if (source.kind === "repository") {
      if (!nonEmpty(source.repoPath) || path.isAbsolute(String(source.repoPath))) {
        issue(
          issues,
          "sources",
          "CTP_SOURCE_REPO_PATH",
          `${location}.repoPath`,
          "Repository sources need a relative repoPath.",
        );
      } else if (!git.available) {
        issue(
          issues,
          "sources",
          "CTP_SOURCE_REPO_MISSING",
          `${location}.repoPath`,
          "Cannot verify a repository source outside a Git worktree.",
        );
      } else {
        const sourcePath = path.resolve(git.root, source.repoPath);
        const insideRoot = sourcePath === git.root || sourcePath.startsWith(`${git.root}${path.sep}`);
        const sourceInfo = insideRoot ? await stat(sourcePath).catch(() => null) : null;
        if (!insideRoot || !sourceInfo?.isFile()) {
          issue(
            issues,
            "sources",
            "CTP_SOURCE_REPO_MISSING",
            `${location}.repoPath`,
            `Repository source does not resolve to a file: ${source.repoPath}`,
          );
        }
      }
    } else if (source.kind === "user-provided") {
      if (!nonEmpty(source.providedBy)) {
        issue(
          issues,
          "sources",
          "CTP_SOURCE_PROVIDER",
          `${location}.providedBy`,
          "User-provided sources need providedBy.",
        );
      }
    } else {
      issue(
        issues,
        "sources",
        "CTP_SOURCE_KIND",
        `${location}.kind`,
        "Source kind must be url, repository, or user-provided.",
      );
    }
  }

  const claims = Array.isArray(manifest.claims) ? manifest.claims : [];
  if (!Array.isArray(manifest.claims) || claims.length === 0) {
    issue(issues, "claim-ledger", "CTP_CLAIMS", "claims", "Claim ledger cannot be empty.");
  }
  const claimMap = new Map();
  const seenTypes = new Set();
  for (const [index, claim] of claims.entries()) {
    const location = `claims[${index}]`;
    if (!isRecord(claim)) {
      issue(issues, "claim-ledger", "CTP_CLAIM_RECORD", location, "Claim must be an object.");
      continue;
    }
    if (!/^[a-z][a-z0-9_-]*$/u.test(String(claim.id || ""))) {
      issue(issues, "claim-ledger", "CTP_CLAIM_ID", `${location}.id`, "Claim id is invalid.");
    } else if (claimMap.has(claim.id)) {
      issue(issues, "claim-ledger", "CTP_CLAIM_DUPLICATE", `${location}.id`, `Duplicate claim id ${claim.id}.`);
    } else {
      claimMap.set(claim.id, claim);
    }
    if (!Object.hasOwn(CLAIM_STATUSES, claim.type)) {
      issue(
        issues,
        "claim-ledger",
        "CTP_CLAIM_TYPE",
        `${location}.type`,
        "Claim type must be fact, judgment, or unknown.",
      );
    } else {
      seenTypes.add(claim.type);
      if (!CLAIM_STATUSES[claim.type].has(claim.status)) {
        issue(
          issues,
          "claim-ledger",
          "CTP_CLAIM_STATUS",
          `${location}.status`,
          `${claim.type} cannot use status ${claim.status || "missing"}.`,
        );
      }
    }
    if (!nonEmpty(claim.text)) {
      issue(issues, "claim-ledger", "CTP_CLAIM_TEXT", `${location}.text`, "Claim text is required.");
    }
    if (typeof claim.coverAllowed !== "boolean") {
      issue(
        issues,
        "claim-ledger",
        "CTP_CLAIM_COVER_FLAG",
        `${location}.coverAllowed`,
        "coverAllowed must be true or false.",
      );
    }
    if (claim.type === "unknown" && claim.coverAllowed !== false) {
      issue(
        issues,
        "claim-ledger",
        "CTP_UNKNOWN_ON_COVER",
        `${location}.coverAllowed`,
        "Unknown claims must be blocked from cover copy.",
      );
    }
    const sourceIds = Array.isArray(claim.sourceIds) ? claim.sourceIds : [];
    if (claim.type === "fact" && claim.status === "verified" && sourceIds.length === 0) {
      issue(
        issues,
        "claim-ledger",
        "CTP_FACT_WITHOUT_SOURCE",
        `${location}.sourceIds`,
        "Verified facts need at least one source.",
      );
    }
    for (const sourceId of sourceIds) {
      if (!sourceMap.has(sourceId)) {
        issue(
          issues,
          "claim-ledger",
          "CTP_CLAIM_SOURCE_UNKNOWN",
          `${location}.sourceIds`,
          `Claim references unknown source ${sourceId}.`,
        );
      }
    }
    const titleTokens = Array.isArray(claim.titleTokens) ? claim.titleTokens : [];
    if (claim.type !== "fact" && titleTokens.length > 0) {
      issue(
        issues,
        "title-truth",
        "CTP_TOKEN_NOT_FACT",
        `${location}.titleTokens`,
        "Only fact claims may certify numeric or absolute title tokens.",
      );
    }
    for (const token of titleTokens) {
      if (!nonEmpty(token) || !normalizedText(claim.text).includes(normalizedText(token))) {
        issue(
          issues,
          "title-truth",
          "CTP_TOKEN_NOT_IN_CLAIM",
          `${location}.titleTokens`,
          `Certified title token must occur in the claim text: ${token}`,
        );
      }
    }
  }
  for (const requiredType of Object.keys(CLAIM_STATUSES)) {
    if (!seenTypes.has(requiredType)) {
      issue(
        issues,
        "claim-ledger",
        "CTP_CLAIM_TYPE_MISSING",
        "claims",
        `Ledger must contain at least one ${requiredType} row, even when it records an excluded unknown.`,
      );
    }
  }

  const platforms = isRecord(manifest.platforms) ? manifest.platforms : {};
  if (!isRecord(manifest.platforms)) {
    issue(
      issues,
      "independent-briefs",
      "CTP_PLATFORMS",
      "platforms",
      "platforms must contain three independent briefs.",
    );
  }
  const titles = [];
  const layouts = [];
  for (const [surfaceKey, spec] of Object.entries(SURFACES)) {
    const brief = platforms[surfaceKey];
    const location = `platforms.${surfaceKey}`;
    if (!isRecord(brief)) {
      issue(
        issues,
        "independent-briefs",
        "CTP_BRIEF_MISSING",
        location,
        `Missing ${spec.ratio} brief.`,
      );
      continue;
    }
    if (brief.surface !== spec.ratio) {
      issue(
        issues,
        "independent-briefs",
        "CTP_BRIEF_SURFACE",
        `${location}.surface`,
        `Expected surface ${spec.ratio}.`,
      );
    }
    if (brief.authorship !== "ai-draft") {
      issue(
        issues,
        "independent-briefs",
        "CTP_BRIEF_AUTHORSHIP",
        `${location}.authorship`,
        "Brief authorship must be recorded as ai-draft before human sign-off.",
      );
    }
    if (!nonEmpty(brief.title)) {
      issue(issues, "independent-briefs", "CTP_TITLE", `${location}.title`, "Title is required.");
    } else {
      titles.push({ key: surfaceKey, value: normalizedText(brief.title) });
      const count = graphemeCount(brief.title);
      if (count > spec.maxTitleChars) {
        issue(
          issues,
          "safe-areas",
          "CTP_TITLE_LENGTH",
          `${location}.title`,
          `${spec.ratio} title uses ${count} characters; static safe limit is ${spec.maxTitleChars}.`,
        );
      }
    }
    if (!Array.isArray(brief.titleLines) || brief.titleLines.length < 1 || brief.titleLines.length > spec.maxTitleLines) {
      issue(
        issues,
        "safe-areas",
        "CTP_TITLE_LINES",
        `${location}.titleLines`,
        `Provide 1-${spec.maxTitleLines} intentional title lines for ${spec.ratio}.`,
      );
    } else {
      if (brief.titleLines.some((line) => !nonEmpty(line))) {
        issue(
          issues,
          "safe-areas",
          "CTP_TITLE_LINE_EMPTY",
          `${location}.titleLines`,
          "Title lines cannot be empty.",
        );
      }
      if (normalizedText(brief.titleLines.join("")) !== normalizedText(brief.title)) {
        issue(
          issues,
          "safe-areas",
          "CTP_TITLE_LINE_MISMATCH",
          `${location}.titleLines`,
          "titleLines must reproduce the title without adding or dropping words.",
        );
      }
    }
    if (!nonEmpty(brief.promise) || graphemeCount(brief.promise) > spec.maxPromiseChars) {
      issue(
        issues,
        "safe-areas",
        "CTP_PROMISE_LENGTH",
        `${location}.promise`,
        `Promise is required and must fit within ${spec.maxPromiseChars} characters for ${spec.ratio}.`,
      );
    }
    if (!nonEmpty(brief.layoutIntent)) {
      issue(
        issues,
        "independent-briefs",
        "CTP_LAYOUT_INTENT",
        `${location}.layoutIntent`,
        "A platform-specific layoutIntent is required.",
      );
    } else {
      layouts.push({ key: surfaceKey, value: normalizedText(brief.layoutIntent) });
    }
    if (!nonEmpty(brief.evidence)) {
      issue(
        issues,
        "independent-briefs",
        "CTP_BRIEF_EVIDENCE",
        `${location}.evidence`,
        "Describe the evidence module for this surface.",
      );
    }
    if (!/^#[0-9a-f]{6}$/iu.test(String(brief.accent || ""))) {
      issue(
        issues,
        "independent-briefs",
        "CTP_ACCENT",
        `${location}.accent`,
        "accent must be a six-digit hex color.",
      );
    }
    const headlineClaimIds = Array.isArray(brief.headlineClaimIds) ? brief.headlineClaimIds : [];
    if (headlineClaimIds.length === 0) {
      issue(
        issues,
        "title-truth",
        "CTP_TITLE_CLAIMS",
        `${location}.headlineClaimIds`,
        "Every title must name at least one ledger row that supports its promise.",
      );
    }
    const headlineClaims = [];
    for (const claimId of headlineClaimIds) {
      const claim = claimMap.get(claimId);
      if (!claim) {
        issue(
          issues,
          "title-truth",
          "CTP_TITLE_CLAIM_UNKNOWN",
          `${location}.headlineClaimIds`,
          `Title references unknown claim ${claimId}.`,
        );
        continue;
      }
      headlineClaims.push(claim);
      if (claim.type === "unknown" || claim.coverAllowed !== true) {
        issue(
          issues,
          "title-truth",
          "CTP_TITLE_UNVERIFIED",
          `${location}.headlineClaimIds`,
          `Title is backed by blocked or unknown claim ${claimId}.`,
        );
      }
      if (claim.type === "fact" && claim.status !== "verified") {
        issue(
          issues,
          "title-truth",
          "CTP_TITLE_FACT_PENDING",
          `${location}.headlineClaimIds`,
          `Fact claim ${claimId} is not verified.`,
        );
      }
    }
    const riskTokens = extractRiskTokens(brief.title);
    if (riskTokens.length) {
      const certifiedTokens = headlineClaims
        .filter((claim) => claim.type === "fact" && claim.status === "verified" && claim.coverAllowed === true)
        .flatMap((claim) => (Array.isArray(claim.titleTokens) ? claim.titleTokens : []));
      for (const riskToken of riskTokens) {
        const normalizedRisk = normalizedText(riskToken);
        const certified = certifiedTokens.some((token) => {
          const normalizedCertified = normalizedText(token);
          return normalizedCertified === normalizedRisk || normalizedCertified.includes(normalizedRisk);
        });
        if (!certified) {
          issue(
            issues,
            "title-truth",
            "CTP_TITLE_PROMISE_UNVERIFIED",
            `${location}.title`,
            `Numeric or absolute title token lacks a verified fact token: ${riskToken}`,
          );
        }
      }
    }
  }

  const duplicateTitleValues = titles.filter(
    (item, index) => titles.findIndex((candidate) => candidate.value === item.value) !== index,
  );
  if (duplicateTitleValues.length) {
    issue(
      issues,
      "independent-briefs",
      "CTP_TITLE_REUSED",
      "platforms",
      `Platform titles must be independently authored; duplicate: ${duplicateTitleValues[0].key}.`,
    );
  }
  const duplicateLayoutValues = layouts.filter(
    (item, index) => layouts.findIndex((candidate) => candidate.value === item.value) !== index,
  );
  if (duplicateLayoutValues.length) {
    issue(
      issues,
      "independent-briefs",
      "CTP_LAYOUT_REUSED",
      "platforms",
      `Platform layout intents must be independent; duplicate: ${duplicateLayoutValues[0].key}.`,
    );
  }

  const assets = Array.isArray(manifest.assets) ? manifest.assets : [];
  if (!Array.isArray(manifest.assets) || assets.length === 0) {
    issue(
      issues,
      "asset-rights",
      "CTP_ASSETS",
      "assets",
      "Record generated, owned, licensed, public-domain, or trademark assets.",
    );
  }
  const assetIds = new Set();
  for (const [index, asset] of assets.entries()) {
    const location = `assets[${index}]`;
    if (!isRecord(asset)) {
      issue(issues, "asset-rights", "CTP_ASSET_RECORD", location, "Asset must be an object.");
      continue;
    }
    if (!/^[a-z][a-z0-9_-]*$/u.test(String(asset.id || "")) || assetIds.has(asset.id)) {
      issue(
        issues,
        "asset-rights",
        "CTP_ASSET_ID",
        `${location}.id`,
        "Asset id must be unique lowercase snake/kebab case.",
      );
    } else {
      assetIds.add(asset.id);
    }
    if (!nonEmpty(asset.path) || !nonEmpty(asset.owner)) {
      issue(
        issues,
        "asset-rights",
        "CTP_ASSET_IDENTITY",
        location,
        "Asset path and owner are required.",
      );
    }
    if (!RIGHTS_STATUSES.has(asset.rightsStatus)) {
      issue(
        issues,
        "asset-rights",
        "CTP_ASSET_RIGHTS_STATUS",
        `${location}.rightsStatus`,
        "Unknown rights status.",
      );
    }
    if (manifest.project?.publicationIntent === "public" && asset.rightsStatus === "unverified") {
      issue(
        issues,
        "asset-rights",
        "CTP_PUBLIC_ASSET_UNVERIFIED",
        `${location}.rightsStatus`,
        "Unverified assets cannot enter a public cover.",
      );
    }
    if (["licensed", "public-domain", "trademark-context-only"].includes(asset.rightsStatus)) {
      const assetSourceIds = Array.isArray(asset.sourceIds) ? asset.sourceIds : [];
      if (assetSourceIds.length === 0 || assetSourceIds.some((id) => !sourceMap.has(id))) {
        issue(
          issues,
          "asset-rights",
          "CTP_ASSET_SOURCE",
          `${location}.sourceIds`,
          `${asset.rightsStatus} assets need valid source records.`,
        );
      }
    }
    if (!nonEmpty(asset.licenseOrBoundary)) {
      issue(
        issues,
        "asset-rights",
        "CTP_ASSET_BOUNDARY",
        `${location}.licenseOrBoundary`,
        "Record the license or reuse boundary.",
      );
    }
  }

  const signoff = manifest.humanSignoff;
  if (!isRecord(signoff) || !["pending", "approved"].includes(signoff.status)) {
    issue(
      issues,
      "human-signoff",
      "CTP_SIGNOFF_STATUS",
      "humanSignoff.status",
      "humanSignoff.status must be pending or approved.",
    );
  } else if (signoff.status === "approved") {
    if (!nonEmpty(signoff.reviewer) || !nonEmpty(signoff.note)) {
      issue(
        issues,
        "human-signoff",
        "CTP_SIGNOFF_IDENTITY",
        "humanSignoff",
        "Approved sign-off requires reviewer and note.",
      );
    }
    if (!parseIsoDateTime(signoff.reviewedAt)) {
      issue(
        issues,
        "human-signoff",
        "CTP_SIGNOFF_DATE",
        "humanSignoff.reviewedAt",
        "Approved sign-off requires a valid ISO-8601 time.",
      );
    }
    if (signoff.confirmation !== SIGNOFF_CONFIRMATION) {
      issue(
        issues,
        "human-signoff",
        "CTP_SIGNOFF_CONFIRMATION",
        "humanSignoff.confirmation",
        `Confirmation must be ${SIGNOFF_CONFIRMATION}.`,
      );
    }
    const expectedPayloadSha256 = approvalPayloadSha256(manifest);
    if (!/^[a-f0-9]{64}$/u.test(String(signoff.approvedPayloadSha256 || ""))) {
      issue(
        issues,
        "human-signoff",
        "CTP_SIGNOFF_PAYLOAD_MISSING",
        "humanSignoff.approvedPayloadSha256",
        "Approved sign-off must record the reviewed payload SHA-256.",
      );
    } else if (signoff.approvedPayloadSha256 !== expectedPayloadSha256) {
      issue(
        issues,
        "human-signoff",
        "CTP_SIGNOFF_PAYLOAD_CHANGED",
        "humanSignoff.approvedPayloadSha256",
        "The manifest changed after human review; return it to pending and review again.",
      );
    }
  }

  const gates = gateNames.map((name) => ({
    name,
    pass: !issues.some((item) => item.gate === name),
  }));
  return { issues, gates };
}

function contractStatus(manifest, validation) {
  if (validation.issues.length) return "BLOCKED";
  return manifest.humanSignoff?.status === "approved"
    ? "HUMAN SIGNED OFF"
    : "PENDING HUMAN SIGN-OFF";
}

function publishReady(manifest, validation) {
  return validation.issues.length === 0 && manifest.humanSignoff?.status === "approved";
}

function validationOutput(manifest, validation, repository) {
  const passed = validation.gates.filter((gate) => gate.pass).length;
  const lines = [
    `CONTRACT: ${CONTRACT_NAME} v${CONTRACT_VERSION}`,
    `GATES: ${validation.issues.length ? "FAIL" : "PASS"} (${passed}/${validation.gates.length})`,
    ...validation.gates.map((gate) => `- ${gate.pass ? "PASS" : "FAIL"} ${gate.name}`),
  ];
  for (const item of validation.issues) {
    lines.push(`ERROR ${item.code} ${item.location}: ${item.message}`);
  }
  lines.push(`STATUS: ${contractStatus(manifest, validation)}`);
  lines.push(`PUBLISH READY: ${publishReady(manifest, validation) ? "YES" : "NO"}`);
  if (repository.available) {
    lines.push(
      `REPOSITORY: ${repository.shortCommit} ${repository.dirty ? `DIRTY (${repository.changeCount})` : "CLEAN"}`,
    );
  } else {
    lines.push("REPOSITORY: NOT AVAILABLE");
  }
  return `${lines.join("\n")}\n`;
}

function formatSourceLocator(source) {
  if (source.kind === "url") return source.url;
  if (source.kind === "repository") return `repo://${source.repoPath}`;
  return `user-provided:${source.providedBy}`;
}

function factsMarkdown(manifest) {
  const lines = [
    "# Claim Ledger",
    "",
    "> Generated by Claim2Cover. `unknown` rows remain visible here precisely because they are blocked from cover copy.",
    "",
    "| ID | Type | Status | Cover allowed | Claim | Sources |",
    "|---|---|---|---|---|---|",
  ];
  for (const claim of manifest.claims) {
    lines.push(
      `| ${markdownCell(claim.id)} | ${markdownCell(claim.type)} | ${markdownCell(claim.status)} | ` +
        `${claim.coverAllowed ? "yes" : "no"} | ${markdownCell(claim.text)} | ` +
        `${markdownCell((claim.sourceIds || []).join(", ") || "—")} |`,
    );
  }
  lines.push("");
  return lines.join("\n");
}

function sourcesMarkdown(manifest) {
  const lines = ["# Sources", ""];
  for (const source of manifest.sources) {
    lines.push(
      `- **${markdownCell(source.id)} — ${markdownCell(source.title)}**`,
      `  ${formatSourceLocator(source)}`,
      `  Checked: ${source.checkedAt}${source.note ? ` · ${source.note}` : ""}`,
    );
  }
  lines.push("");
  return lines.join("\n");
}

function assetRightsCsv(manifest) {
  const rows = [
    ["id", "path", "owner", "rights_status", "license_or_boundary", "source_ids"],
    ...manifest.assets.map((asset) => [
      asset.id,
      asset.path,
      asset.owner,
      asset.rightsStatus,
      asset.licenseOrBoundary,
      (asset.sourceIds || []).join(";"),
    ]),
  ];
  return `${rows.map((row) => row.map(csvCell).join(",")).join("\n")}\n`;
}

function claimLabel(type) {
  return { fact: "FACT", judgment: "JUDGMENT", unknown: "UNKNOWN" }[type] || type;
}

function claimCards(manifest, limit = 3) {
  return manifest.claims
    .slice(0, limit)
    .map(
      (claim) => `
        <div class="claim claim-${escapeHtml(claim.type)}">
          <div class="claim-meta"><span>${claimLabel(claim.type)}</span><b>${escapeHtml(claim.status)}</b></div>
          <p>${escapeHtml(claim.text)}</p>
        </div>`,
    )
    .join("");
}

function titleLines(brief) {
  return brief.titleLines
    .map((line) => `<span class="title-line">${escapeHtml(line)}</span>`)
    .join("");
}

function coverHtml(manifest, manifestHash) {
  const xhs = manifest.platforms.xiaohongshu;
  const wide = manifest.platforms.wechatWide;
  const square = manifest.platforms.wechatSquare;
  const signed = manifest.humanSignoff.status === "approved";
  const status = signed ? "HUMAN SIGNED OFF" : "PENDING HUMAN SIGN-OFF";
  const verifiedCount = manifest.claims.filter(
    (claim) => claim.type === "fact" && claim.status === "verified",
  ).length;
  const unknownCount = manifest.claims.filter((claim) => claim.type === "unknown").length;

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(manifest.project.name)} — Claim2Cover</title>
  <style>
    :root { --ink:#111111; --paper:#f2efe6; --muted:#6d6a62; --line:#181818; }
    * { box-sizing:border-box; }
    html, body { margin:0; padding:0; background:#d8d5cd; }
    body { display:flex; flex-direction:column; align-items:flex-start; gap:48px; padding:0; font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Noto Sans CJK SC","Microsoft YaHei",sans-serif; }
    .artboard { position:relative; flex:none; overflow:hidden; color:var(--ink); background:
      linear-gradient(rgba(17,17,17,.045) 1px, transparent 1px),
      linear-gradient(90deg, rgba(17,17,17,.045) 1px, transparent 1px), var(--paper);
      background-size:36px 36px; }
    .topline { display:flex; align-items:center; justify-content:space-between; border-bottom:4px solid var(--line); padding-bottom:18px; font-size:24px; font-weight:800; letter-spacing:.08em; }
    .brand { display:flex; align-items:center; gap:14px; }
    .brand-dot { width:22px; height:22px; border-radius:50%; background:var(--accent); border:3px solid var(--ink); }
    .surface { color:var(--muted); }
    .title-safe { font-weight:950; letter-spacing:-.07em; display:flex; flex-direction:column; justify-content:center; }
    .title-line { display:block; white-space:nowrap; }
    .promise-safe { display:flex; align-items:center; font-weight:800; }
    .promise-safe::before { content:""; width:16px; align-self:stretch; margin-right:20px; background:var(--accent); }
    .claim { background:rgba(255,255,255,.78); border:3px solid var(--ink); box-shadow:10px 10px 0 var(--ink); }
    .claim-meta { display:flex; justify-content:space-between; gap:20px; border-bottom:2px solid var(--ink); padding:12px 16px; font-size:18px; font-weight:900; letter-spacing:.08em; }
    .claim-meta b { color:var(--muted); }
    .claim p { margin:0; font-weight:760; }
    .claim-unknown { opacity:.52; box-shadow:10px 10px 0 #9b9890; }
    .status { font-weight:900; letter-spacing:.06em; color:${signed ? "#166534" : "#9a3412"}; }
    .hash { font-family:ui-monospace,SFMono-Regular,Menlo,monospace; color:var(--muted); }

    .xhs { --accent:${escapeHtml(xhs.accent)}; width:1080px; height:1440px; padding:72px 76px 64px; }
    .xhs .title-safe { width:928px; height:330px; margin-top:50px; font-size:112px; line-height:.96; }
    .xhs .promise-safe { width:928px; height:110px; margin-top:12px; font-size:34px; line-height:1.28; }
    .xhs .ledger-title { display:flex; justify-content:space-between; align-items:end; margin-top:54px; padding-bottom:16px; border-bottom:4px solid var(--ink); }
    .xhs .ledger-title h2 { margin:0; font-size:42px; letter-spacing:-.04em; }
    .xhs .ledger-title span { font-size:22px; font-weight:800; }
    .xhs .claims { display:grid; grid-template-columns:repeat(3,1fr); gap:22px; margin-top:26px; }
    .xhs .claim { min-height:284px; }
    .xhs .claim p { padding:22px 18px; font-size:27px; line-height:1.36; }
    .xhs .footer { position:absolute; left:76px; right:76px; bottom:58px; display:flex; justify-content:space-between; font-size:19px; }

    .wide { --accent:${escapeHtml(wide.accent)}; width:2100px; height:900px; padding:54px 70px 48px; }
    .wide .content { display:grid; grid-template-columns:820px 1fr; gap:64px; margin-top:34px; }
    .wide .title-safe { width:820px; height:240px; font-size:94px; line-height:.96; }
    .wide .promise-safe { width:800px; height:92px; margin-top:18px; font-size:31px; line-height:1.25; }
    .wide .left-note { margin-top:32px; display:flex; gap:16px; font-size:24px; font-weight:900; }
    .wide .left-note span { padding:12px 18px; border:3px solid var(--ink); background:var(--accent); }
    .wide .evidence-panel { border:4px solid var(--ink); padding:26px 28px; background:rgba(255,255,255,.48); }
    .wide .evidence-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; font-size:24px; font-weight:900; }
    .wide .claims { display:grid; grid-template-columns:repeat(3,1fr); gap:18px; }
    .wide .claim { min-height:310px; box-shadow:7px 7px 0 var(--ink); }
    .wide .claim p { padding:18px 15px; font-size:25px; line-height:1.3; }
    .wide .footer { position:absolute; left:70px; right:70px; bottom:38px; display:flex; justify-content:space-between; font-size:18px; }

    .square { --accent:${escapeHtml(square.accent)}; width:1080px; height:1080px; padding:68px 72px 58px; }
    .square .title-safe { width:936px; height:300px; margin-top:56px; font-size:138px; line-height:.9; text-align:center; align-items:center; }
    .square .promise-safe { width:820px; height:90px; margin:16px auto 0; justify-content:center; text-align:center; font-size:36px; }
    .square .seal { width:620px; height:214px; margin:48px auto 0; display:grid; grid-template-columns:repeat(3,1fr); border:4px solid var(--ink); background:rgba(255,255,255,.62); box-shadow:14px 14px 0 var(--ink); }
    .square .seal-cell { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px; border-right:3px solid var(--ink); }
    .square .seal-cell:last-child { border-right:0; }
    .square .seal-cell b { font-size:25px; }
    .square .seal-cell span { font-size:42px; font-weight:950; }
    .square .footer { position:absolute; left:72px; right:72px; bottom:52px; text-align:center; font-size:18px; }
  </style>
</head>
<body>
  <section id="claim2cover-xiaohongshu" class="artboard xhs" data-export data-route="claim2cover" data-file="${SURFACES.xiaohongshu.outputFile}" data-width="1080" data-height="1440">
    <div class="topline"><div class="brand"><i class="brand-dot"></i> CLAIM2COVER / 封面证据链</div><div class="surface">XIAOHONGSHU · 3:4</div></div>
    <h1 class="title-safe" data-text-safe="xiaohongshu-title">${titleLines(xhs)}</h1>
    <div class="promise-safe" data-text-safe="xiaohongshu-promise">${escapeHtml(xhs.promise)}</div>
    <div class="ledger-title"><h2>CLAIM LEDGER</h2><span>FACT / JUDGMENT / UNKNOWN</span></div>
    <div class="claims">${claimCards(manifest)}</div>
    <div class="footer"><span class="status">${status}</span><span class="hash">manifest ${manifestHash.slice(0, 12)}</span></div>
  </section>

  <section id="claim2cover-wechat-wide" class="artboard wide" data-export data-route="claim2cover" data-file="${SURFACES.wechatWide.outputFile}" data-width="2100" data-height="900">
    <div class="topline"><div class="brand"><i class="brand-dot"></i> CLAIM2COVER / 封面证据链</div><div class="surface">WECHAT · 21:9</div></div>
    <div class="content">
      <div>
        <h1 class="title-safe" data-text-safe="wechat-wide-title">${titleLines(wide)}</h1>
        <div class="promise-safe" data-text-safe="wechat-wide-promise">${escapeHtml(wide.promise)}</div>
        <div class="left-note"><span>${verifiedCount} VERIFIED FACT</span><span>${unknownCount} BLOCKED UNKNOWN</span></div>
      </div>
      <div class="evidence-panel">
        <div class="evidence-head"><span>${escapeHtml(wide.evidence)}</span><span>AI DRAFT → HUMAN GATE</span></div>
        <div class="claims">${claimCards(manifest)}</div>
      </div>
    </div>
    <div class="footer"><span class="status">${status}</span><span class="hash">manifest ${manifestHash.slice(0, 12)}</span></div>
  </section>

  <section id="claim2cover-wechat-square" class="artboard square" data-export data-route="claim2cover" data-file="${SURFACES.wechatSquare.outputFile}" data-width="1080" data-height="1080">
    <div class="topline"><div class="brand"><i class="brand-dot"></i> CLAIM2COVER</div><div class="surface">WECHAT · 1:1</div></div>
    <h1 class="title-safe" data-text-safe="wechat-square-title">${titleLines(square)}</h1>
    <div class="promise-safe" data-text-safe="wechat-square-promise">${escapeHtml(square.promise)}</div>
    <div class="seal">
      <div class="seal-cell"><b>FACT</b><span>${manifest.claims.filter((claim) => claim.type === "fact").length}</span></div>
      <div class="seal-cell"><b>JUDGMENT</b><span>${manifest.claims.filter((claim) => claim.type === "judgment").length}</span></div>
      <div class="seal-cell"><b>UNKNOWN</b><span>${unknownCount}</span></div>
    </div>
    <div class="footer"><div class="status">${status}</div><div class="hash">manifest ${manifestHash.slice(0, 12)} · independent square brief</div></div>
  </section>
</body>
</html>
`;
}

function briefArtifact(key, manifest) {
  const spec = SURFACES[key];
  const brief = manifest.platforms[key];
  return {
    schemaVersion: CONTRACT_VERSION,
    platform: key,
    surface: spec.ratio,
    dimensions: { width: spec.width, height: spec.height },
    safeLimits: {
      maxTitleChars: spec.maxTitleChars,
      maxTitleLines: spec.maxTitleLines,
      maxPromiseChars: spec.maxPromiseChars,
      runtimeOverflowCheck: "data-text-safe",
    },
    ...brief,
  };
}

function statusMarkdown(manifest, validation, repository, manifestHash) {
  const lines = [
    "# Claim2Cover Build Status",
    "",
    `- Contract: ${CONTRACT_NAME} v${CONTRACT_VERSION}`,
    `- Gates: ${validation.issues.length ? "FAIL" : "PASS"}`,
    `- Status: **${contractStatus(manifest, validation)}**`,
    `- Publish ready: **${publishReady(manifest, validation) ? "YES" : "NO"}**`,
    `- Manifest SHA-256: \`${manifestHash}\``,
    repository.available
      ? `- Source commit: \`${repository.commit}\` (${repository.dirty ? `dirty, ${repository.changeCount} change(s)` : "clean"})`
      : "- Source commit: not available",
    "",
    "## Gates",
    "",
    ...validation.gates.map((gate) => `- [${gate.pass ? "x" : " "}] ${gate.name}`),
    "",
  ];
  if (manifest.humanSignoff.status !== "approved") {
    lines.push(
      "## Required human action",
      "",
      "Review the fact ledger, source locators, asset-rights CSV, editable HTML, and all three rendered PNGs. Then run the explicit signoff command documented in the repository. Do not publish while this file says `PENDING HUMAN SIGN-OFF`.",
      "",
    );
  }
  return lines.join("\n");
}

function runRenderer(htmlPath, outputDir) {
  const result = spawnSync(
    process.execPath,
    [path.join(scriptDir, "render-covers.mjs"), htmlPath, outputDir],
    {
      cwd: skillRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
    },
  );
  const transcript = `${result.stdout || ""}${result.stderr || ""}`;
  if (result.error) fail("CTP_RENDER_START", `Renderer could not start: ${result.error.message}`);
  if (result.status !== 0) {
    fail("CTP_RENDER_FAILED", `Renderer rejected the build.\n${transcript.trim()}`);
  }
  return transcript;
}

async function assertOutputDirAvailable(outputDir) {
  const resolved = path.resolve(outputDir);
  if (resolved === path.parse(resolved).root) fail("CTP_OUTPUT_ROOT", "Refusing a filesystem root output.");
  try {
    await access(resolved);
    fail("CTP_OUTPUT_EXISTS", `Output directory already exists; nothing was overwritten: ${resolved}`);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  return resolved;
}

async function buildArtifacts(manifestPath, raw, manifest, validation, repository, outputArg, noRender) {
  if (validation.issues.length) {
    fail("CTP_CONTRACT_FAILED", validationOutput(manifest, validation, repository).trim());
  }
  const outputDir = await assertOutputDirAvailable(outputArg);
  const briefsDir = path.join(outputDir, "briefs");
  const pngDir = path.join(outputDir, "png");
  await mkdir(briefsDir, { recursive: true });

  const manifestHash = sha256(raw);
  const report = {
    schemaVersion: CONTRACT_VERSION,
    contract: CONTRACT_NAME,
    manifest: {
      path: manifestPath,
      sha256: manifestHash,
    },
    aiDraft: manifest.aiDraft,
    gates: validation.gates,
    status: contractStatus(manifest, validation),
    publishReady: publishReady(manifest, validation),
    repository,
    render: {
      status: noRender ? "skipped" : "pending",
      outputs: [],
    },
  };

  const htmlPath = path.join(outputDir, "cover.html");
  await Promise.all([
    writeFile(path.join(outputDir, "claim-ledger.json"), jsonText(manifest.claims)),
    writeFile(path.join(outputDir, "FACTS.md"), factsMarkdown(manifest)),
    writeFile(path.join(outputDir, "SOURCES.md"), sourcesMarkdown(manifest)),
    writeFile(path.join(outputDir, "ASSET_RIGHTS.csv"), assetRightsCsv(manifest)),
    writeFile(htmlPath, coverHtml(manifest, manifestHash)),
    writeFile(path.join(outputDir, "STATUS.md"), statusMarkdown(manifest, validation, repository, manifestHash)),
    ...Object.keys(SURFACES).map((key) =>
      writeFile(path.join(briefsDir, `${key}.json`), jsonText(briefArtifact(key, manifest))),
    ),
  ]);

  let renderTranscript = "Rendering skipped by --no-render.\n";
  if (!noRender) {
    renderTranscript = runRenderer(htmlPath, pngDir);
    report.render.status = "passed";
    report.render.outputs = Object.entries(SURFACES).map(([platform, spec]) => ({
      platform,
      file: `png/${spec.outputFile}`,
      width: spec.width,
      height: spec.height,
    }));
  }
  await writeFile(path.join(outputDir, "CONTRACT_REPORT.json"), jsonText(report));
  await writeFile(path.join(outputDir, "RENDER.log"), renderTranscript);
  return { outputDir, report };
}

function parseOptions(args, allowedBoolean, allowedValue) {
  const positionals = [];
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (allowedBoolean.has(arg)) {
      if (options[arg]) fail("CTP_OPTION_DUPLICATE", `${arg} may be used only once.`);
      options[arg] = true;
      continue;
    }
    if (allowedValue.has(arg)) {
      if (Object.hasOwn(options, arg)) fail("CTP_OPTION_DUPLICATE", `${arg} may be used only once.`);
      const value = args[index + 1];
      if (value == null || value.startsWith("--")) fail("CTP_OPTION_VALUE", `${arg} requires a value.`);
      options[arg] = value;
      index += 1;
      continue;
    }
    if (arg.startsWith("--")) fail("CTP_OPTION_UNKNOWN", `Unknown option: ${arg}`);
    positionals.push(arg);
  }
  return { positionals, options };
}

async function validateCommand(args, releaseCheck = false) {
  const { positionals, options } = parseOptions(args, new Set(["--require-clean"]), new Set());
  if (positionals.length !== 1) fail("CTP_USAGE", usage());
  const { manifestPath, manifest } = await readManifest(positionals[0]);
  const validation = await validateContract(manifest, manifestPath);
  const repository = repositoryState(manifestPath);
  process.stdout.write(validationOutput(manifest, validation, repository));
  if (validation.issues.length) process.exitCode = 1;
  if ((options["--require-clean"] || releaseCheck) && (!repository.available || repository.dirty)) {
    process.stderr.write("ERROR CTP_REPOSITORY_CLEAN: A clean Git commit is required.\n");
    process.exitCode = 1;
  }
  if (releaseCheck && !publishReady(manifest, validation)) {
    process.stderr.write("ERROR CTP_RELEASE_SIGNOFF: Human sign-off is required before release.\n");
    process.exitCode = 1;
  }
}

async function buildCommand(args) {
  const { positionals, options } = parseOptions(
    args,
    new Set(["--no-render", "--require-clean"]),
    new Set(),
  );
  if (positionals.length !== 2) fail("CTP_USAGE", usage());
  const { manifestPath, raw, manifest } = await readManifest(positionals[0]);
  const validation = await validateContract(manifest, manifestPath);
  const repository = repositoryState(manifestPath);
  process.stdout.write(validationOutput(manifest, validation, repository));
  if (options["--require-clean"] && (!repository.available || repository.dirty)) {
    fail("CTP_REPOSITORY_CLEAN", "A clean Git commit is required by --require-clean.");
  }
  const built = await buildArtifacts(
    manifestPath,
    raw,
    manifest,
    validation,
    repository,
    positionals[1],
    Boolean(options["--no-render"]),
  );
  console.log(`BUILD: PASS ${built.outputDir}`);
  console.log(`STATUS: ${built.report.status}`);
  if (!built.report.publishReady) console.log("NEXT: Human must review facts, rights, HTML, and all PNGs before signoff.");
}

async function signoffCommand(args) {
  const { positionals, options } = parseOptions(
    args,
    new Set(),
    new Set(["--reviewer", "--note", "--confirm", "--reviewed-at"]),
  );
  if (positionals.length !== 1) fail("CTP_USAGE", usage());
  if (!nonEmpty(options["--reviewer"]) || !nonEmpty(options["--note"])) {
    fail("CTP_SIGNOFF_INPUT", "--reviewer and --note are required.");
  }
  if (options["--confirm"] !== SIGNOFF_CONFIRMATION) {
    fail("CTP_SIGNOFF_CONFIRM", `Use --confirm ${SIGNOFF_CONFIRMATION} after completing the review.`);
  }
  const reviewedAt = options["--reviewed-at"] || new Date().toISOString();
  if (!parseIsoDateTime(reviewedAt)) fail("CTP_SIGNOFF_DATE", "--reviewed-at must be ISO-8601.");

  const { manifestPath, manifest } = await readManifest(positionals[0]);
  const validation = await validateContract(manifest, manifestPath);
  const repository = repositoryState(manifestPath);
  if (validation.issues.length) {
    fail("CTP_CONTRACT_FAILED", validationOutput(manifest, validation, repository).trim());
  }
  if (manifest.humanSignoff.status === "approved") {
    fail("CTP_SIGNOFF_EXISTS", "Manifest is already signed off; refusing to replace the reviewer record.");
  }
  manifest.humanSignoff = {
    status: "approved",
    reviewer: options["--reviewer"].trim(),
    reviewedAt,
    note: options["--note"].trim(),
    confirmation: SIGNOFF_CONFIRMATION,
    approvedPayloadSha256: approvalPayloadSha256(manifest),
  };
  const tempPath = path.join(
    path.dirname(manifestPath),
    `.${path.basename(manifestPath)}.signoff-${process.pid}.tmp`,
  );
  await writeFile(tempPath, jsonText(manifest), { flag: "wx" });
  await rename(tempPath, manifestPath);
  const signedValidation = await validateContract(manifest, manifestPath);
  process.stdout.write(validationOutput(manifest, signedValidation, repositoryState(manifestPath)));
  console.log(`SIGNOFF: RECORDED for ${manifest.humanSignoff.reviewer}`);
  console.log("NEXT: Commit the sign-off and run release-check from a clean worktree.");
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h") || args.length === 0) {
    console.log(usage());
    return;
  }
  const [command, ...rest] = args;
  if (command === "validate") return validateCommand(rest, false);
  if (command === "build") return buildCommand(rest);
  if (command === "signoff") return signoffCommand(rest);
  if (command === "release-check") return validateCommand(rest, true);
  fail("CTP_COMMAND", `Unknown command: ${command}\n${usage()}`);
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
const modulePath = path.resolve(fileURLToPath(import.meta.url));
if (invokedPath === modulePath) {
  main().catch((error) => {
    console.error(`claim-to-pixel: ${error.code || "CTP_UNEXPECTED"}: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  CONTRACT_NAME,
  CONTRACT_VERSION,
  SIGNOFF_CONFIRMATION,
  SURFACES,
  approvalPayloadSha256,
  extractRiskTokens,
  validateContract,
};
