# Claim2Cover：Codex for Open Source 申请说明

材料整理日期：2026-09-16。状态：**申请草稿，尚未提交；没有获得官方认可或资助的声明。**

[可直接粘贴的表单文案](application.md) · [工作流与维护任务](../maintainer-workflow.md) · [实际案例](../cases/README.md) · [验证记录](verification.md)

## 项目概述

Claim2Cover（仓库名 `generate-xiaowei-covers`）是一个面向内容创作者的开源 Codex Skill，结合本地 Node.js 校验与渲染工具，把主题、资料和文章转为有来源记录、按平台分别设计、可编辑和可检查的封面交付物。代码、文档和模板使用 AGPL-3.0；人物与第三方品牌素材另有明确使用边界。

项目解决的维护问题有三个：生成内容容易加入没有证据的数字承诺；同一图片机械裁切到不同平台容易丢失信息；只交图片缺少可复核的提示词、来源和修改记录。Claim2Cover 将这些问题拆为 Agent 判断、确定性检查和人工审阅三个环节。

## 为什么值得支持

项目规模仍小，申请依据是可复用实现与维护需求，而非未经证实的用户规模。

- **工作流可迁移。** 内容路由、brief、事实台账与素材记录可用于用户自己的文章和授权素材，不依赖作者的一张固定照片或单个选题。
- **检查可执行。** Node CLI、浏览器渲染和回归用例能实际拒绝部分错误，不只是文档中的“请谨慎”提醒。检查范围有明确边界。
- **制品可复核。** 两组作者实际任务保留了提示词、事实记录、可编辑 HTML、历史 PNG 和 SHA-256 清单；固定回归演示单独标记。
- **维护工作具体。** 包括跨画幅回归、错误标题复现、来源台账、浏览器兼容、用户输入脱敏和文档维护。Codex 的支持可以投入这些持续工作。

生态价值属于申请理由，不是独立评审已经认可的事实。它提供一种可研究、修改和复用的 Agent 交付范式：模型负责语义判断，程序负责有限而明确的验证，人负责最终发布决定。

## 已实现能力与证据

| 能力 | 可检查入口 | 证据边界 |
|---|---|---|
| 6 种内容路由和逐画幅 brief | [工作流文档](../maintainer-workflow.md)、Skill 与 references | 依赖 Agent 执行，不是纯脚本自动理解 |
| 8 个风格配置与选择记录 | [选择器及测试](../../scripts/test-style-selection.mjs) | 证明选择逻辑，不证明每个生图预设的视觉质量 |
| 独立 HTML 画幅和浏览器输出 | [端到端测试](../../scripts/test-e2e.mjs) | 检查尺寸与指定安全区域，不代替完整视觉审查 |
| Claim-to-Pixel 契约 | [实现](../../scripts/claim-to-pixel.mjs)、[测试](../../scripts/test-claim-to-pixel.mjs) | 核对来源声明和内部一致性，不自动证明外部事实 |
| 两组历史自用任务 | [WorkBuddy](../cases/workbuddy-ai-daily/README.md)、[邮箱决策](../cases/email-routing/README.md) | 证明历史复用，不证明外部用户采用；无完整模型调用日志 |
| GitHub Actions | [工作流文件](../../.github/workflows/validate.yml)、[运行记录](https://github.com/siuserxiaowei/generate-xiaowei-covers/actions/workflows/validate.yml) | 以目标提交的实际结论为准 |

## 实际案例：复用的是什么

**WorkBuddy AI 日报任务**从教程中提取四路信息源、检索去重核验和日报输出关系，右侧明确标注“流程示意”。横版保留完整解释，方版只保留独立短标题。没有声称已配置定时发送或完成日报产品的端到端测试。

**邮箱地址与发信能力任务**将文章论点转换为“更多地址 / 独立账号 / 更多发送”三条决策路径。它复用了 brief、来源记录、模板初始化和导出方式，但针对新主题重新安排文案和证据结构。两组案例各包含 3 张原样保留的历史 PNG，共 6 张。

**契约固定演示**用于回归维护：含“效率提升 10 倍”的未核实标题先失败，修正的 fixture 生成三画幅制品并保留待人工审阅状态。它没有实时调用模型，不与上述历史案例混算。

## 申请人的维护职责

申请人 `siuserxiaowei` 是仓库所有者和主要维护者，负责产品方向、使用规则、案例素材、代码变更审阅、测试与文档维护。项目采用 AI 辅助开发，贡献分工和设计启发记录在 [PROVENANCE.md](../../PROVENANCE.md) 中。

不把 AI 辅助隐藏为纯手工开发，也不把公开 API、通用概念或早期视觉启发声称为独创。没有证据支持“已有大量外部 PR 需要审查”，因此只将外部问题分诊和 PR 审查写作未来采用增长后的工作。

## API 额度用途与维护计划

拟将额度用于：

1. 对经过授权的测试输入生成候选修复和回归测试，帮助复现标题越界、文件保护和浏览器兼容问题。
2. 评估 Agent 对事实、判断、未知项的分类，以及标题引入无依据承诺的情况。
3. 比较不同模型与提示版本的结构化输出和独立画幅 brief，保存失败样例并人工核对。
4. 协助整理维护问题、审查候选改动和撰写与实际 diff 对应的发布说明。

未来评估应记录输入、模型/提示版本、用量、失败类型与人工结论，并设置费用上限。现有 `npm test` 是本地确定性测试，不依赖 API；不将正常商业制图消耗包装为开源维护费用。详细阶段计划见 [维护任务](../maintainer-workflow.md)。

## 当前规模与限制

2026-09-16 的 GitHub 查询显示本仓库为公开、0 Star、0 Fork，未发现公开 Issue 或 GitHub Release。提交历史包含多次迭代，公开新仓库的创建日期不能当作全部开发历史的起点。本次资料补充会产生新的维护提交，应以公开 Git 历史为准。

没有独立可验证的月活、下载量、阅读量或节省工时数据。克隆次数可能包含自动化和维护者操作，不用它推算用户人数。两组案例属于维护者自用，并且没有保留完整模型调用轨迹。当前生成图像路径的文字、人脸、审美与身份一致性仍需人工检查。

## English reviewer summary

Claim2Cover is an AGPL-3.0 Codex Skill with a local Node.js validation and HTML rendering core. It turns editorial topics into source-documented briefs and independently composed platform covers. The Agent handles interpretation and drafting; deterministic tools check recorded claims, selected title-risk patterns, assets, marked text-safe regions, output dimensions and review state. Humans retain factual, rights and publication review.

The repository contains executable negative tests, a clearly labeled recorded fixture, and two historical maintainer-owned tasks with editable HTML, curated records and six unchanged PNGs. These demonstrate reuse across topics, not third-party adoption or verified productivity gains. I seek support to maintain the validation/rendering code, reproduce bugs, add regression cases, and develop bounded API evaluations of semantic drafting. This is an early-stage project with no claimed broad adoption.

## 官方依据

- [申请表与资格说明](https://openai.com/zh-Hans-CN/form/codex-for-oss/)：公开 GitHub 账号和仓库、主要/核心维护者、使用情况或生态价值、持续维护证据；自由文本字段上限 500 字符。
- [项目说明](https://developers.openai.com/community/codex-for-oss)：Pro、开源维护 API 额度和有条件的 Security 支持。
- [项目条款](https://learn.chatgpt.com/docs/codex-for-oss-terms)：提交不保证入选；可能核验维护者身份和仓库控制权。

以上页面于 2026-09-16 核对。申请材料不包含账户邮箱、法定姓名或组织 ID；这些应由申请人在官方表单填写，不公开进仓库。
