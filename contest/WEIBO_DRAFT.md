# 微博投稿文案草案

> 发布前人工核对：仓库链接、最终 commit、视频、话题拼写、素材权利和公开账号身份。当前文字不等于已发布。

```text
#微博VibeLab# #VibeVision#

【Claim2Cover｜封面证据链】

封面最危险的，不只是不好看，而是把没证据的话做成最大的标题。

我把封面流程改成一条可执行的 Claim-to-Pixel 证据链：

1）Agent 先把输入拆成 fact / judgment / unknown；
2）分别为小红书 3:4、公众号 21:9、公众号 1:1 写标题与版式 brief；
3）本地 contract 阻止 unknown、未验证数字/绝对词和超出安全区的文案；
4）确定性生成 HTML、台账、来源、素材权利记录和 3 张 PNG；
5）最终故意停在 PENDING HUMAN SIGN-OFF，人工核对后才能提交 clean commit 发布。

Demo 里，“全网唯一、效率提升 10 倍”会真实 FAIL；降级成“主张先过证据门”后 8/8 gates PASS，并生成三种独立构图，不是机械裁图。

为了可复现，视频中的主回归 fixture 是 recorded Agent draft，明确标记 liveAiClaimed:false；Agent 做语义判断与 brief，本地 CLI 做确定性校验与渲染。另附真实 Skill 前向测试时，会单独保留输入和运行证据。

GitHub：https://github.com/siuserxiaowei/generate-xiaowei-covers

人负责最终事实、权利和发布判断；AI 不替人签字。
```

## 配图 / 视频顺序

1. `demo/artifacts/board/claim2cover-demo-board.png`
2. 60–75 秒 Demo MP4
3. 三张成品图（3:4、21:9、1:1）
4. 可选：FAIL 与 PASS 终端近景

## 不能写的表述

- “全球首创”“全网唯一”“完全原创”——没有完整候选集证据。
- “实时 AI 自动完成整条链路”——固定 fixture 是 recorded draft，不是实时模型调用。
- “所有素材都可自由商用”——人物和商标有独立边界。
- “通过测试即可自动发布”——人工签核与 clean commit 仍是硬门。
