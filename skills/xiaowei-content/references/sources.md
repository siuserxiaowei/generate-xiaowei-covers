# 方法来源与组件边界

本入口依据实际创作反馈编写。以下为学习和进一步阅读的来源；没有把其完整Skill、标题库、脚本或付费材料复制进本仓库。

| 来源 | 借鉴与适用范围 |
|---|---|
| [yanhua1010/self-media-content-workflow](https://github.com/yanhua1010/self-media-content-workflow) · self-media-platform-copywriting | 平台独立组织、正文兑现标题、事实与推断分开。是否需要逐阶段确认以当前用户授权为准。 |
| [mengke-wang/xiaohongshu-ai-workbench](https://github.com/mengke-wang/xiaohongshu-ai-workbench) · xiaohongshu-title，王梦珂 Mengke | 从具体处境找标题入口、检查标题是否只是摘要；不为填满候选组数编造数字。 |
| [alchaincyf/huashu-skills](https://github.com/alchaincyf/huashu-skills) · huashu-douyin-script，花叔 | 原帖拆解与口播可说性；其电商投放流程不默认用于个人故事，也不默认调用外部视频分析API。 |

本地可选组件：`agent-reach` 用于读取平台内容；`write-credible-content-zh` 用于事实与声音；`native-content-writing-zh` 用于具体商业稿。组件是否可用应由本次环境验证，不硬编码某台电脑路径。

封面依赖本仓库的 `generate-xiaowei-covers`，保留原有风格来源、许可证、人物资产规则。其他第三方Skill保持各自许可证；链接引用不授予重新分发许可。

没有预置“已经验证的爆款公式”或“用户已认可成稿”。案例质量由实际读到的内容判断；首次使用先研究同类案例，后续有相关缓存再复用。
