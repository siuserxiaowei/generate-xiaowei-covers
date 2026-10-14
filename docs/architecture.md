# Architecture

## Design principle

The system separates Agent semantic judgment, deterministic contract validation/rendering, and human release authority.

```mermaid
flowchart LR
    A[Source / topic] --> B[Reader promise + factual copy]
    B --> C[Complete concepts + art direction]
    C --> D[COVER_PLAN compilation]
    D --> E[Per-ratio generation prompt + real references]
    E --> F[Actual generation / authored HTML]
    F --> G[Full image + thumbnail inspection]
    G --> H[Actual dimensions + provenance gate]
    H --> I[Local deliverables]
```

The layers below retain historical HTML/Claim-to-Pixel components alongside the v2 planning and output gates.

## Layers

### Instruction layer

- `SKILL.md` defines the end-to-end behavior and non-negotiable rules.
- `references/input-schema.md` turns loose user input into normalized fields.
- `references/content-routing.md` selects the evidence structure.
- `references/brand-system.md` defines surface, portrait, typography, and asset rules.
- `references/claim-to-pixel-contract.md` defines the public claim ledger, platform briefs, eight executable gates, and sign-off state machine.

### Template layer

- `assets/templates/vertical.html` contains six 1080×1440 route nodes.
- `assets/templates/wechat.html` contains six independent 2100×900 + 1080×1080 pairs and six pair-preview nodes.
- Every deliverable root uses `data-export` and a stable `data-file` name.

### Asset layer

- `assets/portrait/` contains the default contextual and original portraits.
- `assets/brand/` contains internal prototype brand markers.
- Generated projects reserve `assets/evidence/` for selected screenshots, video frames, model cards, and source documents.
- `assets/SOURCES.md` is the visual-asset provenance ledger.
- `assets/COVER_PROMPT.template.md` becomes the project-level creative brief and portable cover prompt.
- `assets/FACTS.template.md` becomes a project-level `FACTS.md`.

### Runtime layer

- `scripts/new-cover-project.mjs` creates a non-overwriting project scaffold and validates all bundled asset references before making the target directory.
- `scripts/extract-video-frames.mjs` samples a local video into timestamped JPEG candidates, a contact sheet, a machine-readable manifest, and a review ledger without API calls.
- `scripts/render-covers.mjs` selects export nodes, waits for fonts and images, renders PNG files, and verifies output dimensions.
- `scripts/render-covers.mjs` also rejects text that exceeds an explicitly marked `data-text-safe` region.
- `scripts/claim-to-pixel.mjs` validates recorded Agent briefs, title evidence, sources, asset rights, Git state, and sign-off before generating contract artifacts and invoking the renderer.
- `scripts/demo-claim-to-pixel.mjs` records a real FAIL→PASS trace, three PNGs, status JSON, and a 1920×1080 recording board from a stable `liveAiClaimed:false` fixture.
- `scripts/validate-repo.mjs` checks repository structure and template invariants without external packages; `scripts/test-e2e.mjs` creates both project types and renders all four production/review dimensions.

## Rendering fallback

```text
Installed Playwright available?
├── yes → Playwright locator screenshots
└── no  → local Chrome + DevTools Protocol
```

Both paths:

- disable animation and transitions;
- reset export alignment to the top-left;
- expand the viewport to the largest selected node;
- wait for images and fonts;
- verify PNG dimensions after capture.
- reject marked title or promise regions whose measured content exceeds their safe area.

## Selection model

New requests use COVER_PLAN v2. The Agent chooses the reader promise, focal subject, human/object interaction, complete art direction and per-ratio composition. build-cover-plan validates count, assets and declared composition collisions; it compiles complete prompts and initializes a planned generation record. It does not generate images or certify factual copy.

After a real generation call, validate-cover-output reads actual PNG/JPEG dimensions and checks target ratio, source transforms, inspection completeness and observed cross-item composition fields. It cannot perform face recognition or determine aesthetics from pixels; the Agent must view full-size images and thumbnails. Style IDs and string-DNA distances are candidate metadata only.

single defaults to one direction; style_pack respects explicit alternative count; series retains an explicitly requested style. Existing selection files and HTML fixtures remain backward-compatible, not the default structure of every generated cover.

## Trust boundary

The renderer validates geometry and files; the Claim-to-Pixel contract validates the completeness and internal consistency of recorded evidence. Neither proves that an external fact or legal conclusion is correct.

Those remain explicit publication gates:

- facts and claims → `FACTS.md`;
- copy, composition, and visible design decisions → `COVER_PROMPT.md`;
- visual assets and terms → `assets/SOURCES.md`;
- personal stance and experience → user confirmation;
- public release → human review at thumbnail size.

Passing builds remain `PENDING HUMAN SIGN-OFF`. The CLI records a human transition only when an identified reviewer supplies the explicit confirmation phrase; `release-check` additionally requires the signed manifest to be committed in a clean worktree.

## Future editor contract

The next architectural step is a normalized editable `cover.json` that complements, rather than replaces, the Claim-to-Pixel release contract. A future web layer should not fork the route logic, evidence policy, or sign-off state machine.
