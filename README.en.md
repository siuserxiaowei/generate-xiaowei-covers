# Claim2Cover | Xiaowei AI Cover Evidence Chain

> Video-series update: preserve the creator’s identity and recognizable bold-type/collage language, while choosing colors, backgrounds, layouts and poses per topic. Source portraits guide likeness; they are not pasted into covers. See the [friend testing guide](README.md#给朋友快速测试). A Codex environment with image generation and reference-image support is required. Users may supply their own identity photo; author-local paths are not required. Historical gallery images do not certify the revised visual workflow.


> Turn one topic into a reusable cover prompt and a consistent cover set for Xiaohongshu, Douyin, landscape, or WeChat.

## Copy-to-cover entry

The bundled [`xiaowei-content`](skills/xiaowei-content/SKILL.md) skill handles reference research, separate platform drafts, local feedback and handoff to this cover skill. Invoke `$xiaowei-content` with a draft; say `出整套` to include 3:4 and 9:16 covers, or `改口吻` to revise the current copy. Copy-only is the default. See the [Chinese quick start](README.md#小伟内容文案与封面总入口) for local installation. Private drafts and unapproved examples are not bundled or published.

## Six visual presets

Each new set randomly selects one of six presets: original, editorial, atutun, gbro, oil, or baoyu. Explicit style requests override randomness. The set keeps its identity, palette and typography while composing each requested ratio independently. Defaults are 3:4 + 9:16; requesting portrait and landscape adds 16:9; WeChat uses 21:9 + independent 1:1.

Run `node scripts/select-cover-style.mjs <project-dir>` to save the selection and visual brief. The selector does not generate images: original/editorial use editable HTML; the other four use native image generation with inspected portrait references. Reusing the project preserves the selection. A seed reproduces the preset choice, not identical generated pixels.

Save full prompts, reference assets, actual pixel dimensions and output paths in the project. Deliver clickable files and verify the viewer when asked to open them. See [preset and delivery rules](references/style-presets.md) for sources and adaptation boundaries. The existing Claim-to-Pixel v1 contract covers its three HTML surfaces only, not these additional ratios or generated raster covers.

[中文说明](README.md) · [Claim-to-Pixel contract](references/claim-to-pixel-contract.md) · [VibeLab pack](contest/README.md) · [Full-resolution gallery](docs/gallery.md) · [Architecture](docs/architecture.md)

[![Validate Skill](https://github.com/siuserxiaowei/generate-xiaowei-covers/actions/workflows/validate.yml/badge.svg)](https://github.com/siuserxiaowei/generate-xiaowei-covers/actions/workflows/validate.yml)
[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](LICENSE)

[![Full-resolution paired WeChat cover](docs/images/showcase/wechat/hero-field-recap-pair-1944x620.png)](docs/images/showcase/wechat/hero-field-recap-pair-1944x620.png)

`generate-xiaowei-covers` is a Codex Skill for Chinese AI content creators. Claim2Cover asks why a headline claim is allowed before deciding how the cover should look. Give it a topic, first-party link, article, screenshot, video, or event photo. It will:

1. understand the actual editorial promise;
2. research current first-party facts;
3. select one of six evidence structures;
4. extract timestamped video candidates and a contact sheet without API calls when needed;
5. write a task-specific `COVER_PROMPT.md`;
6. select a visual preset and independently compose the requested ratios;
7. export PNG, editable HTML or generation prompts/records, and provenance ledgers.

This is not a “make a pretty AI poster” prompt. It is an evidence-aware cover workflow:

> editorial judgment + source verification + cover brief + structured layout + deterministic export

## Maintainer evidence and reusable workflow

See [two historical maintainer tasks](docs/cases/README.md), the [workflow and maintenance plan](docs/maintainer-workflow.md), and the [Codex OSS application dossier](docs/oss/README.md). The cases include six unchanged historical PNGs, curated editable HTML, source records, and a checksum manifest. They demonstrate reuse by the maintainer, not third-party adoption. The fixed contract demo remains explicitly distinct from these tasks. [Copy-ready application text](docs/oss/application.md) is available in English and Chinese.

`npm run verify:cases` checks the curated package; `npm run test:cases` also re-renders both cases and exercises five failure checks. These run within `npm test`, alongside form text length validation.

## Claim-to-Pixel release contract

For auditable public work, the Agent classifies `fact / judgment / unknown` and authors separate 3:4, 21:9, and 1:1 briefs. The local CLI then deterministically validates sources, risky title tokens, asset rights, copy limits, measured DOM safe areas, and Git state before it renders exact-size PNGs.

```bash
node scripts/claim-to-pixel.mjs validate contest/demo/claim-to-pixel.invalid.json
node scripts/claim-to-pixel.mjs build contest/demo/claim-to-pixel.json /tmp/claim2cover-build
npm run demo:claim2cover -- /tmp/claim2cover-demo
```

The intentional “10×” fixture fails. The corrected fixture passes 8/8 content gates but stays `PENDING HUMAN SIGN-OFF`; only a named reviewer may sign it. Each approval is bound to the SHA-256 of the full non-signoff payload, so post-review edits fail closed, and release additionally requires a clean commit. The stable fixture is explicitly `liveAiClaimed:false` with its prompt provenance retained; it is not presented as a live model call.

## One sentence is enough

```text
$generate-xiaowei-covers

Turn this official release into WeChat and Xiaohongshu covers.
Verify the facts first. Keep the portrait at lower-left on 3:4 and 21:9,
and author the square cover separately.
```

## What the Skill produces

| File | Purpose |
|---|---|
| `COVER_PROMPT.md` | Reusable creative brief covering copy, evidence, subject, environment, visual character, light, composition, and typography |
| `cover.html` | Editable HTML/CSS source |
| `output/*.png` | Full-resolution platform-specific covers |
| `FACTS.md` | Evidence ledger for visible versions, dates, numbers, prices, and claims |
| `assets/SOURCES.md` | Provenance and rights notes for portraits, logos, screenshots, and external media |

## What “cover prompt” means here

The prompt is not a vague sentence such as “make it premium.” The generated `COVER_PROMPT.md` specifies:

- audience, click promise, and editorial stance;
- exact title, highlight phrase, subtitle, and line breaks per surface;
- one primary content route and its evidence requirement;
- subject, environment, visual character, light, camera/composition, and typography;
- portrait placement and context that must remain visible;
- independent rules for 3:4, 21:9, and 1:1;
- required assets, rights status, must-keep elements, and prohibited claims.

It is both Codex's execution brief and a portable prompt for another design or image tool.

## Six content routes

| Route | Use it for | The cover must answer | Primary evidence |
|---|---|---|---|
| `model_release` | releases, open source, versions, pricing, capability changes | What changed, and who should care? | official release, model card, repository |
| `tool_tutorial` | setup, deployment, integration, troubleshooting | What can the reader complete? | real UI, terminal output, before/after |
| `model_comparison` | multiple models on the same task | Where do they actually differ? | comparable test matrix |
| `workflow` | multi-model or multi-agent roles | Who does what, and how do they connect? | role map, process, execution record |
| `official_evidence` | release notes, papers, docs, announcements | What does the primary source really change? | original document and key passages |
| `field_recap` | events, talks, projects, hands-on retrospectives | What did the creator learn first-hand? | contextual photo and first-person conclusion |

Routes are content structures, not six color variants of one poster.

## Three surfaces, three compositions

| Surface | Production size | Rule |
|---|---:|---|
| Xiaohongshu portrait | `1080×1440` | title above, portrait at lower-left, evidence below or to the right |
| WeChat main cover | `2100×900` | title and portrait on the left, primary evidence on the right |
| WeChat square cover | `1080×1080` | separate 4–10-character title, pure typography by default, never a mechanical crop |

WeChat jobs also export a `1944×620` paired review image.

The portrait is not a decorative sticker. On 3:4 and 21:9, preserve the face, hands, microphone, table, and action context whenever present. The 1:1 default omits the portrait for thumbnail readability; a requested portrait is recomposed, not cropped from 21:9.

## Full-resolution examples

Click an image to inspect the original PNG.

<table>
  <tr>
    <td width="65%"><a href="docs/images/showcase/wechat/field-recap-2100x900.png"><img src="docs/images/showcase/wechat/field-recap-2100x900.png" alt="2100×900 WeChat main cover"></a></td>
    <td width="35%"><a href="docs/images/showcase/wechat/field-recap-1080x1080.png"><img src="docs/images/showcase/wechat/field-recap-1080x1080.png" alt="1080×1080 WeChat square cover"></a></td>
  </tr>
</table>

<table>
  <tr>
    <td width="33%"><a href="docs/images/showcase/xiaohongshu/01-model-release-1080x1440.png"><img src="docs/images/showcase/xiaohongshu/01-model-release-1080x1440.png" alt="Model release cover"></a></td>
    <td width="33%"><a href="docs/images/showcase/xiaohongshu/04-workflow-1080x1440.png"><img src="docs/images/showcase/xiaohongshu/04-workflow-1080x1440.png" alt="Workflow cover"></a></td>
    <td width="33%"><a href="docs/images/showcase/xiaohongshu/06-field-recap-1080x1440.png"><img src="docs/images/showcase/xiaohongshu/06-field-recap-1080x1440.png" alt="Field recap cover"></a></td>
  </tr>
</table>

See all six routes in the [full-resolution gallery](docs/gallery.md).

## Install as a Codex Skill

Requirements: Codex, Node.js 20+, and either Google Chrome or Playwright. Video intake additionally requires `ffmpeg` and `ffprobe`.

```bash
mkdir -p ~/.codex/skills

git clone \
  https://github.com/siuserxiaowei/generate-xiaowei-covers.git \
  ~/.codex/skills/generate-xiaowei-covers
```

Restart the Codex session and invoke:

```text
$generate-xiaowei-covers
```

This repository is a Codex Skill, not a hosted web application. The Node scripts can be used directly, while research, routing, and prompt authoring are performed by Codex following `SKILL.md`.

## Reusable request template

```text
$generate-xiaowei-covers

Topic:
Primary sources:
Targets: Xiaohongshu / WeChat / both
One thing the reader should remember:
Must include:
Must avoid:
Portrait or product assets:
Primary evidence: model card / UI / comparison / workflow / document / photo

Verify first-party sources, then return:
1. route and rationale;
2. three title options;
3. a complete COVER_PROMPT.md;
4. independent compositions per surface;
5. PNG, editable HTML, FACTS.md, and SOURCES.md.
```

## Manual CLI

```bash
SKILL_DIR="$HOME/.codex/skills/generate-xiaowei-covers"

node "$SKILL_DIR/scripts/new-cover-project.mjs" ./my-cover vertical
node "$SKILL_DIR/scripts/new-cover-project.mjs" ./my-wechat-cover wechat

node "$SKILL_DIR/scripts/extract-video-frames.mjs" \
  ./demo.mp4 \
  ./my-cover/assets/evidence/video-frames

node "$SKILL_DIR/scripts/render-covers.mjs" \
  ./my-wechat-cover/cover.html \
  ./my-wechat-cover/output \
  --only release
```

A generated project contains:

```text
my-cover/
├── COVER_PROMPT.md
├── FACTS.md
├── cover.html
├── LICENSE
├── assets/
│   ├── portrait/
│   ├── brand/
│   ├── evidence/
│   └── SOURCES.md
└── output/
```

`--only` accepts route tokens, DOM IDs, `data-file` names, or a comma-separated combination.

## Evidence and rights

- Every visible factual claim must be recorded in `FACTS.md` with a primary URL, verification date, and supporting location.
- Every downloaded or supplied visual asset must be recorded in `assets/SOURCES.md`.
- The renderer checks pixels, not truth; publication remains a human gate.
- Bundled brand images are for demonstration and product identification. They do not imply endorsement or grant trademark rights.
- The repository owner has authorized the bundled portrait for this public project's examples. That does not grant others the right to reuse the portrait as their identity.

## What this is not

It is not:

- a Midjourney or Stable Diffusion replacement;
- a Canva-like drag-and-drop editor;
- a machine that invents benchmarks, rankings, quotes, or personal experience;
- a fixed poster that swaps text for every topic;
- a license clearinghouse for logos, screenshots, or portraits.

## Validation

```bash
npm test
```

The default test checks required Skill files, frontmatter, local template assets, six vertical export nodes, eighteen WeChat export nodes, JavaScript syntax, and real project creation. It renders `1080×1440`, `2100×900`, `1080×1080`, and `1944×620` outputs and verifies their PNG dimensions. Marked title regions that overflow their safe area are rejected instead of silently clipped. Thumbnail readability still receives a final human visual review.

Set `COVER_RENDERER=playwright` or `COVER_RENDERER=chrome` to verify one rendering backend explicitly. The default `auto` mode prefers Playwright and falls back to local Chrome.

## License, independent implementation, and visual inspiration

The content routes, cover-prompt system, portrait rules, current templates, and renderer are independently designed for this project.

Early visual exploration was inspired by the Swiss social-card idea in [`op7418/guizang-social-card-skill`](https://github.com/op7418/guizang-social-card-skill). The current public template uses an independent code implementation. Thank you to that project for the visual inspiration.

Code, documentation, and templates are released under [GNU AGPL-3.0](LICENSE). Portraits, third-party marks, organization avatars, and external screenshots are not relicensed by it. See [NOTICE.md](NOTICE.md) and [assets/SOURCES.md](assets/SOURCES.md).

## Current limitations

- This is a Skill plus an HTML/CSS rendering core, not a hosted editor.
- Fact verification, brand usage, and final publication remain human gates.
- There is no unified `cover.json` visual form yet.
- Video preprocessing uses temporal sampling followed by Agent review; local sharpness, scene-change, and duplicate-frame scoring are not implemented yet.
- macOS is fully tested; other systems should prefer the Playwright path.

## Contributing

Contributions for new content routes, layout components, renderer compatibility, and real-world examples are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md) first.
