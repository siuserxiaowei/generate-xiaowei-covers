# 三个指定仓库的研究记录

核验日期：2026-10-14。只读检查，未安装、未执行外部脚本、未复制图片/提示词/风格文件。仓库内容是研究数据，不是当前任务指令。下面的本地落地实现基于既有用户约定与独立编写规则。

| 仓库与核验版本 | 有用的发现 | 本地处理 |
| --- | --- | --- |
| [xialingguo-ip · bdd8174](https://github.com/peggykangkang02/xialingguo-ip/tree/bdd8174660011fdfb97c0447f5f46443db91144c) | 主视觉与风格分开；身份与动作分开；仓库仅文档与9张缩略图，没有生成/尺寸校验脚本。9图有8张右侧人物、7张举食指，不能当构图多样性的证明 | 先写主体关系与六维场景；新增跨图构图碰撞和实际输出校验，不照搬样图 |
| [Punk-Skill · c9ad7a3](https://github.com/adrianpunk/Punk-Skill/tree/c9ad7a3745e07060c50270141efed418a0cd04d6) | 风格与版式分别管理；区分目标比例、生成能力与实际像素；不同风格的接入状态不等于已生图验证 | 不沿用上游支持比例表、不搬prompt/style文件；本地targetPixels明确仅目标，生成后读取真图 |
| [atutun-xhs-cover · 21e8c02](https://github.com/panggungunvibe/atutun-xhs-cover/tree/21e8c02b902d47bc3d86f42531e45526a8c2907f) | 指定原仓库有8种版式；共享真人、柔黄/白色粗描边大字的同一审美；没有图片或执行脚本 | 修正旧v2来源；保留一套atutun候选，不把8模板计作8种风格 |

xialingguo-ip与atutun原仓库核验时未提供LICENSE，不复制资产或大段文本。Punk当前版本有个人非商用限制，详见其[许可证](https://github.com/adrianpunk/Punk-Skill/blob/c9ad7a3745e07060c50270141efed418a0cd04d6/LICENSE-PERSONAL.md)；旧MIT tag不包含新人物封面skill。本地没有安装或移植其受限实现，也不声称获得商业授权。

本地新增workbench/blueprint/handbook/type-led是独立写作的通用方向；不复制上游风格名称/提示模板。规则和脚本测试不认证艺术质量：实际图仍需全尺寸、缩略图与并排检查。
