> 历史记录（2026-08-27），2026-09-16 整理公开。路径与私有文档链接已脱敏；原记录中的 verified 表示当时的编辑核对，不代表本次进行了上游功能实测。整理差异见 SOURCE.md。

# Cover Fact Ledger

核验日期：2026-08-27

## Publication gate

- [x] 成品中没有样例事实或占位文案。
- [x] 成品没有版本、价格、排名、发布日期或绝对化能力结论。
- [x] 所有工作流描述均来自用户提供的文章；编辑化流程图已标为“流程示意”。
- [x] 使用 WorkBuddy 官方 Logo 作产品识别；其余产品与 Skill 名称仅作说明性文字。
- [x] 人物照片使用状态已记录在 `assets/SOURCES.md`。

## Claims

| ID | Output / route | Exact cover copy | Type | Status | Source | Checked at | Evidence location / note |
|---|---|---|---|---|---|---|---|
| F-001 | 21:9 / workflow | AI 新闻太多？让 WorkBuddy 帮你筛 | editorial | verified | 用户文章 | 2026-08-27 | 对原文“信息分散、逐个浏览耗时、容易重复”的痛点与 WorkBuddy 筛选整理任务的封面化表达 |
| F-002 | 21:9 / workflow | 四路信息源汇总、去重、核验，最后生成一份 AI 日报 | editorial | verified | 用户文章 | 2026-08-27 | AIHot、RSS、GitHub Trending、arxiv-paper-searcher 的任务描述及输出要求 |
| F-003 | 21:9 / workflow | 4 路信息源：AIHot、RSS Monitor、GitHub Trending、arXiv Papers | fact | verified | 用户文章 | 2026-08-27 | 原文短提示词明确列出四个 Skill；封面为便于阅读对名称做大小写规范化 |
| F-004 | 21:9 / workflow | 检索 / 去重 / 核验 | editorial | verified | 用户文章 | 2026-08-27 | 原文要求查询过去 24 小时、合并重复事件、优先官方原始链接，并说明完整版本增加核验 |
| F-005 | 21:9 / workflow | MARKDOWN / HTML / PNG | fact | verified | 用户文章 | 2026-08-27 | 原文第 6 项：先生成 Markdown、单页 HTML 和 PNG，不要发送 |
| F-006 | 21:9 / workflow | 原始链接与发布时间 | fact | verified | 用户文章 | 2026-08-27 | 原文第 4 项：每条包含标题、摘要、发布时间、来源和原始链接 |
| F-007 | 21:9 / workflow | 认识界面 → 安装 Skill → 跑通第一份日报 | editorial | verified | 用户文章 | 2026-08-27 | 对正文教学顺序的封面级压缩表达，不表示已经设置自动发送 |
| F-008 | 1:1 / workflow | AI 新闻太多？/ WorkBuddy 帮你筛 | editorial | verified | 用户文章 | 2026-08-27 | 教程痛点与结果的短标题，不含额外事实主张 |
| F-009 | 21:9 / workflow | 流程示意 | illustration | verified | 本封面 | 2026-08-27 | 右侧卡片为文章步骤的编辑化示意，不冒充 WorkBuddy 产品界面 |
| F-010 | 21:9 + 1:1 / workflow | WorkBuddy 官方 Logo | brand asset | verified | WorkBuddy 官方站 | 2026-08-27 | `assets/brand/workbuddy-official.svg`，由官方站静态资源下载，保持原始比例和颜色 |

无待核实项。
