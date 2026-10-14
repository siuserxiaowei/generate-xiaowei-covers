# 成图验收：真实文件、原图与已记录视检

策划文件和风格选择通过，不代表封面已完成。必须在成图后检查本次实际 PNG/JPEG，并填写视检记录，再运行：

```bash
node "$SKILL_DIR/scripts/validate-cover-output.mjs" <output-manifest.json> --out <output-report.json>
```

`validated` 返回退出码 0；`rejected` 返回退出码 1，JSON 报告列出具体失败原因。省略 `--out` 时仍向标准输出返回完整 JSON。脚本只读取图片，不渲染、裁切、补边、拉伸、修改元数据或修改输入 manifest。`--out` 只能写与输入和图片均不同的 `.json` 报告路径；符号链接或硬链接指向输入的报告路径同样拒绝。

## 输入契约

路径相对 manifest 所在目录解析，也接受本地绝对路径。只接受 `schemaVersion: 2` 与 `single`、`style_pack`、`series` 三种模式。

```json
{
  "schemaVersion": 2,
  "mode": "style_pack",
  "outputs": [
    {
      "itemId": "style-01",
      "engine": "imagegen",
      "file": "covers/01-3.35x1.png",
      "requestedRatio": "3.35:1",
      "sourceFile": "source/generated-originals/01.png",
      "transforms": [],
      "review": {
        "inspected": true,
        "identityRecognizable": true,
        "textCorrect": true,
        "thumbnailReadable": true,
        "fullBleed": true,
        "evidenceFaithful": true,
        "styleMatches": true,
        "focalSubject": "product",
        "portraitSide": "left",
        "poseCategory": "holding_component",
        "sceneType": "workbench",
        "layoutGrammar": "product_center_person_left"
      }
    }
  ]
}
```

示例只演示一项结构；`style_pack` 的实际 manifest 至少含两个完整视检的不同 itemId。每个 itemId 的不同比例是同一封面的独立画幅，不作为不同风格互相比较。同一 itemId/比例不能重复出现。

所有模式都必须填写七个布尔视检字段和五个实际构图字段。布尔值必须确实为 `true`，字符串 `"true"`、未填写或未经检查的默认值均不通过。`inspected` 表示执行者已目视检查实际图片；它不代表另有真人用户签核，也不授予公开发布权限。发现文字、人脸、边缘或证据问题时，应记录 `false` 并修正图片，再填写新的真实结果。

## 尺寸与原图门禁

- 从 PNG IHDR 或 JPEG SOF 读取真实编码尺寸；JPEG EXIF 方向 5–8 会交换显示宽高，并同时记录编码尺寸与方向。
- PNG 检查 IHDR 校验和和基本 IDAT/IEND 结构；JPEG 检查帧、扫描与结束结构。这是文件尺寸检查，不是完整图像解码或像素内容识别。
- 实际比例相对误差为 `abs((actualWidth / actualHeight) / requestedRatio - 1)`，上限为 1%。`width`、`height`、CSS 画布和提示词尺寸不作为成图证据。
- 例如 2169×725 的实际比例约 2.9917:1，相对 3.35:1 偏差约 10.7%，必须拒绝，不能标称精准 3.35:1。
- `transforms` 必须显式为数组。此版本默认不允许任何变换；`padding`、`stretch`、`crop`、`resize` 和未知变换都拒绝。补成正确外框仍不是独立原图。
- `engine` 必须记录实际 `imagegen` 或 `html`；imagegen必须保留真实工具原稿并填sourceFile，不能填null绕过来源检查。HTML只有独立编写完整画布才可填null。
- `sourceFile` 必须显式记录。它指图片工具的原始输出，不是人物或风格参考图。非空时会读取源文件并核对真实宽高和 SHA-256；只有未修改原图或逐字节复制品通过。压缩重编码、改元数据或其它改动也需要保留新的真实生成原图，不能隐瞒为复制。
- 独立 HTML 画幅可以填写 `sourceFile: null` 或空字符串，以及 `transforms: []`。验收仍读取导出的 PNG 本身，不能只验证 DOM 或 CSS 尺寸。
- 缺失、非文件、无效图片、重复路径/符号链接和逐字节重复图片均拒绝。

## 多风格的实际构图检查

`style_pack` 不读取 styleId 来证明图片不同。完成视检后，按实际画面记录：

| 字段 | 记录对象 | 建议稳定词汇示例 |
|---|---|---|
| `focalSubject` | 第一视觉主体 | title、person、product、process、result、story |
| `portraitSide` | 本人在画面中的实际位置 | left、right、center、distributed、full_scene |
| `poseCategory` | 有辨识意义的动作 | open_palms、holding_component、pointing_sequence、thinking、neutral、source_locked |
| `sceneType` | 实际主题场景 | studio、workbench、diagram、paper_collage、editorial_photo |
| `layoutGrammar` | 整幅图的空间组织 | title_left_person_right、product_center_person_left、horizontal_process、editorial_photo_column |

这些示例不是强制枚举，但同一批次必须用同一词汇描述同一情况。脚本只统一大小写、Unicode 格式和空格/下划线/连接号，不理解同义词或像素。不得用不同标签掩盖相同画面，也不能从计划直接复制未经核对的字段。

比较规则：

1. 只跨 itemId 比较，优先比较两项共有的每个目标比例；同一 item 的 3:4 和 9:16 不互相比风格。
2. 两项无共同比例时，比较各自第一张成图作为代表，并在报告标明 `comparableRatio: false`；视检时须考虑画幅影响。
3. 任意被比较的跨 item 对，至少两项实际构图字段不同。只换站位一项仍不通过。
4. 如果人物位置、动作、版式语法三项相同，即使主对象、背景或色彩改变，也以 `composition_repeated` 拒绝，防止同构图换皮。
5. `series` 允许不同期共用风格与构图语法，仍须通过真实尺寸、原图、事实和视检门禁。

上述跨图检查依赖诚实的视检记录；脚本不能自动判断人像是否在右边、手势是否重复、边缘是否补条或字体是否符合风格。未记录的变换、伪造视检字段和语义相同但标签不同的问题需要实际目视检查解决。`validated` 只表示确定性门禁和已记录视检均通过，不宣称机器理解图片。

## 回归测试

```bash
node "$SKILL_DIR/scripts/test-cover-output.mjs"
```

测试使用 Node 标准库创建真正的 PNG 临时 fixture，也读取并临时复制仓库自带 JPEG 测试真实 JPEG 尺寸及 EXIF 方向；不安装依赖。覆盖旧比例、补边/拉伸/裁切、缺失视检、重复输出、缺失源图、隐瞒变更、仅改风格 ID、同构图换皮、跨 item 差异、同 item 多比例、series 兼容、1% 边界及报告不覆盖输入。临时目录在 `finally` 中清理。
