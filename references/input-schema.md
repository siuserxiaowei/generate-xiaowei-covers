# 输入字段与规范化 Schema

本 Skill 应允许用户用一句话或一个链接启动，不要求用户先写完整需求表。执行端负责补齐可从上下文、官方来源或素材库安全获得的信息；只有缺失项会改变作者立场、引发事实风险或影响素材授权时才询问。

## 最小输入

至少提供以下二者之一：

- `topic`：主题、选题、文章标题草案或想解决的问题。
- `source_urls`：文章、公告、仓库、文档或其他原始材料链接。

建议但不强制提供：

- `targets`：发布平台和画幅；默认生成当前会话约定的平台。
- `stance`：作者最想表达的一句结论；涉及个人评价、复盘或争议判断时应由用户提供或确认。
- `required_assets`：必须使用的人物照片、产品截图、Logo 或其他素材。

最简单的自然语言输入可以是：

> Qwen 新版开源了，帮我做公众号首图和小红书封面。重点讲它支持图像和视频，官方资料你自己查，人物用默认照片。

## 规范化 JSON

内部执行时将自然语言整理为以下对象。除 `topic` 与 `source_urls` 至少一个存在外，其余字段均可缺省。

```json
{
  "topic": "string",
  "source_urls": ["https://example.com/original-source"],
  "targets": [
    {
      "platform": "xiaohongshu",
      "profile": "portrait_cover"
    },
    {
      "platform": "wechat_official_account",
      "profile": "article_cover"
    }
  ],
  "stance": "string or null",
  "content_route": "auto",
  "required_assets": [
    {
      "type": "portrait",
      "path_or_url": "/path/to/photo.jpg",
      "required": true,
      "placement": "bottom_left",
      "usage_rights": "user_owned"
    }
  ],
  "optional_assets": [],
  "must_include": ["Qwen", "开源"],
  "must_avoid": ["未经证实的性能排名"],
  "audience": "关注 AI 工具的中文创作者和开发者",
  "tone": "清晰、可信、有判断",
  "variants": 1,
  "research": {
    "allow_web_search": true,
    "official_sources_only_for_facts": true,
    "as_of": "2026-08-16"
  },
  "output": {
    "language": "zh-CN",
    "format": "png",
    "keep_editable_source": true,
    "create_contact_sheet": true,
    "cover_prompt": "COVER_PROMPT.md",
    "fact_ledger": "FACTS.md"
  }
}
```

## 字段说明

### `topic`

- 类型：字符串。
- 作用：描述内容对象、问题或候选标题。
- 可以很粗略，例如“Codex 接 DeepSeek 教程”。执行端应通过研究和正文材料把它规范化，但不能凭空补充用户立场。

### `source_urls`

- 类型：URL 数组。
- 作用：提供公告、GitHub、文档、文章、视频说明或数据来源。
- 多个链接应区分原始来源与二手参考；易变事实优先核对当前官方来源。
- 用户只给二手链接时，执行端应继续寻找其引用的原始材料。

### `targets`

- 类型：平台配置数组。
- 推荐枚举：
  - `xiaohongshu / portrait_cover`：竖版封面，通常导出 `1080×1440`。
  - `wechat_official_account / article_cover`：公众号文章横版首图，使用项目当前平台规格，关键标题与人物进入裁切安全区。
- 同一主题的横版和竖版是独立构图，不做机械裁切或拉伸。

### `stance`

- 类型：字符串或 `null`。
- 作用：作者最想让读者记住的一句话。
- 官方事实型内容可以为空，由执行端依据原始资料提炼中性结论。
- 个人体验、复盘、模型推荐和争议判断若为空，只能生成事实摘要或候选结论，不能代替用户表达主观立场。

### `content_route`

- 类型：`auto` 或以下枚举之一：
  - `model_release`
  - `tool_tutorial`
  - `model_comparison`
  - `workflow`
  - `official_evidence`
  - `field_recap`
- 默认 `auto`。执行端按 `content-routing.md` 选择，并记录选择理由。
- 用户指定结构与材料不匹配时，应说明风险并建议更合适的结构，而不是硬套模板。

### `required_assets` 与 `optional_assets`

- 类型：素材对象数组。
- 素材对象字段：
  - `type`：`portrait`、`screenshot`、`logo`、`product_image`、`chart`、`document` 或 `other`。
  - `path_or_url`：本地路径或来源链接。
  - `required`：是否必须进入成品。
  - `placement`：可选位置偏好，如 `bottom_left`、`right`、`background`、`auto`。
  - `usage_rights`：`user_owned`、`official_brand_asset`、`licensed`、`unknown`。
  - `source_url`：素材原始出处，下载素材时应补齐。
- `usage_rights` 为 `unknown` 时，只能用于内部草稿；公开发布前必须确认授权或替换。

### `must_include` 与 `must_avoid`

- `must_include`：必须出现的名称、关键词、数字或视觉元素。
- `must_avoid`：禁止元素、表达和风险，例如“不用人物抠图”“不写最强”“不展示客户名称”。
- 用户要求与事实或授权冲突时，以真实性、隐私和使用许可为上限。

### `audience` 与 `tone`

- `audience`：预期读者。缺省时从账号历史与选题推断；无法推断则使用“关注 AI 工具的中文读者”。
- `tone`：表达气质，不直接等同于画面风格。默认“清晰、可信、有判断”。

### `variants`

- 类型：正整数。
- 默认：`1`。用户明确要求“多套、多个版本、备选方案”时再提升到 `2–3`。
- 变体应改变标题角度、证据组织或构图重点，不只是换颜色。
- 批量探索时先生成低成本预览，通过后再导出全尺寸成品。

### `research`

- `allow_web_search`：是否允许联网查找官方资料与素材，默认 `true`。
- `official_sources_only_for_facts`：封面事实是否必须由官方或原始来源支持，默认 `true`。
- `as_of`：研究截止日期，使用 `YYYY-MM-DD`，执行时自动填入当前日期。
- 即使允许联网，也不得下载授权不明的人像、图库作品或媒体照片直接用于公开成品。

### `output`

- `language`：默认 `zh-CN`。
- `format`：默认 `png`。
- `keep_editable_source`：是否保留 HTML、SVG、设计源文件或渲染配置，默认 `true`。
- `create_contact_sheet`：是否生成多方案总览，多个变体时默认 `true`。
- `cover_prompt`：执行简报与可复制封面提示词路径，固定为项目根 `COVER_PROMPT.md`。
- `fact_ledger`：事实台账路径，固定为项目根 `FACTS.md`；封面可见事实必须逐项登记。

## 自动补齐规则

执行端可以自动补齐：

- 当前日期、导出尺寸、文件名和输出目录。
- 官方 Logo、官方产品图、公告截图与来源记录。
- 经原始资料验证的版本号、发布日期、参数与功能描述。
- 六种内容结构的选择、标题候选、配色和版式变体。
- 默认人物照片和既有品牌资产，但必须确认路径存在且使用权明确。

自动补齐事实后，仍必须把采用的精确文案、官方 URL、核验日期和证据位置写入 `FACTS.md`；没有入账的事实不能进入成品。

执行端不得自动补齐：

- 用户没有表达过的个人体验、推荐结论或商业立场。
- 未经测试的模型胜负、精确评分和性能提升百分比。
- 不存在的合作关系、活动身份、用户评价或官方引语。
- 授权状态不明的图片许可。
- 会暴露个人信息、密钥或内部数据的内容。

## 何时必须询问

只在下列缺口会实质改变结果或带来风险时询问：

- 同一选题存在两种相反立场，且无法从用户材料判断。
- 必须使用的人物、客户或商业素材缺少授权信息。
- 用户要求写入的关键数据与权威来源冲突。
- 目标平台或裁切方式会导致人物、标题等必须元素无法同时保留。
- 内容涉及尚未公开的信息、隐私、付费素材或受限品牌使用。

其他缺省项使用合理默认值推进，并在交付时说明假设。

## 示例

### 示例 A：最小输入，自动研究发布内容

```json
{
  "topic": "Qwen 新模型发布",
  "targets": [
    {
      "platform": "xiaohongshu",
      "profile": "portrait_cover"
    },
    {
      "platform": "wechat_official_account",
      "profile": "article_cover"
    }
  ],
  "content_route": "auto"
}
```

执行端应查找官方发布页和模型卡，确认型号与能力，再选择 `model_release`。如果找不到官方发布证据，不得生成“正式发布”标题。

### 示例 B：教程，用户指定结果和人物位置

```json
{
  "topic": "从零安装并运行 DeepSeek Harness",
  "stance": "把最容易踩坑的三个配置一次讲清",
  "targets": [
    {
      "platform": "wechat_official_account",
      "profile": "article_cover"
    }
  ],
  "content_route": "tool_tutorial",
  "required_assets": [
    {
      "type": "portrait",
      "path_or_url": "/path/to/assets/default-portrait.jpg",
      "required": true,
      "placement": "bottom_left",
      "usage_rights": "user_owned"
    }
  ],
  "must_avoid": ["截断手部", "伪造终端结果"]
}
```

### 示例 C：对比，缺少测试时主动降级

```json
{
  "topic": "Codex、Kimi 和 Grok 怎么分工",
  "targets": [
    {
      "platform": "xiaohongshu",
      "profile": "portrait_cover"
    }
  ],
  "content_route": "model_comparison",
  "stance": null,
  "must_avoid": ["未经实测的排名", "虚构分数"]
}
```

如果没有统一测试数据，应改用 `workflow`，标题表述为“我的任务路由”或“建议分工”；若保留对比矩阵，结果只能标“待测”。

### 示例 D：现场复盘，锁定真实照片

```json
{
  "topic": "参加 AI 圆桌后，我重新理解了小模型的价值",
  "stance": "参数不是重点，能进入真实工作流才是",
  "content_route": "field_recap",
  "required_assets": [
    {
      "type": "portrait",
      "path_or_url": "/path/to/photos/event.jpg",
      "required": true,
      "placement": "bottom_left",
      "usage_rights": "user_owned"
    }
  ],
  "must_avoid": ["抠掉话筒和桌面", "生成不存在的现场背景"]
}
```
