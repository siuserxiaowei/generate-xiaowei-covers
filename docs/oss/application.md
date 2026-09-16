# 可直接粘贴的申请文案

[详细说明](README.md) · [官方表单](https://openai.com/zh-Hans-CN/form/codex-for-oss/)

准备日期：2026-09-16。下列文案尚未提交；中英文是备选版本，每栏选一种粘贴，不要将两种一起放入。

## 固定信息

- GitHub 用户名：`siuserxiaowei`
- 仓库 URL：`https://github.com/siuserxiaowei/generate-xiaowei-covers`
- 角色：主要维护者 / Lead maintainer
- 姓名和 ChatGPT 账户邮箱：在官方表单填写本人信息，不放进公开仓库。
- OpenAI 组织 ID：如表单要求，从自己的 API 组织设置取得；不要用 GitHub 组织名代替。
- API 额度：有下面明确的维护计划，可表达兴趣。
- Codex Security：仅在希望接受相关审查时勾选，不声称已经获得访问权限。

## 为什么这个仓库符合要求？

英文（492 字符，上限 500）

```text
I maintain Claim2Cover, an AGPL-3.0 Codex Skill with a Node.js validation and rendering core. It turns articles into source-documented briefs and separate platform covers. The repo includes executable negative tests, CI, and two historical maintainer use cases with editable HTML and unchanged PNGs. It is early-stage, with no verified broad adoption. Its ecosystem value is a reusable pattern for auditable Agent outputs, separating semantic judgment, deterministic checks, and human review.
```

中文（204 字符，上限 500）

```text
我是 Claim2Cover 的主要维护者。项目采用 AGPL-3.0，将 Codex Skill 与 Node.js 校验、渲染工具结合，把文章转为有来源记录、按平台分别设计的封面。仓库提供可执行负例测试、CI，以及两组作者实际任务的可编辑 HTML 和原始 PNG。项目尚处早期，没有可验证的广泛采用数据；申请理由是为 Agent 生态提供可复用、可审查的交付流程，明确区分语义判断、程序校验与人工审阅。
```

## 你将如何使用 API 额度？

英文（493 字符，上限 500）

```text
I would use API credits for OSS maintenance: reproducing bugs, drafting patches and regression tests, reviewing changes, and evaluating Agent drafts on authorized, de-identified fixtures. Planned evaluations cover unsupported headline claims, source references and independent platform briefs. Runs would record model/prompt versions, usage and failures under a spending cap, with human review. Existing deterministic tests need no API; credits would not subsidize commercial cover production.
```

中文（158 字符，上限 500）

```text
我计划将 API 额度用于开源维护：复现问题、起草修复和回归测试、审查变更，并用获准使用且去身份化的输入评估 Agent 草稿。评估重点是无依据的标题承诺、来源引用和各平台 brief 的独立性；记录模型、提示版本、用量及失败样例，设置费用上限并保留人工审阅。现有确定性测试无需 API；额度不用于补贴商业封面制作。
```

## 还有其他需要说明的事项吗？

英文（495 字符，上限 500）

```text
I own the repository and maintain its workflow, validators, renderer, tests and documentation with AI assistance disclosed in PROVENANCE.md. Two historical personal tasks are documented in docs/cases; the recorded contract demo is labeled liveAiClaimed:false. Neither is presented as customer adoption or a productivity benchmark. The application dossier, maintenance plan and verification record are under docs/oss. Portrait and trademark rights are documented separately from the code license.
```

中文（175 字符，上限 500）

```text
我是仓库所有者，负责工作流、校验器、渲染器、测试与文档维护；AI 辅助开发分工记录在 PROVENANCE.md。docs/cases 保留两组历史自用任务；固定契约演示明确标注 liveAiClaimed:false，二者均不冒充客户采用或效率基准。docs/oss 提供详细申请说明、维护计划和验证记录。人物与商标素材的权利边界独立于代码许可证。
```

## 提交前最后核对

- 公开仓库和个人主页可访问；角色与实际维护记录一致。
- 数字、案例和测试范围与当前仓库保持一致，不把测试 fixture 写成客户案例。
- 如新增月下载量或使用人数，先提供统计口径与来源；当前没有这样的验证数据。
- 阅读官方条款后由本人提交。本材料不代表已申请、已获批或官方背书。

文案源数据在 [application-fields.json](application-fields.json)。`npm run verify:application` 检查每个语言版本的 500 字符上限及本页和源数据的一致性。
