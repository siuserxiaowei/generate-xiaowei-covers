# Xiaowei AI Cover Skill

> Turn one topic into a reusable cover prompt and a production-ready cover package for Xiaohongshu and WeChat.

[中文说明](README.md) · [Full-resolution gallery](docs/gallery.md) · [Prompt examples](docs/usage-examples.md) · [Architecture](docs/architecture.md)

[![Validate Skill](https://github.com/siuserxiaowei/generate-xiaowei-covers/actions/workflows/validate.yml/badge.svg)](https://github.com/siuserxiaowei/generate-xiaowei-covers/actions/workflows/validate.yml)
[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](LICENSE)

[![Full-resolution paired WeChat cover](docs/images/showcase/wechat/hero-field-recap-pair-1944x620.png)](docs/images/showcase/wechat/hero-field-recap-pair-1944x620.png)

`generate-xiaowei-covers` is a Codex Skill for Chinese AI content creators. Give it a topic, first-party link, article, screenshot, or event photo. It will:

1. understand the actual editorial promise;
2. research current first-party facts;
3. select one of six evidence structures;
4. write a task-specific `COVER_PROMPT.md`;
5. compose Xiaohongshu 3:4, WeChat 21:9, and WeChat 1:1 independently;
6. export full-resolution PNG, editable HTML, and provenance ledgers.

This is not a “make a pretty AI poster” prompt. It is an evidence-aware cover workflow:

> editorial judgment + source verification + cover brief + structured layout + deterministic export

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

Requirements: Codex, Node.js 20+, and either Google Chrome or Playwright.

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

The validator checks required Skill files, frontmatter, local template assets, six vertical export nodes, eighteen WeChat export nodes, and JavaScript syntax. Release checks also render and inspect:

- 2100×900 WeChat main cover;
- 1080×1080 WeChat square cover;
- 1944×620 paired preview;
- 1080×1440 Xiaohongshu cover;
- 360px thumbnail readability.

## License, independent implementation, and visual inspiration

The content routes, cover-prompt system, portrait rules, current templates, and renderer are independently designed for this project.

Early visual exploration was inspired by the Swiss social-card idea in [`op7418/guizang-social-card-skill`](https://github.com/op7418/guizang-social-card-skill). The current public template uses an independent code implementation. Thank you to that project for the visual inspiration.

Code, documentation, and templates are released under [GNU AGPL-3.0](LICENSE). Portraits, third-party marks, organization avatars, and external screenshots are not relicensed by it. See [NOTICE.md](NOTICE.md) and [assets/SOURCES.md](assets/SOURCES.md).

## Current limitations

- This is a Skill plus an HTML/CSS rendering core, not a hosted editor.
- Fact verification, brand usage, and final publication remain human gates.
- There is no unified `cover.json` visual form yet.
- macOS is fully tested; other systems should prefer the Playwright path.

## Contributing

Contributions for new content routes, layout components, renderer compatibility, and real-world examples are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md) first.
