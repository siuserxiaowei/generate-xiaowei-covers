#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  cp,
  mkdtemp,
  readFile,
  rm,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import {
  SIGNOFF_CONFIRMATION,
  certifiedTokenOccursInClaim,
  extractRiskTokens,
  riskTokenCertified,
} from "./claim-to-pixel.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.dirname(scriptDir);
const fixture = path.join(root, "contest", "demo", "claim-to-pixel.json");
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function run(script, args) {
  const result = spawnSync(process.execPath, [path.join(scriptDir, script), ...args], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: process.env,
  });
  if (result.error) throw result.error;
  return { status: result.status, transcript: `${result.stdout || ""}${result.stderr || ""}` };
}

async function assertPng(filePath, width, height) {
  const data = await readFile(filePath);
  assert.ok(data.length >= 24 && data.subarray(0, 8).equals(PNG_SIGNATURE), `${filePath} is a PNG`);
  assert.equal(data.readUInt32BE(16), width, `${path.basename(filePath)} width`);
  assert.equal(data.readUInt32BE(20), height, `${path.basename(filePath)} height`);
}

async function main() {
  assert.deepEqual(extractRiskTokens("全网唯一效率提升10倍"), ["全网唯一", "唯一", "10倍"]);
  assert.equal(riskTokenCertified("110倍", "10倍"), false);
  assert.equal(riskTokenCertified("3种画幅", "3种"), true);
  assert.equal(riskTokenCertified("全网唯一", "唯一"), true);
  assert.equal(certifiedTokenOccursInClaim("效率提升 110 倍。", "10倍"), false);
  assert.equal(certifiedTokenOccursInClaim("支持 3 种画幅输出。", "3种画幅"), true);

  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "claim2cover-test-"));
  const inRepoTemp = await mkdtemp(path.join(root, ".claim2cover-signoff-test-"));
  try {
    const demoDir = path.join(tempRoot, "demo");
    const demo = run("demo-claim-to-pixel.mjs", [demoDir]);
    assert.equal(demo.status, 0, demo.transcript);
    assert.match(await readFile(path.join(demoDir, "FAIL.log"), "utf8"), /CTP_TITLE_UNVERIFIED/u);
    assert.match(await readFile(path.join(demoDir, "PASS.log"), "utf8"), /GATES: PASS \(8\/8\)/u);
    await assertPng(
      path.join(demoDir, "build", "png", "claim2cover-xiaohongshu-3x4.png"),
      1080,
      1440,
    );
    await assertPng(
      path.join(demoDir, "build", "png", "claim2cover-wechat-21x9.png"),
      2100,
      900,
    );
    await assertPng(
      path.join(demoDir, "build", "png", "claim2cover-wechat-1x1.png"),
      1080,
      1080,
    );
    await assertPng(
      path.join(demoDir, "board", "claim2cover-demo-board.png"),
      1920,
      1080,
    );
    const summary = JSON.parse(await readFile(path.join(demoDir, "RUN_SUMMARY.json"), "utf8"));
    assert.equal(summary.liveAiClaimed, false);
    assert.equal(summary.fixedBuild.status, "PENDING HUMAN SIGN-OFF");
    const publicArtifactText = (
      await Promise.all([
        "FAIL.log",
        "PASS.log",
        "DEMO.html",
        "SHOT_LIST.md",
        "RUN_SUMMARY.json",
        "BOARD_RENDER.log",
        "build/CONTRACT_REPORT.json",
        "build/RENDER.log",
      ].map((relative) => readFile(path.join(demoDir, relative), "utf8")))
    ).join("\n");
    assert.doesNotMatch(publicArtifactText, /\/Users\/|\/home\/|[A-Za-z]:\\Users\\/u);
    assert.doesNotMatch(publicArtifactText, new RegExp(demoDir.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"));
    assert.equal(summary.sourceRevision.root, ".");
    assert.equal(summary.fixedBuild.gatesPassed, true);

    const signedFixture = path.join(inRepoTemp, "signed.json");
    await cp(fixture, signedFixture);
    const signoff = run("claim-to-pixel.mjs", [
      "signoff",
      signedFixture,
      "--reviewer",
      "Automated contract test",
      "--note",
      "Test-only copy; verified signoff state transition.",
      "--confirm",
      SIGNOFF_CONFIRMATION,
      "--reviewed-at",
      "2026-08-31T00:00:00.000Z",
    ]);
    assert.equal(signoff.status, 0, signoff.transcript);
    assert.match(signoff.transcript, /STATUS: HUMAN SIGNED OFF/u);
    assert.match(signoff.transcript, /PUBLISH READY: YES/u);

    const signedManifest = JSON.parse(await readFile(signedFixture, "utf8"));
    assert.match(signedManifest.humanSignoff.approvedPayloadSha256, /^[a-f0-9]{64}$/u);
    signedManifest.aiDraft.semanticRole = "Changed after review without a new sign-off.";
    await writeFile(signedFixture, `${JSON.stringify(signedManifest, null, 2)}\n`);
    const tampered = run("claim-to-pixel.mjs", ["validate", signedFixture]);
    assert.notEqual(tampered.status, 0);
    assert.match(tampered.transcript, /CTP_SIGNOFF_PAYLOAD_CHANGED/u);

    const substringFixture = JSON.parse(await readFile(fixture, "utf8"));
    substringFixture.claims[0].text = "本流程经测试记录为 110 倍。";
    substringFixture.claims[0].titleTokens = ["110倍"];
    substringFixture.platforms.xiaohongshu.title = "效率提升10倍";
    substringFixture.platforms.xiaohongshu.titleLines = ["效率提升10倍"];
    substringFixture.platforms.xiaohongshu.headlineClaimIds = [substringFixture.claims[0].id];
    const substringFixturePath = path.join(inRepoTemp, "numeric-substring.json");
    await writeFile(substringFixturePath, `${JSON.stringify(substringFixture, null, 2)}\n`);
    const substringValidation = run("claim-to-pixel.mjs", ["validate", substringFixturePath]);
    assert.notEqual(substringValidation.status, 0);
    assert.match(substringValidation.transcript, /CTP_TITLE_PROMISE_UNVERIFIED/u);

    const falseLedgerTokenFixture = JSON.parse(await readFile(fixture, "utf8"));
    falseLedgerTokenFixture.claims[0].text = "本流程经测试记录为 110 倍。";
    falseLedgerTokenFixture.claims[0].titleTokens = ["10倍"];
    const falseLedgerTokenPath = path.join(inRepoTemp, "false-ledger-token.json");
    await writeFile(falseLedgerTokenPath, `${JSON.stringify(falseLedgerTokenFixture, null, 2)}\n`);
    const falseLedgerTokenValidation = run("claim-to-pixel.mjs", ["validate", falseLedgerTokenPath]);
    assert.notEqual(falseLedgerTokenValidation.status, 0);
    assert.match(falseLedgerTokenValidation.transcript, /CTP_TOKEN_NOT_IN_CLAIM/u);

    const certifiedPrefixFixture = JSON.parse(await readFile(fixture, "utf8"));
    certifiedPrefixFixture.platforms.xiaohongshu.title = "独立输出3种画幅";
    certifiedPrefixFixture.platforms.xiaohongshu.titleLines = ["独立输出3种画幅"];
    certifiedPrefixFixture.platforms.xiaohongshu.headlineClaimIds = [certifiedPrefixFixture.claims[0].id];
    const certifiedPrefixPath = path.join(inRepoTemp, "certified-numeric-prefix.json");
    await writeFile(certifiedPrefixPath, `${JSON.stringify(certifiedPrefixFixture, null, 2)}\n`);
    const certifiedPrefixValidation = run("claim-to-pixel.mjs", ["validate", certifiedPrefixPath]);
    assert.equal(certifiedPrefixValidation.status, 0, certifiedPrefixValidation.transcript);

    const riskyPromiseFixture = JSON.parse(await readFile(fixture, "utf8"));
    riskyPromiseFixture.platforms.wechatWide.promise = "全网唯一效率提升10倍";
    const riskyPromisePath = path.join(inRepoTemp, "risky-promise.json");
    await writeFile(riskyPromisePath, `${JSON.stringify(riskyPromiseFixture, null, 2)}\n`);
    const riskyPromiseValidation = run("claim-to-pixel.mjs", ["validate", riskyPromisePath]);
    assert.notEqual(riskyPromiseValidation.status, 0);
    assert.match(riskyPromiseValidation.transcript, /platforms\.wechatWide\.promise/u);
    assert.match(riskyPromiseValidation.transcript, /CTP_TITLE_PROMISE_UNVERIFIED/u);

    const linkedCli = path.join(tempRoot, "claim-to-pixel-link.mjs");
    await symlink(path.join(scriptDir, "claim-to-pixel.mjs"), linkedCli);
    const linkedInvocation = spawnSync(process.execPath, [linkedCli, "--help"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    assert.equal(linkedInvocation.status, 0, linkedInvocation.stderr);
    assert.match(linkedInvocation.stdout, /Claim2Cover Claim-to-Pixel contract/u);

    const releasePending = run("claim-to-pixel.mjs", ["release-check", fixture]);
    assert.notEqual(releasePending.status, 0);
    assert.match(releasePending.transcript, /CTP_RELEASE_SIGNOFF/u);

    const secondBuild = run("claim-to-pixel.mjs", [
      "build",
      fixture,
      path.join(demoDir, "build"),
      "--no-render",
    ]);
    assert.notEqual(secondBuild.status, 0);
    assert.match(secondBuild.transcript, /CTP_OUTPUT_EXISTS/u);

    const boardInfo = await stat(path.join(demoDir, "DEMO.html"));
    assert.ok(boardInfo.isFile());
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
    await rm(inRepoTemp, { recursive: true, force: true });
  }

  console.log("Claim-to-Pixel contract, negative gate, rendering, and signoff transition passed.");
}

main().catch((error) => {
  console.error(`test-claim-to-pixel: ${error.message}`);
  process.exitCode = 1;
});
