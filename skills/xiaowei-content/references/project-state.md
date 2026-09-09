# 同一项目如何接着做

在项目内保留 `source.md`、`sources.json`、平台稿和 `content.json`；图片存于 `covers/`，由原封面Skill维护其完整生成记录。无需为了遵循格式创建没有内容的文件。

`content.json` 是Agent维护的项目记录，不是已经实现的自动执行器。新项目先确定真实路径后填写，不把下面示例当运行结果：

```json
{
  "schemaVersion": 1,
  "revision": 1,
  "mode": "copy",
  "sourceFile": "source.md",
  "platforms": {
    "xiaohongshu": {"title": "当前推荐标题", "file": "小红书-v1.md"},
    "douyin": {"title": "当前发布标题", "file": "抖音-v1.md"}
  },
  "selectedBy": "agent",
  "userApproved": false,
  "cover": {
    "copy": null,
    "copyRevision": null,
    "basedOnRevision": null,
    "status": "not_requested",
    "directory": null
  }
}
```

- `revision`：内容每次实质修改递增，保留旧稿；采用相对项目路径。
- `selectedBy`：推荐版本为 `agent`；用户明确选择才记 `user`。用户要整套时可以用Agent推荐稿出图，仍保持 `userApproved: false`。
- `cover.copy`：精确主标题/副标题/署名，单独于投稿标题；`copyRevision` 是这套短句对应的正文版本。
- `basedOnRevision`：实际成图所依据的内容版本；未生成保持空值，不预填成功。
- `cover.status`：`not_requested`、`pending`、`ready`、`stale`、`blocked`。只有真实图片已存在且通过目视检查才为 `ready`。缺组件/生成失败记 `blocked` 并写具体原因。
- 正文只改标点且不影响封面，可保留封面并记录原因；封面承诺、数字、短句或主题有变化时标 `stale`。重生成后才更新依据版本。

## 偏好和续接

本地状态目录：`~/.local/share/xiaowei-content/`，默认不放进Git仓库。

- `profile.md`：用户明确的口吻、视觉偏好和拒绝原因；将单篇偏好与长期偏好分开。模糊的“不行”只记录整稿被拒，不猜测每个元素都被禁止。
- `approved/`：只收明确认可且允许本地保存的稿件，保留题材、平台、原路径和认可语句；不把认可流程当成认可稿件。
- `last-project.txt`：最近内容项目的绝对路径。优先承接对话里明确的项目；这个文件只是无明确上下文时的兜底。路径不存在或多个项目无法区分时简短澄清，不修改其他内容。
- `cases/`：复用案例的原作者、URL、读取层级、日期、观察和适用场景；不存登录凭证。转推保留原作者与发现入口两个字段。

同一次反馈只更新相关规则，不自动把整套Skill改写成新的普遍模板。不将待审/被拒稿移入 `approved/`。
