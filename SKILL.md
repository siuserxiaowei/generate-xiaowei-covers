---
name: generate-xiaowei-covers
description: Generate Xiaowei personal-IP covers from a topic, script, link, photo, screenshot, or video. Randomly select one of six visual presets per set unless the user specifies a style; keep the same identity and style across independently composed Xiaohongshu 3:4, Douyin 9:16, landscape 16:9, or WeChat 21:9/1:1 covers. Use editable HTML or native image generation as the preset requires, preserving factual evidence and source records. Use for 小伟封面、随机风格封面、抖音封面、小红书封面、公众号封面、横竖版封面、封面提示词 or Claim2Cover.
---

# Claim2Cover | Generate Xiaowei Covers

Turn a topic, link, article, screenshot, video, or photo into a credible cover package. Keep one entry point: six visual presets share the same identity, evidence rules, and cross-format workflow. Randomize the visual preset for each new set, not the person's identity or the content.

## Read The Relevant References

- Read `references/input-schema.md` when normalizing a loose request or deciding whether user input is sufficient.
- Read `references/content-routing.md` before choosing one of the six content structures.
- Read `references/brand-system.md` before composing, cropping the portrait, or adapting across ratios.
- Read `references/style-presets.md` for preset selection, HTML/imagegen routing, and portrait/landscape defaults; it takes precedence over legacy original-style layout defaults.
- Read the delivery section of `references/style-presets.md` when saving generated files or responding to “打开给我看看”.
- Read `references/claim-to-pixel-contract.md` for public multi-platform work, numeric or absolute title promises, or an auditable release package.

## Workflow

### 1. Normalize The Brief

Accept one sentence or one source link as sufficient intake when safe. Normalize it to the schema in `references/input-schema.md`.

Require at least one of:

- a topic or draft title;
- a source URL, article, script, screenshot, video, or project artifact.

Use these defaults unless the user overrides them:

- audience: Chinese readers interested in AI tools;
- tone: clear, credible, and opinionated only where evidence permits;
- portrait: inspect `assets/portrait/xiaowei-context.jpg`; use `assets/portrait/xiaowei-original.jpg` as the identity reference when generating a new raster cover;
- visual style: randomly select one preset for a new set; an explicit style or user-supplied reference overrides randomness;
- portrait placement: follow the selected preset and explicit user placement; keep the same person across all surfaces;
- targets: follow the user's platforms; without platform context use 3:4 + 9:16; “横竖都要” adds 16:9; WeChat requests retain 21:9 + independent 1:1;
- output: PNG plus editable HTML for HTML presets, or full prompts/reference assets/generation records for imagegen presets;
- variants: one set by default; when alternatives are requested, use distinct presets in individually named folders.

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

### 3. Compile Public Claims

For public work using the existing Claim-to-Pixel v1 HTML package (3:4 + 21:9 + 1:1), create a `claim-to-pixel.json` manifest before composing. The v1 contract does not certify extra 9:16/16:9 surfaces or imagegen results; retain their factual/source ledgers and real generation records separately. Separate Agent judgment from deterministic execution:

- the Agent classifies `fact`, `judgment`, and `unknown`, then authors three platform-specific title and layout briefs;
- `scripts/claim-to-pixel.mjs` validates the recorded inputs, sources, rights, title tokens, safe limits, repository state, and deterministic render;
- the fixture must state whether a live model call is actually evidenced. Use `liveAiClaimed: false` for a stable replay and preserve its prompt source.

Never certify an unknown claim, pending fact, number, ranking, version, or absolute phrase by wording alone. Keep unsupported claims in the ledger with `coverAllowed: false` so the rejection remains auditable.

Validate before rendering:

```bash
node "$SKILL_DIR/scripts/claim-to-pixel.mjs" validate <claim-to-pixel.json>
```

Use the schema and failure semantics in `references/claim-to-pixel-contract.md`.

### 4. Route The Content

Choose exactly one primary route from `references/content-routing.md`:

- `model_release`
- `tool_tutorial`
- `model_comparison`
- `workflow`
- `official_evidence`
- `field_recap`

Choose the route by the reader's promised value, not by which logo happens to appear. Downgrade claims when evidence is missing.

The content route and visual preset are separate choices. A Codex, Doubao, Qwen, WorkBuddy, or personal-story topic can use any preset while keeping its own evidence and exact copy.

### 5. Create A Project

Resolve this installed Skill's absolute directory as `SKILL_DIR`, then run one of:

```bash
node "$SKILL_DIR/scripts/new-cover-project.mjs" <target-dir> vertical
node "$SKILL_DIR/scripts/new-cover-project.mjs" <target-dir> wechat
```

The script copies the editable template, default portrait, cached prototype brand assets, `COVER_PROMPT.md`, `assets/SOURCES.md`, `FACTS.md`, the applicable license, and creates `output/`.

Then select a style **once per set**. Pass the actual requested ratios; the default is 3:4 + 9:16:

```bash
node "$SKILL_DIR/scripts/select-cover-style.mjs" <target-dir> --ratios 3:4,9:16
# Explicit style / horizontal and vertical example:
node "$SKILL_DIR/scripts/select-cover-style.mjs" <new-target-dir> --style 阿囤囤 --ratios 3:4,9:16,16:9
```

Read the generated `STYLE_BRIEF.md`; `STYLE_SELECTION.json` locks the preset, seed, source attribution, engine and surface plans. Reuse this record for retries and sibling ratios. Use a new project for a new random choice. The project generator's legacy HTML is a starting skeleton, not the completed output of the selected preset.

When the user supplies a video, extract review candidates into the new project before composing:

```bash
node "$SKILL_DIR/scripts/extract-video-frames.mjs" \
  <path/to/video> \
  <target-dir>/assets/evidence/video-frames
```

Open `contact-sheet.jpg`, then inspect the strongest 2–3 full-size candidate JPEGs. Select for semantic relevance, sharpness, complete gestures or UI, and usable title space—not merely facial attractiveness. Record the selected timestamp and user-provided source video in `assets/SOURCES.md`; copy only the selected frame into the final evidence module. This preprocessing makes no API call and requires `ffmpeg` plus `ffprobe`.

Use:

- `assets/templates/vertical.html` for the six 1080×1440 structures;
- `assets/templates/wechat.html` for six 2100×900 + 1080×1080 pairs.

Replace sample copy and evidence with the current task. Keep the unused structures only while exploring; before delivery, export only requested variants.

### 6. Write The Cover Prompt And Surface Copy

Fill the project root `COVER_PROMPT.md` after routing and research. Treat it as both the execution brief for Codex and a portable cover prompt for another design or image tool.

Complete these sections with task-specific content:

- original request, audience, targets, and author stance;
- selected route, routing reason, click promise, and one-sentence conclusion;
- selected preset, seed, generation engine, and identity/placement constraints from `STYLE_SELECTION.json`;
- exact title, highlight phrase, kicker, and subtitle per surface;
- evidence module and source boundary;
- six visible dimensions: subject, environment, visual character, light, camera/composition, and typography;
- assets, rights status, must-keep elements, and prohibited elements;
- a copyable final prompt.

Author each surface independently:

- Xiaohongshu 3:4: 1–2 deliberate lines with one highlighted phrase.
- Douyin 9:16: a separate vertical composition with title, face and primary evidence away from the right/bottom UI zones; never stretch 3:4.
- General 16:9: a separate left/right composition that retains this set's typography, palette and identity.
- WeChat 21:9: prefer one line of roughly 8–14 Chinese characters; allow two lines only at a semantic break.
- WeChat 1:1: derive a separate 4–10-character title. Do not crop or squeeze the 21:9 title.

State facts as facts, inferences as judgments, and personal practice in first person. Do not leave generic placeholders in the final `COVER_PROMPT.md`.

### 7. Compose The Evidence Module

Match evidence to the chosen route:

- release → official model card or release summary;
- tutorial → real UI/screenshot or clearly marked interface diagram;
- comparison → common-test matrix with comparable inputs;
- workflow → role/step flow with human checkpoints;
- official evidence → original document excerpt and three consequences;
- field recap → complete contextual photo and up to three first-person takeaways.

For `original`, keep the portrait lower-left on 3:4 and 21:9. Other presets may place it left or right as described in `STYLE_BRIEF.md`; user placement takes priority. The 1:1 companion defaults to pure typography unless a portrait is requested. Preserve identity, face, hand, microphone and action-relevant objects. Prefer a contextual rectangle over a poor cutout. Set `object-position` explicitly in HTML.

### 8. Render

Choose the engine recorded in `STYLE_SELECTION.json`:

- `original` / `editorial`: adapt the project HTML and use the existing renderer below. Add independently authored 9:16/16:9 nodes when requested.
- `atutun` / `gbro` / `oil` / `baoyu`: use the available native imagegen tool with inspected portrait references. Save each complete prompt before the call. Generate/check the first surface, then use that cover plus the original portrait for sibling ratios. Keep the original outputs and record actual dimensions. Do not replace these raster presets with HTML imitations or label PNGs as editable layered templates.

The remaining renderer commands apply to the HTML path.

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

Keep `data-text-safe` on fixed title and promise regions. The renderer rejects content whose measured text exceeds those safe areas instead of silently clipping it. Shorten or intentionally resize the copy when that check fails.

### 9. Review At Thumbnail Size

Before delivery:

- verify all PNG dimensions;
- inspect each requested ratio independently, including 9:16 and 16:9 when present;
- downsample to 360px width and check title, portrait, and evidence recognition;
- confirm no face, hand, UI label, or footer collision;
- confirm every number, version, date, ranking, and absolute claim has evidence;
- confirm WeChat 1:1 is a separately authored cover;
- keep only final outputs, editable source, real assets, and provenance after the user approves cleanup.

Show the rendered images after basic dimension, text and identity checks. Run optional heavy validation only when requested or needed to resolve a material concern.

Copy final images into the task project using ratio-specific names and provide clickable file/folder paths. For imagegen outputs, save `generation.json` with actual pixel dimensions, prompts, references, original tool-output paths and review results. When asked to open the covers, use the available authorized local viewer and verify that all requested images appear before claiming they are open; follow the delivery section in `references/style-presets.md`.

For a Claim-to-Pixel build, leave the status at `PENDING HUMAN SIGN-OFF`. A real reviewer—not the Agent—must inspect the facts, source locators, asset-rights CSV, editable HTML, and all three PNGs before invoking `signoff`. The sign-off binds the full non-signoff payload digest; any later content change requires a fresh review. Commit that reviewer record, then use `release-check` from a clean worktree. Do not sign on the user's behalf or describe a pending build as publish-ready.

## Non-Negotiables

- Do not fake official pages, screenshots, benchmarks, quotes, percentages, or release facts.
- Do not substitute a model's reputation for a real comparison.
- Do not make six variants that differ only by color.
- Do not stretch or mechanically crop between 3:4, 9:16, 16:9, 21:9, and 1:1.
- Do not randomly change style between ratios within a set, or randomize identity, claims, product names or unprovided personal experience.
- Do not call a requested pixel size an achieved resolution; verify the real image, and disclose any tool-imposed size or ratio limitation.
- Do not use a low-quality portrait cutout when the contextual photo is available.
- Do not publish web-sourced imagery without preserving provenance and surfacing rights uncertainty.
- Do not move a Claim-to-Pixel project past `PENDING HUMAN SIGN-OFF` without an identified human reviewer who completed the stated checks.
- Do not describe a recorded fixture as a live AI call; preserve `liveAiClaimed` and prompt provenance.
- Do not delete source photos or final files without explicit authorization.
