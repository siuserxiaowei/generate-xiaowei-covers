# Claim-to-Pixel 状态契约

这份参考只在需要制作可公开发布、涉及数字或绝对化承诺、或同时输出 3:4 / 21:9 / 1:1 的封面时读取。普通内部草图仍可直接使用原有 `COVER_PROMPT.md` 工作流。

## 契约解决什么

`Claim-to-Pixel` 把“封面看起来不错”改成可执行状态机：

```text
原始材料
  → fact / judgment / unknown 主张台账
  → AI 为三个发布面分别写 brief
  → 语义门（来源、标题承诺、素材权利）
  → 确定性 HTML + PNG
  → 几何门（data-text-safe 实测）
  → PENDING HUMAN SIGN-OFF
  → 人工核对后签核
  → clean commit release-check
```

系统不会把“AI 写出来了”当成“事实已经成立”，也不会把“PNG 成功导出”当成“允许公开发布”。

契约还要求 `aiDraft` 明确拆分两种角色：Agent 负责语义判断、主张分类和三平台 brief；本地 CLI 负责确定性校验与渲染。固定演示 fixture 使用 `liveAiClaimed: false` 并指向保留原始提示的 `promptSource`，不能包装成实时模型调用。

## 最小命令

```bash
node scripts/claim-to-pixel.mjs validate ./claim-to-pixel.json

node scripts/claim-to-pixel.mjs build \
  ./claim-to-pixel.json \
  ./claim2cover-build
```

`build` 通过时会生成：

- `claim-ledger.json` 与 `FACTS.md`；
- `briefs/xiaohongshu.json`、`briefs/wechatWide.json`、`briefs/wechatSquare.json`；
- `SOURCES.md` 与 `ASSET_RIGHTS.csv`；
- 三个独立发布面的可编辑 `cover.html`；
- `png/` 下 1080×1440、2100×900、1080×1080 三张 PNG；
- `CONTRACT_REPORT.json`、`STATUS.md` 与真实渲染日志。

默认状态仍是 `PENDING HUMAN SIGN-OFF`。这不是错误，而是有意保留的人类责任边界。

## 八道门

| Gate | 可执行判断 |
|---|---|
| `schema` | 版本、项目 ID、发布意图等基础字段有效 |
| `claim-ledger` | 至少各有一条 `fact`、`judgment`、`unknown`；未知主张不可上封面 |
| `sources` | 已验证事实有来源；仓库来源必须真实存在；URL 必须为 HTTPS |
| `title-truth` | 标题引用已登记主张；数字和绝对词必须由已验证事实逐词支持 |
| `independent-briefs` | 3:4、21:9、1:1 标题与布局意图不能机械复用 |
| `asset-rights` | 公开成品不得包含 `unverified` 素材；许可或商标素材必须有来源 |
| `safe-areas` | 静态字符上限先检查；渲染器再用 `data-text-safe` 检查真实 DOM 溢出 |
| `human-signoff` | 签核前保持 pending；签核后必须记录审阅者、时间、说明、确认短语，以及覆盖全部非签核字段的 payload SHA-256 |

## 主张台账

每条主张只有三种类型：

- `fact`：外部世界或可复现代码行为；只有 `status: verified` 且具有来源时才能支持标题中的数字、版本、排名或绝对词。
- `judgment`：作者或 AI 基于材料形成的观点；可以进入标题，但不能伪装为官方事实。
- `unknown`：尚未核实、候选假设或营销冲动；必须使用 `status: unverified` 与 `coverAllowed: false`，保留在台账中但不进入标题。

已验证事实可用 `titleTokens` 精确声明它能支持的高风险词。例如事实文本确实包含“3 种画幅”，才可列出 `"3种画幅"`。脚本会阻止不在事实文本中的 token。

## 三个平台 brief

`platforms` 必须同时有：

| Key | Surface | 生产尺寸 | 静态标题上限 |
|---|---|---:|---:|
| `xiaohongshu` | `3:4` | 1080×1440 | 18 字 |
| `wechatWide` | `21:9` | 2100×900 | 14 字 |
| `wechatSquare` | `1:1` | 1080×1080 | 10 字 |

每个 brief 记录：

- `authorship: ai-draft`：明确这是 AI 草案，不是人工确认；
- `title` 与人工断行后的 `titleLines`；
- `promise`；
- 唯一的 `layoutIntent` 与证据模块说明；
- 支持标题的 `headlineClaimIds`；
- 单一十六进制强调色。

三种标题和 `layoutIntent` 必须不同。方图不是横图裁切，横图也不是竖图压扁。

## 失败门演示

仓库提供一个有意失败的 fixture：

```bash
node scripts/claim-to-pixel.mjs validate \
  contest/demo/claim-to-pixel.invalid.json
```

其中“全网唯一封面效率保证提升 10 倍”引用 `unknown_ten_x`，同时包含未被事实认证的绝对词和数字，且超过 21:9 的静态标题上限。命令必须非零退出并至少报告：

- `CTP_TITLE_UNVERIFIED`；
- `CTP_TITLE_PROMISE_UNVERIFIED`；
- `CTP_TITLE_LENGTH`。

修复版把标题降级为“主张先过证据门”，并引用 `judgment_evidence_first`。它可进入渲染，但仍停在人工签核前。

## 人工签核与发布检查

只有真实审阅者完成事实、来源、素材权利、三张 PNG 和缩略图检查后，才运行：

```bash
node scripts/claim-to-pixel.mjs signoff ./claim-to-pixel.json \
  --reviewer "审阅者姓名" \
  --note "已核对事实、素材权利和三个发布面" \
  --confirm reviewed-facts-rights-previews
```

脚本只更新 `humanSignoff`，不会代替审阅者做决定，也拒绝覆盖已有签核。它同时写入 `approvedPayloadSha256`：该摘要覆盖项目、AI 草案来源、主张、来源、三平台 brief 与素材权利等全部非签核字段。签核后任一相关字段被改动，`validate` 和 `release-check` 都会以 `CTP_SIGNOFF_PAYLOAD_CHANGED` 阻断，必须恢复 pending 并重新人工复核。随后提交签核，并在 clean worktree 运行：

```bash
node scripts/claim-to-pixel.mjs release-check ./claim-to-pixel.json
```

`release-check` 同时要求八道内容门通过、人工签核存在、Git 仓库可识别且 worktree 干净。这样公开成品能对应一个明确 commit，而不是无法复现的工作区状态。

## 素材权利状态

允许值：

- `owned`
- `generated-owned`
- `licensed`
- `public-domain`
- `trademark-context-only`
- `unverified`

`licensed`、`public-domain` 与 `trademark-context-only` 必须引用来源。`publicationIntent: public` 时，任何 `unverified` 素材都会阻塞构建。

演示 fixture 只使用仓库生成的排版、文字和几何，不嵌入人物、Logo 或外部图片。这缩小了演示的权利边界，但不代表其他项目可跳过素材审查。
