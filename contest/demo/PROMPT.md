# Demo fixture provenance

## Status

- `liveAiClaimed: false`
- Mode: `recorded-agent-draft-fixture`
- Created for: deterministic Claim-to-Pixel regression and contest recording

This fixture is not the transcript of a live model API call. It records a stable Agent-authored semantic draft so anyone can replay the same contract and renderer locally. A real `$generate-xiaowei-covers` run performs the semantic step from the user's current material; the CLI itself never claims to be a model.

## Semantic drafting prompt

```text
把“封面标题不能超过证据”整理成 Claim2Cover 演示。

请先把输入拆成 fact / judgment / unknown：
- 已实现的 CLI 能独立输出 3:4、21:9、1:1；
- 我的观点是标题承诺要先过证据门；
- “效率提升 10 倍”没有测量数据，只能标为 unknown，不能上标题。

然后为小红书 3:4、公众号 21:9、公众号 1:1 分别写标题、断行、内容承诺、布局意图和证据模块。三种画幅不得复用同一标题或同一构图。只用仓库生成的文字与几何，不使用外部图片。最终保留 PENDING HUMAN SIGN-OFF。
```

## Responsibility split

### Agent semantic work

- Interpret the input and classify each claim.
- Decide whether a sentence is fact, judgment, or unknown.
- Draft three distinct titles, promises, evidence modules, and layout intents.
- Downgrade or remove unsupported marketing language.

### Deterministic local work

- Validate schema, source locators, claim references, risky title tokens, asset-rights states, and static copy limits.
- Generate reproducible JSON/Markdown/CSV/HTML artifacts.
- Render three exact-size PNGs and measure `data-text-safe` DOM regions.
- Record the Git commit/worktree state.
- Block release until a human signs and a clean commit passes `release-check`.

The contest copy must describe this fixture as a replayable recorded draft, not as a live AI call. A separately recorded real Skill forward test may be described as live only when its run evidence is retained.
