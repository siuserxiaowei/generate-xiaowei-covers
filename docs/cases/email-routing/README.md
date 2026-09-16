# 案例：邮箱地址不等于发信能力

[全部案例](../README.md)

**任务结果：** 将“更多地址、独立账号、更多发送”三个不同需求转换为一张决策型公众号横版封面，并为方版重新缩短标题、删减信息。

## 输入与判断

原任务要求润色一份作者提供的草稿、排版并生成对应封面。原稿的主张是“邮箱数量可以增加入口，但不能替代投递信誉”。工作流选择 `workflow` 路由，把论点呈现成选择路径；私有草稿链接在公开副本中移除。

## 同一方法如何适配另一主题

| 决策 | 实际实现 |
|---|---|
| 从论点中提取结构 | 三条路径：更多地址、独立账号、更多发送 |
| 区分事实与编辑总结 | 右侧标注“选择路径（示意）”，不称为某厂商的官方流程 |
| 横版保留解释 | 标题“邮箱多，不等于发得出去”，搭配副标题、人物和三条路径 |
| 方版重新写标题 | “邮箱 ≠ 发信能力”，以短标题表达核心观点，不机械裁切横版 |
| 限制不必要承诺 | 不在封面中写平台配额、价格、投递率或具体退信数据 |

![配对检查](pair-preview.png)

[横版 2100×900](21x9.png) · [方版 1080×1080](1x1.png) · [配对图 1944×620](pair-preview.png)

## 可复核材料与重渲染

[提示词](COVER_PROMPT.md) · [历史事实记录](FACTS.md) · [可编辑 HTML](cover.html) · [来源及整理说明](SOURCE.md)

```bash
node scripts/render-covers.mjs docs/cases/email-routing/cover.html /tmp/claim2cover-email-review --only workflow
```

请使用新的输出目录，避免直接渲染覆盖同名 PNG。案例自动化测试使用临时目录。

这组材料证明封面制作流程被复用于另一个真实主题；不能证明发信系统经过部署、投递率提升或文章已获得任何传播效果。

**Reusable outcome:** turn an abstract distinction into a labeled decision diagram, then author a separate square headline. The workflow, evidence records, and rendering interface are reused; the editorial structure and composition follow the new topic.
