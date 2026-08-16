---
name: generate-xiaowei-covers
description: Turn one topic, link, article, screenshot, or event photo into a reusable COVER_PROMPT.md creative brief and production-ready Xiaohongshu/Rednote 3:4 plus WeChat Official Account 21:9 and independently authored 1:1 cover images. Research current official facts, choose one of six content routes, write platform-specific Chinese cover copy, keep the user's portrait at lower-left on 3:4 and 21:9, render editable HTML to PNG, and preserve fact and asset provenance. Use when the user asks for 封面提示词、封面 prompt、小伟封面、公众号封面、小红书封面、横版首图、模型发布图、教程封面、对比封面、工作流封面或现场复盘封面。
---

# Generate Xiaowei Covers

Turn a topic, link, article, screenshot, or photo into a credible cover package. Reuse the visual grammar and content routes; do not merely replace text in a frozen poster.

## Read The Relevant References

- Read `references/input-schema.md` when normalizing a loose request or deciding whether user input is sufficient.
- Read `references/content-routing.md` before choosing one of the six content structures.
- Read `references/brand-system.md` before composing, cropping the portrait, or adapting across ratios.

## Workflow

### 1. Normalize The Brief

Accept one sentence or one source link as sufficient intake when safe. Normalize it to the schema in `references/input-schema.md`.

Require at least one of:

- a topic or draft title;
- a source URL, article, script, screenshot, or project artifact.

Use these defaults unless the user overrides them:

- audience: Chinese readers interested in AI tools;
- tone: clear, credible, and opinionated only where evidence permits;
- portrait: `assets/portrait/xiaowei-context.jpg` on 3:4 and 21:9;
- portrait placement: lower-left on 3:4 and 21:9; the independently authored 1:1 companion defaults to pure typography;
- output: PNG with editable HTML retained;
- variants: one production-ready set by default; when the user asks for alternatives, create 2–3 materially different arrangements, not color swaps.

Ask only when a missing answer changes the author's position, asset rights, privacy, or factual conclusion. Never invent the user's personal experience or recommendation.

### 2. Establish The Evidence

For current releases, prices, versions, product behavior, policies, schedules, or claims, browse before writing the title.

Use this source order:

1. user-provided original material;
2. official release page, documentation, GitHub, model card, paper, or dataset;
3. reproducible first-party testing;
4. secondary reporting only as context.

Record every downloaded logo, screenshot, product image, or photo in the task project's `assets/SOURCES.md` with source URL, fetch date, purpose, and rights/trademark note.

Record every factual statement that appears on a cover in the task project's `FACTS.md`: exact cover copy, fact/editorial classification, official URL, verification date, and supporting location. Do not render a factual claim that is absent from this ledger.

Treat bundled brand avatars as prototype fallbacks. Re-check official identity before public publishing. Do not reuse old sample numbers as current facts.

### 3. Route The Content

Choose exactly one primary route from `references/content-routing.md`:

- `model_release`
- `tool_tutorial`
- `model_comparison`
- `workflow`
- `official_evidence`
- `field_recap`

Choose the route by the reader's promised value, not by which logo happens to appear. Downgrade claims when evidence is missing.

### 4. Create A Project

Resolve this installed Skill's absolute directory as `SKILL_DIR`, then run one of:

```bash
node "$SKILL_DIR/scripts/new-cover-project.mjs" <target-dir> vertical
node "$SKILL_DIR/scripts/new-cover-project.mjs" <target-dir> wechat
```

The script copies the editable template, default portrait, cached prototype brand assets, `COVER_PROMPT.md`, `assets/SOURCES.md`, `FACTS.md`, the applicable license, and creates `output/`.

Use:

- `assets/templates/vertical.html` for the six 1080×1440 structures;
- `assets/templates/wechat.html` for six 2100×900 + 1080×1080 pairs.

Replace sample copy and evidence with the current task. Keep the unused structures only while exploring; before delivery, export only requested variants.

### 5. Write The Cover Prompt And Surface Copy

Fill the project root `COVER_PROMPT.md` after routing and research. Treat it as both the execution brief for Codex and a portable cover prompt for another design or image tool.

Complete these sections with task-specific content:

- original request, audience, targets, and author stance;
- selected route, routing reason, click promise, and one-sentence conclusion;
- exact title, highlight phrase, kicker, and subtitle per surface;
- evidence module and source boundary;
- six visible dimensions: subject, environment, visual character, light, camera/composition, and typography;
- assets, rights status, must-keep elements, and prohibited elements;
- a copyable final prompt.

Author each surface independently:

- Xiaohongshu 3:4: 1–2 deliberate lines with one highlighted phrase.
- WeChat 21:9: prefer one line of roughly 8–14 Chinese characters; allow two lines only at a semantic break.
- WeChat 1:1: derive a separate 4–10-character title. Do not crop or squeeze the 21:9 title.

State facts as facts, inferences as judgments, and personal practice in first person. Do not leave generic placeholders in the final `COVER_PROMPT.md`.

### 6. Compose The Evidence Module

Match evidence to the chosen route:

- release → official model card or release summary;
- tutorial → real UI/screenshot or clearly marked interface diagram;
- comparison → common-test matrix with comparable inputs;
- workflow → role/step flow with human checkpoints;
- official evidence → original document excerpt and three consequences;
- field recap → complete contextual photo and up to three first-person takeaways.

Keep the portrait lower-left on 3:4 and 21:9. The 1:1 companion is an intentional pure-typography exception unless the user explicitly asks for a portrait. Prefer a contextual rectangle over a poor cutout. Preserve face, hand, microphone, table, and task-relevant objects. Set `object-position` explicitly.

### 7. Render

Mark every deliverable root with:

```html
data-export data-file="stable-output-name.png"
```

Then export only the selected route. Route tokens are `release`, `tutorial`, `comparison`, `workflow`, `evidence`, and `photo`:

```bash
node "$SKILL_DIR/scripts/render-covers.mjs" <path/to/cover.html> <path/to/output> --only release
```

For a WeChat route, `--only release` exports its 21:9, independent 1:1, and pair-preview review image. An exact node ID such as `--only wechat-release-wide` exports only that node. Omit `--only` only when intentionally rendering the whole six-route template.

The renderer waits for fonts and images, exports the selected marked nodes, and checks output dimensions against the DOM node.

### 8. Review At Thumbnail Size

Before delivery:

- verify all PNG dimensions;
- inspect 21:9 and 1:1 independently;
- downsample to 360px width and check title, portrait, and evidence recognition;
- confirm no face, hand, UI label, or footer collision;
- confirm every number, version, date, ranking, and absolute claim has evidence;
- confirm WeChat 1:1 is a separately authored cover;
- keep only final outputs, editable source, real assets, and provenance after the user approves cleanup.

Show the rendered images before running any optional heavy validator. Ask: `先你自己看，还是我先自动核查一遍？`

## Non-Negotiables

- Do not fake official pages, screenshots, benchmarks, quotes, percentages, or release facts.
- Do not substitute a model's reputation for a real comparison.
- Do not make six variants that differ only by color.
- Do not stretch or mechanically crop between 3:4, 21:9, and 1:1.
- Do not use a low-quality portrait cutout when the contextual photo is available.
- Do not publish web-sourced imagery without preserving provenance and surfacing rights uncertainty.
- Do not delete source photos or final files without explicit authorization.
