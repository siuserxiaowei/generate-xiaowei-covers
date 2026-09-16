# 案例：WorkBuddy AI 日报封面

[全部案例](../README.md)

**任务结果：** 将一篇 AI 日报工作流教程整理成 2100×900 横版、1080×1080 独立方版和 1944×620 配对检查图。这里展示原任务的 v2 输出，不是本次申请新生成的宣传图。

## 输入与判断

原始任务要求使用 `generate-xiaowei-covers` 为《用 WorkBuddy 做每日 AI 资讯》文章制作公众号封面。文章将 AIHot、RSS、GitHub Trending、arXiv 四路资讯组织成检索、去重、核验和文件交付流程。

工作流选择 `workflow` 内容路由：读者需要看清工具分工，而不只是看到几个产品名称。右侧画面明确标记“流程示意”，不冒充 WorkBuddy 的真实 UI。

## 从同一输入到不同画幅

| 画幅 | 文案与构图 | 原始交付 |
|---|---|---|
| 21:9 | “AI 新闻太多？让 WorkBuddy 帮你筛”；左侧标题与人物，右侧四路输入、处理步骤和日报输出 | [2100×900 PNG](21x9.png) |
| 1:1 | “AI 新闻太多？WorkBuddy 帮你筛”；删去小字和复杂流程，以主题识别为主 | [1080×1080 PNG](1x1.png) |
| 配对检查 | 同时检查两个独立构图，不作为第三个发布平台 | [1944×620 PNG](pair-preview.png) |

![配对检查](pair-preview.png)

## 可复核材料

- [COVER_PROMPT.md](COVER_PROMPT.md)：内容路由、准确文案、六维视觉规格、素材和禁止承诺。
- [FACTS.md](FACTS.md)：原任务的编辑核对记录；不等同于上游软件功能测试。
- [cover.html](cover.html)：保留该任务三个导出节点的可编辑实现。
- [SOURCE.md](SOURCE.md)：公开整理差异、素材归属和原文件摘要说明。

从仓库根目录重渲染到新目录：

```bash
node scripts/render-covers.mjs docs/cases/workbuddy-ai-daily/cover.html /tmp/claim2cover-workbuddy-review --only workflow
```

输出目录应使用尚未存在的新路径；直接调用渲染器会写入同名 PNG。自动化 `npm run test:cases` 为每次运行创建独立临时目录。

## 能证明与不能证明的事

这组文件证明作者曾针对真实文章完成主题判断、工作流示意和独立画幅交付。不能据此宣称日报已自动运行、定时发送已经开通、四路来源零遗漏，或文章取得了特定阅读量。

**Reusable outcome:** an article-to-cover workflow with explicit illustration labeling, separate platform compositions, an editable source, and provenance records. The historical task predates the Claim-to-Pixel fixture and is not retrospectively described as passing its gates.
