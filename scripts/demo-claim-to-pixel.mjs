#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { sanitizePublicTranscript } from "./claim-to-pixel.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.dirname(scriptDir);
const validFixture = path.join(root, "contest", "demo", "claim-to-pixel.json");
const invalidFixture = path.join(root, "contest", "demo", "claim-to-pixel.invalid.json");

function usage() {
  return [
    "Usage: node demo-claim-to-pixel.mjs [output-dir]",
    "",
    "Runs the intentional FAIL fixture, builds the fixed PASS fixture, renders three",
    "production covers, and creates a 1920x1080 recording board plus shot list.",
    "The optional output directory must not already exist.",
  ].join("\n");
}

function fail(message) {
  throw new Error(message);
}

function run(script, args) {
  const result = spawnSync(process.execPath, [path.join(scriptDir, script), ...args], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: process.env,
  });
  if (result.error) fail(`${script} could not start: ${result.error.message}`);
  return {
    status: result.status,
    transcript: `${result.stdout || ""}${result.stderr || ""}`,
  };
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function reserveOutput(outputArg) {
  if (!outputArg) return mkdtemp(path.join(os.tmpdir(), "claim2cover-demo-"));
  const outputDir = path.resolve(outputArg);
  if (outputDir === path.parse(outputDir).root) fail("Refusing a filesystem root output.");
  try {
    await access(outputDir);
    fail(`Output directory already exists; nothing was overwritten: ${outputDir}`);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  await mkdir(outputDir, { recursive: false });
  return outputDir;
}

function storyboardHtml(failLines, passLines, report) {
  const repo = report.repository?.available
    ? `${report.repository.shortCommit} · ${report.repository.dirty ? "DIRTY BUILD INPUT" : "CLEAN BUILD INPUT"}`
    : "NO GIT STATE";
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <title>Claim2Cover demo board</title>
  <style>
    *{box-sizing:border-box} html,body{margin:0;background:#d9d6cf;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif;color:#111}
    .board{width:1920px;height:1080px;overflow:hidden;padding:46px 56px 38px;background:#f2efe6;position:relative}
    .head{height:92px;border-bottom:5px solid #111;display:flex;justify-content:space-between;align-items:flex-start}
    h1{margin:0;font-size:52px;letter-spacing:-.045em}.sub{font-weight:800;color:#655f56;font-size:21px;text-align:right;line-height:1.35}
    .main{display:grid;grid-template-columns:620px 1fr;gap:40px;margin-top:30px;height:810px}
    .states{display:grid;grid-template-rows:1fr 1fr;gap:24px}
    .state{border:4px solid #111;background:#fff;padding:24px 28px;box-shadow:10px 10px 0 #111;overflow:hidden}
    .state h2{margin:0 0 14px;font-size:36px;display:flex;justify-content:space-between}.state.fail h2{color:#b91c1c}.state.pass h2{color:#166534}
    pre{margin:0;font:700 17px/1.48 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap}
    .covers{display:grid;grid-template-columns:420px 1fr;grid-template-rows:390px 390px;gap:26px}
    figure{margin:0;border:4px solid #111;background:#fff;position:relative;overflow:hidden;box-shadow:9px 9px 0 #111}
    figure img{width:100%;height:100%;object-fit:contain;background:#ddd9d0}figcaption{position:absolute;left:0;bottom:0;background:#111;color:#fff;padding:8px 13px;font-size:18px;font-weight:900}
    .xhs{grid-row:1 / span 2}.wide{grid-column:2;grid-row:1}.square{grid-column:2;grid-row:2}.square img{object-position:left center}
    .foot{position:absolute;left:56px;right:56px;bottom:24px;display:flex;justify-content:space-between;font-weight:900;font-size:20px}.pending{color:#9a3412}
  </style>
</head>
<body>
  <main class="board" data-export data-file="claim2cover-demo-board.png" data-width="1920" data-height="1080">
    <header class="head" data-text-safe="board-heading"><h1>Claim2Cover｜从危险标题到可审计封面</h1><div class="sub">Recorded fixture · liveAiClaimed:false<br>${escapeHtml(repo)}</div></header>
    <section class="main">
      <div class="states">
        <article class="state fail"><h2><span>01 / FAIL</span><span>危险承诺</span></h2><pre>${escapeHtml(failLines)}</pre></article>
        <article class="state pass"><h2><span>02 / PASS</span><span>修复后</span></h2><pre>${escapeHtml(passLines)}</pre></article>
      </div>
      <div class="covers">
        <figure class="xhs"><img src="build/png/claim2cover-xiaohongshu-3x4.png" alt="小红书 3:4"><figcaption>3:4 独立 brief</figcaption></figure>
        <figure class="wide"><img src="build/png/claim2cover-wechat-21x9.png" alt="公众号 21:9"><figcaption>21:9 独立 brief</figcaption></figure>
        <figure class="square"><img src="build/png/claim2cover-wechat-1x1.png" alt="公众号 1:1"><figcaption>1:1 独立 brief</figcaption></figure>
      </div>
    </section>
    <footer class="foot"><span>FACT / JUDGMENT / UNKNOWN → deterministic gates → PNG</span><span class="pending">PENDING HUMAN SIGN-OFF</span></footer>
  </main>
</body>
</html>
`;
}

function importantFailures(transcript) {
  return transcript
    .split("\n")
    .filter((line) => /^(GATES:|ERROR CTP_TITLE_|STATUS:)/u.test(line))
    .slice(0, 6)
    .join("\n");
}

function importantPass(transcript) {
  return transcript
    .split("\n")
    .filter((line) => /^(GATES:|BUILD:|STATUS:|NEXT:)/u.test(line))
    .slice(0, 6)
    .join("\n");
}

function shotList() {
  return `# Claim2Cover 录屏镜头清单（72 秒）

> 这组素材来自固定可复现 fixture，\`liveAiClaimed:false\`。录制时应明确：语义 brief 是 Agent 草案；本地 CLI 做确定性校验与渲染。真实 Skill 前向测试需另留运行证据。

| 时间 | 画面 | 旁白要点 | 现成素材 |
|---:|---|---|---|
| 0–6s | 一句话痛点 + 危险标题 | “封面最危险的不是不好看，是把没证据的话做成大标题。” | \`DEMO.html\` 顶部 |
| 6–17s | 展开 unknown 行和危险 10 倍标题 | Agent 把输入拆为 fact / judgment / unknown，10 倍进入 unknown | \`claim-to-pixel.invalid.json\` |
| 17–27s | 运行负例 | CLI 非零退出：unknown 上标题、绝对词/数字无事实 token、21:9 超长 | \`FAIL.log\` |
| 27–38s | 切换修复 fixture | Agent 把标题降级为“主张先过证据门”，并分别写三套 brief | \`claim-to-pixel.json\` + \`build/briefs/\` |
| 38–51s | 运行 build | 八道门 PASS，确定性生成 HTML、台账、来源、权利 CSV 和 PNG | \`PASS.log\` + \`build/CONTRACT_REPORT.json\` |
| 51–63s | 快速扫三张成品 | 3:4 是纵向台账，21:9 是左右证据合同，1:1 是状态印章；不是机械裁切 | \`build/png/\` |
| 63–69s | 停在签核状态 | 系统故意显示 PENDING HUMAN SIGN-OFF，AI 不替人确认事实与权利 | \`build/STATUS.md\` |
| 69–72s | 一屏收束 | “先让主张过证据门，再让像素上封面。” | \`board/claim2cover-demo-board.png\` |

## 建议录制顺序

1. 先打开 \`<output-dir>/DEMO.html\` 全屏，完成开头与结尾镜头。
2. 中间切终端展示 \`FAIL.log\` 与 \`PASS.log\`，不要滚动无关日志。
3. 三张 PNG 各停 2–3 秒；最后回到 1920×1080 看板。
4. 不要展示或口播“实时 AI 调用”；这个固定 fixture 的职责是可复现回归。真实 Agent 前向测试另录。
`;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    console.log(usage());
    return;
  }
  if (args.length > 1) fail(usage());
  const outputDir = await reserveOutput(args[0]);
  const publicTranscript = (value) => sanitizePublicTranscript(value, {
    outputDir,
    repositoryRoot: root,
  });

  const failed = run("claim-to-pixel.mjs", ["validate", invalidFixture]);
  assert.notEqual(failed.status, 0, "Intentional negative fixture must fail.");
  for (const code of ["CTP_TITLE_UNVERIFIED", "CTP_TITLE_PROMISE_UNVERIFIED", "CTP_TITLE_LENGTH"]) {
    assert.match(failed.transcript, new RegExp(code, "u"));
  }
  const publicFailedTranscript = publicTranscript(failed.transcript);
  await writeFile(path.join(outputDir, "FAIL.log"), publicFailedTranscript);

  const buildDir = path.join(outputDir, "build");
  const passed = run("claim-to-pixel.mjs", ["build", validFixture, buildDir]);
  if (passed.status !== 0) fail(`Fixed fixture failed:\n${passed.transcript}`);
  const publicPassedTranscript = publicTranscript(passed.transcript);
  await writeFile(path.join(outputDir, "PASS.log"), publicPassedTranscript);

  const report = JSON.parse(await readFile(path.join(buildDir, "CONTRACT_REPORT.json"), "utf8"));
  assert.equal(report.status, "PENDING HUMAN SIGN-OFF");
  assert.equal(report.publishReady, false);
  assert.equal(report.render.status, "passed");
  assert.equal(report.aiDraft.liveAiClaimed, false);

  const beforeSignoff = {
    status: report.status,
    publishReady: report.publishReady,
    liveAiClaimed: report.aiDraft.liveAiClaimed,
    humanAction: "Review facts, sources, asset rights, editable HTML, and all three PNGs before running signoff.",
    signoffCommand:
      "node scripts/claim-to-pixel.mjs signoff <manifest> --reviewer <name> --note <review-note> --confirm reviewed-facts-rights-previews",
    releaseCommand: "node scripts/claim-to-pixel.mjs release-check <manifest>",
  };
  await writeFile(path.join(outputDir, "STATUS_BEFORE_SIGNOFF.json"), `${JSON.stringify(beforeSignoff, null, 2)}\n`);

  const demoHtml = storyboardHtml(
    importantFailures(publicFailedTranscript),
    importantPass(publicPassedTranscript),
    report,
  );
  const demoHtmlPath = path.join(outputDir, "DEMO.html");
  await writeFile(demoHtmlPath, demoHtml);
  const boardDir = path.join(outputDir, "board");
  const boardRender = run("render-covers.mjs", [demoHtmlPath, boardDir]);
  if (boardRender.status !== 0) fail(`Demo board render failed:\n${boardRender.transcript}`);
  await writeFile(path.join(outputDir, "BOARD_RENDER.log"), publicTranscript(boardRender.transcript));

  const shots = [
    { order: 1, file: "FAIL.log", purpose: "Intentional negative gate output" },
    { order: 2, file: "PASS.log", purpose: "Fixed fixture and build output" },
    { order: 3, file: "build/claim-ledger.json", purpose: "fact/judgment/unknown ledger" },
    { order: 4, file: "build/briefs/xiaohongshu.json", purpose: "AI-draft 3:4 brief" },
    { order: 5, file: "build/briefs/wechatWide.json", purpose: "AI-draft 21:9 brief" },
    { order: 6, file: "build/briefs/wechatSquare.json", purpose: "AI-draft 1:1 brief" },
    { order: 7, file: "build/png/claim2cover-xiaohongshu-3x4.png", purpose: "1080x1440 output" },
    { order: 8, file: "build/png/claim2cover-wechat-21x9.png", purpose: "2100x900 output" },
    { order: 9, file: "build/png/claim2cover-wechat-1x1.png", purpose: "1080x1080 output" },
    { order: 10, file: "board/claim2cover-demo-board.png", purpose: "1920x1080 recording board" },
    { order: 11, file: "STATUS_BEFORE_SIGNOFF.json", purpose: "Human boundary and next commands" },
  ];
  await writeFile(path.join(outputDir, "SHOTS.json"), `${JSON.stringify(shots, null, 2)}\n`);
  await writeFile(path.join(outputDir, "SHOT_LIST.md"), shotList());

  const summary = {
    schemaVersion: 1,
    demo: "Claim2Cover Claim-to-Pixel",
    liveAiClaimed: false,
    negativeGate: { exitCode: failed.status, passed: false },
    fixedBuild: {
      exitCode: passed.status,
      gatesPassed: report.gates.every((gate) => gate.pass),
      status: report.status,
      publishReady: report.publishReady,
    },
    outputs: shots,
    sourceRevision: report.repository,
  };
  await writeFile(path.join(outputDir, "RUN_SUMMARY.json"), `${JSON.stringify(summary, null, 2)}\n`);

  console.log(`DEMO: PASS ${outputDir}`);
  console.log(`FAIL TRACE: ${path.join(outputDir, "FAIL.log")}`);
  console.log(`THREE COVERS: ${path.join(buildDir, "png")}`);
  console.log(`RECORDING BOARD: ${path.join(boardDir, "claim2cover-demo-board.png")}`);
  console.log(`STATUS: ${report.status}`);
}

main().catch((error) => {
  console.error(`demo-claim-to-pixel: ${error.message}`);
  process.exitCode = 1;
});
