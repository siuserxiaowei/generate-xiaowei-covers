# COVER_PLAN v2：策划编译，不是图片生成

Agent 读取原文后编写输入 JSON。脚本验证全部输入，再把完整提示、已存在的参考文件与台账复制到新项目。`generation.json` 初始状态为 planned；只有真实工具调用后才记录生成。

```json
{
  "schemaVersion": 2,
  "mode": "single",
  "topic": "小智AI硬件选购",
  "requestedCount": 1,
  "channel": "article",
  "articleSource": {"file": "source/article.md", "url": "https://example.com/source", "revision": 8},
  "ratios": ["3.35:1"],
  "identity": {"mode": "generated_identity", "primary": "assets/portrait.jpg", "support": []},
  "factsFile": "FACTS.md",
  "sourcesFile": "SOURCES.md",
  "assets": [{"id": "board", "file": "assets/esp32.png", "purpose": "真实ESP32-S3开发板外观，不能照图编造接线"}],
  "items": [{
    "id": "workbench",
    "styleId": "workbench",
    "rationale": "购买清单适合把必要部件摆到同一桌面，减少抽象科技装饰",
    "concept": {
      "promise": "看清面包板DIY需要买哪些核心部件",
      "visualMetaphor": "一张准备开工的真实工作台",
      "focalSubject": "product",
      "readingOrder": "标题→放大开发板→桌边的小伟",
      "portraitSide": "left",
      "poseCategory": "arranging_parts",
      "sceneType": "physical_workbench",
      "layoutGrammar": "foreground_product_with_background_presenter"
    },
    "scene": {
      "subject": "桌边的小伟观察桌面上的ESP32-S3和少量模块，不接电路",
      "environment": "浅木工作台和虚化工具架，前景产品近景",
      "mood": "暖灰木色、石墨字与一个绿色元件细节",
      "light": "左上柔和日光，接触阴影自然",
      "camera": "略低的桌面视角，真人在左侧后景，产品右侧前景",
      "typography": "石墨色粗黑体短标题，无描边，副标题小一层"
    },
    "poseBrief": "一手轻扶开发板，另一手自然置于桌面，不指向标题",
    "copy": {"title": "小智 AI 硬件怎么买？", "subtitle": "ESP32-S3 · 面包板 DIY", "author": "siuser小伟"},
    "objectRefs": ["board"],
    "surfacePlans": {"3.35:1": {"composition": "标题居中偏上，左侧后景人物与右侧前景板形成对角关系；场景延伸全幅，不补边"}}
  }]
}
```

articleSource可选；给file时会先检查并复制原文到source/article.*，更新compiled路径，保留url/revision。只有url时记录来源，不声称已归档正文。

路径相对输入 JSON 解析；身份、证据、facts/sources 必须真实存在。标题还需要Agent对事实台账核对，编译器不会凭文件存在自动认证文案正确。style_pack 至少两张、完整风格不同，构图字段至少两项不同，且人物侧/动作/版式三者不能全同。series使用同一style，允许共同语法。数量严格等于requestedCount。

每个生成调用只传该 item 的身份图和 `objectRefs` 文件，不能把整个风格库或其它作者头像混入。编译后的 prompt 是任务内容，调用前仍核对当前工具能力、六维描述与参考角色。脚本没有模型调用、收费或发布动作。

`OUTPUT_REVIEW.template.json` 不能直接当通过结果。实际生图后改为真实路径、来源与变换，查看图再填写 inspected 和观察字段，存为 `OUTPUT_REVIEW.json` 后验收。

## 项目自定义方向

不适合十二个候选时，每个item可带完整styleDefinition，使用新的styleId，不改安装目录的catalog。必须给name、engine（imagegen/html）、source（原创或参考来源）、adaptation（本次规则/边界）、visual、portrait、typography和非空avoid数组。定义会进入styleSnapshot与完整prompt，仅作用于本项目；不能同ID覆盖既有预设，也不能仅起新名字绕过构图检查。
