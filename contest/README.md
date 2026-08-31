# Claim2Cover｜VibeLab submission pack

Track: `VibeVision`

This folder is a ready-to-review submission pack. It does not itself publish or claim human approval.

## Reproduce the demo

```bash
npm run demo:claim2cover -- /tmp/claim2cover-demo
```

The command must:

1. run `claim-to-pixel.invalid.json` and capture a non-zero FAIL;
2. build the corrected recorded fixture;
3. render independent 1080×1440, 2100×900, and 1080×1080 PNGs;
4. generate a 1920×1080 recording board, logs, status JSON, and shot list;
5. stop at `PENDING HUMAN SIGN-OFF`.

The target directory must not already exist. The command never overwrites it.

## Ready-made materials

- `WEIBO_DRAFT.md` — publication draft with accuracy boundaries.
- `DEMO_SCRIPT_75S.md` — 72-second spoken script.
- `demo/PROMPT.md` — exact recorded semantic prompt and Agent/validator split.
- `demo/claim-to-pixel.invalid.json` — intentional unsupported “10×” title.
- `demo/claim-to-pixel.json` — corrected three-platform fixture.
- `demo/artifacts/` — frozen logs, JSON, HTML, PNGs, and recording board after generation.

## Accuracy boundary

The included fixture is a stable replay, not a live model call: `liveAiClaimed:false`. The AI/Agent role is semantic classification and authoring three briefs. The CLI role is deterministic validation, rendering, and state recording. Submission copy must keep that distinction.

Before publication, a real human must review `FACTS.md`, `SOURCES.md`, `ASSET_RIGHTS.csv`, editable HTML, all PNGs, the Weibo copy, and any newly recorded live Skill run.
