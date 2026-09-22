---
name: generate-xiaowei-covers
description: Generate Xiaowei personal-IP covers from topics, scripts, links, photos, screenshots or video. Separate WeChat article briefs from video/social covers, choose visual style from content and references, and generate independently composed ratios with recognizable identity and factual sources. Use for 小伟封面、视频封面、公众号封面、真人大字封面、封面提示词 or Claim2Cover.
---

# Claim2Cover | Generate Xiaowei Covers

Turn a topic, link, article, screenshot, video, or photo into a credible cover package. Keep one entry point with separate public-social and article briefs. Xiaowei personal-IP covers always show a recognizable version of Xiaowei; the identity stays consistent while pose, action, scale, position, scene, palette and composition change with the topic. Do not reuse the rejected fixed blue studio template. Other channels and explicit style experiments retain the seven legacy presets.

For “小伟内容”, multi-platform copywriting, or “出整套” including copy, use the installed `xiaowei-content` entry (bundled at `skills/xiaowei-content/SKILL.md`) to prepare the text first, then return here for images. Cover-only requests stay here. When called from that entry, use its selected copy and content revision; do not route back to it or invent a second topic.

## Read The Relevant References

- For Xiaowei video/social series, read `references/series-cover.md` first. It overrides legacy per-topic style switching and original-photo collage defaults. “随机生成” means variation within this series, not random preset selection.

- For any Xiaowei real-person cover, read `references/identity-and-pose.md`: it maps the inspected local photos and the user’s default of fixed identity with content-driven pose changes.

- Read `references/channel-routing.md` before selecting a style or portrait: article and video/social covers serve different viewing contexts.
- Read `references/impact-cover.md` for bold outlined type, presenter cutouts and contextual collage like the user’s video-cover reference.

- Read `references/input-schema.md` when normalizing a loose request or deciding whether user input is sufficient.
- Read `references/content-routing.md` before choosing one of the six content structures.
- Read `references/brand-system.md` before composing, cropping the portrait, or adapting across ratios.
- Read `references/style-presets.md` for preset selection, HTML/imagegen routing, and portrait/landscape defaults; it takes precedence over legacy original-style layout defaults.
- Read `references/inspiration-playbook.md` when the user provides design sites, moodboards, screenshots, or asks for a more distinctive visual direction. Extract Design DNA before choosing a preset.
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
- portrait: `portrait_required: true` for Xiaowei personal-IP covers. Use the inspected local reference set in `references/identity-and-pose.md`. Default to `pose_mode: content_driven`: lock recognizability, choose a topic-relevant pose, and allow removal of the microphone. Use `source_locked` only for documentary evidence or explicit pose preservation;
- visual style: video series defaults to `series`; keep identity and recognizable bold-type/collage language across episodes. Choose palette, layout, scenes, poses and objects from each topic; no fixed studio, placement or series masthead. For other channels or explicit cross-style experiments, choose the appropriate preset and record the reason;
- portrait mode for video series: `generated_identity`; photos are identity-only references, never pasted source images. Regenerate the person and topic scene; read `references/series-cover.md`;
- portrait placement: follow the visual focus, content route and explicit user placement; position is intentionally variable, and the same recognizable person must remain visible across all surfaces;
- targets: follow the user's platforms; without platform context treat the work as public social content and use 3:4 + 9:16; “横竖都要” adds 16:9; only an explicit WeChat request adds 21:9 + independent 1:1;
- output: PNG plus editable HTML for HTML presets, or full prompts/reference assets/generation records for imagegen presets;
- variants: one set by default; for series alternatives keep identity/visual language and vary topic-relevant palette, composition, scenes and poses; distinct presets require an explicit cross-style request.
- visual focus: choose one first visual focus—title, person, product/interface, process, result, or story scene. Do not let style choice silently decide the subject hierarchy.
- person presence: the person remains visible even when title, product or process is the first visual focus; never reduce the creator to an optional tiny avatar.
- signature detail: choose at most one topic-relevant static cue derived from interaction or motion inspiration, such as a reveal, path, progress, layer, cursor, or state change.

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

Select the channel and content-driven composition from `references/channel-routing.md` before the visual preset. The content route and visual preset are separate choices. A Codex, Doubao, Qwen, WorkBuddy, or personal-story topic can use any preset while keeping its own evidence and exact copy.

### 4.1 Distill Visual DNA

When references or design-inspiration sites are provided, read `references/inspiration-playbook.md` and record six decisions in `COVER_PROMPT.md`: hierarchy, composition, typography, palette/material, density/rhythm, and one signature detail. Treat the reference as `visual_language_only`; never copy its person, wording, logo, screenshot, or exact layout. Use the selected visual focus to decide what becomes the first, second, and third visual read.

### 5. Create A Project

Resolve this installed Skill's absolute directory as `SKILL_DIR`, then run one of:

```bash
node "$SKILL_DIR/scripts/new-cover-project.mjs" <target-dir> vertical
node "$SKILL_DIR/scripts/new-cover-project.mjs" <target-dir> wechat
```

The script copies the editable template, default portrait, cached prototype brand assets, `COVER_PROMPT.md`, `assets/SOURCES.md`, `FACTS.md`, the applicable license, and creates `output/`.

First separate article and video/social tasks into sibling folders with independent copy and visual plans. Then select a style **once per set** based on the brief. Pass the actual requested ratios; the default is 3:4 + 9:16:

```bash
node "$SKILL_DIR/scripts/select-cover-style.mjs" <target-dir> --style series --ratios 3:4,9:16
# Explicit style / horizontal and vertical example:
node "$SKILL_DIR/scripts/select-cover-style.mjs" <new-target-dir> --style 阿囤囤 --ratios 3:4,9:16,16:9
```

Read the generated `STYLE_BRIEF.md`; `STYLE_SELECTION.json` locks the preset, seed, source attribution, engine and surface plans. Reuse this record for retries and sibling ratios. Use a new project for a new selection. New projects require an explicit `--style ID`; `--style random` remains available only on user request. Existing records still replay without a style argument. The project generator's legacy HTML is a starting skeleton, not the completed output of the selected preset.

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
- identity_primary, identity_support and their roles; pose_mode and the specific topic-driven pose_brief;
- for video series: portrait_mode=generated_identity, series profile/references (visual_language_only), variation_brief, and previous episodes used to avoid repetition;
- portrait_required=true, identity recognizability checks, and the reason for the chosen pose and position;
- visual focus, Design DNA, and the single signature detail (or an explicit `none`);
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

For `series`, the main visual combines a visible, recognizable Xiaowei with a topic-relevant object, scene or generated work/concept display. The person may be the first or second visual read, but is never omitted or reduced to an incidental avatar. Evidence still constrains claims; do not present invented UI, tests or scenes as real. Original documentary photos are not inserted into the series unless explicitly requested.

For evidence-oriented legacy modes, match evidence to the chosen route:

- release → official model card or release summary;
- tutorial → real UI/screenshot or clearly marked interface diagram;
- comparison → common-test matrix with comparable inputs;
- workflow → role/step flow with human checkpoints;
- official evidence → original document excerpt and three consequences;
- field recap → complete contextual photo and up to three first-person takeaways.

For `original`, keep the portrait visible on every requested surface and place it according to the visual focus and topic; do not assume lower-left. Other presets may place it left, right, center or within a contextual scene as described in `STYLE_BRIEF.md`; user placement takes priority. The 1:1 companion also includes the person for Xiaowei personal-IP work and is independently recomposed. Preserve identity; in source_locked mode also retain the original pose and action-relevant objects. In content_driven mode specify the new pose and only its required objects; do not automatically preserve the microphone. Prefer a contextual rectangle over a poor cutout. Set `object-position` explicitly in HTML.

### 8. Render

Choose the engine recorded in `STYLE_SELECTION.json`:

- `original` / `editorial`: adapt the project HTML and use the existing renderer below. Add independently authored 9:16/16:9 nodes when requested.
- `series` / `atutun` / `gbro` / `oil` / `baoyu` / `impact`: use the available native imagegen tool with inspected portrait references. Save each complete prompt before the call. Generate/check the first surface, then use that cover plus the original portrait for sibling ratios. Keep the original outputs and record actual dimensions. Do not replace these raster presets with HTML imitations or label PNGs as editable layered templates.

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
- for a video series, compare across episodes: recognizable identity and bold-type/collage language, distinct topic-driven palette/layout/scene, meaningful gestures/objects, and no pasted source-person photo or repeated fixed template;
- confirm no face, hand, UI label, or footer collision;
- confirm the person is visibly present in every requested surface and recognizable against the identity reference;
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
