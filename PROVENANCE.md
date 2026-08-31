# Provenance and originality boundary

## What is original here

The originality claim for this repository is limited to concrete implementation, not the broad idea of “AI cover generation,” evidence checking, Swiss-style graphics, or multi-platform design.

`Claim2Cover` adds an independently implemented `Claim-to-Pixel` state contract to this repository:

- a three-state `fact / judgment / unknown` ledger;
- executable blocking of unsupported numeric and absolute title promises;
- three separately authored platform briefs;
- deterministic HTML/CSS rendering plus measured safe-area rejection;
- source, asset-rights, and Git-revision records;
- an explicit, payload-bound `PENDING HUMAN SIGN-OFF` → human review → clean-commit release transition.

These mechanisms are implemented in `scripts/claim-to-pixel.mjs`, tested by `scripts/test-claim-to-pixel.mjs`, and replayed by `scripts/demo-claim-to-pixel.mjs`.

## Authorship record

- Repository owner: chose the product direction, publication constraints, and visual identity; supplied or authorized the owner portrait assets documented in `NOTICE.md`.
- AI coding agents: assisted with implementation, tests, documentation, and reproducible contest packaging under the owner's direction.
- Git history: canonical record of file-level changes and public commit boundaries.

The stable public foundation before Claim2Cover is commit `516d57c85a0edb1678328960640bede4eaafabf3` (`Initial public release of Xiaowei AI Cover Skill`). Version 0.3 work already present in the owner's worktree was preserved and incorporated; it was not discarded or rewritten from history.

The recorded contest fixture declares `liveAiClaimed: false`. Its prompt and responsibility split are preserved in `contest/demo/PROMPT.md`. A future live Skill run may be described as live only when the corresponding input, run trace, and output are retained.

## Visual inspiration boundary

Early visual research acknowledged the Swiss social-card idea in [`op7418/guizang-social-card-skill`](https://github.com/op7418/guizang-social-card-skill). The current templates, contract, renderer integration, class names, data schema, tests, and demo were implemented in this repository. This is an inspiration credit, not a claim that the source project endorsed or originated Claim2Cover.

## What this file does not claim

- It does not claim the product category or visual style is globally novel.
- It does not erase third-party trademarks or portrait reuse boundaries.
- It does not turn an AI draft into verified truth or human approval.
- It does not treat a passing renderer as proof that a public post is lawful or factually correct.

See `THIRD_PARTY_NOTICES.md`, `ASSET_RIGHTS.csv`, `SOURCES.md`, and `NOTICE.md` for the complementary source and rights records.
