# Claim2Cover 录屏镜头清单（72 秒）

> 这组素材来自固定可复现 fixture，`liveAiClaimed:false`。录制时应明确：语义 brief 是 Agent 草案；本地 CLI 做确定性校验与渲染。真实 Skill 前向测试需另留运行证据。

| 时间 | 画面 | 旁白要点 | 现成素材 |
|---:|---|---|---|
| 0–6s | 一句话痛点 + 危险标题 | “封面最危险的不是不好看，是把没证据的话做成大标题。” | `DEMO.html` 顶部 |
| 6–17s | 展开 unknown 行和危险 10 倍标题 | Agent 把输入拆为 fact / judgment / unknown，10 倍进入 unknown | `claim-to-pixel.invalid.json` |
| 17–27s | 运行负例 | CLI 非零退出：unknown 上标题、绝对词/数字无事实 token、21:9 超长 | `FAIL.log` |
| 27–38s | 切换修复 fixture | Agent 把标题降级为“主张先过证据门”，并分别写三套 brief | `claim-to-pixel.json` + `build/briefs/` |
| 38–51s | 运行 build | 八道门 PASS，确定性生成 HTML、台账、来源、权利 CSV 和 PNG | `PASS.log` + `build/CONTRACT_REPORT.json` |
| 51–63s | 快速扫三张成品 | 3:4 是纵向台账，21:9 是左右证据合同，1:1 是状态印章；不是机械裁切 | `build/png/` |
| 63–69s | 停在签核状态 | 系统故意显示 PENDING HUMAN SIGN-OFF，AI 不替人确认事实与权利 | `build/STATUS.md` |
| 69–72s | 一屏收束 | “先让主张过证据门，再让像素上封面。” | `board/claim2cover-demo-board.png` |

## 建议录制顺序

1. 先打开 `<output-dir>/DEMO.html` 全屏，完成开头与结尾镜头。
2. 中间切终端展示 `FAIL.log` 与 `PASS.log`，不要滚动无关日志。
3. 三张 PNG 各停 2–3 秒；最后回到 1920×1080 看板。
4. 不要展示或口播“实时 AI 调用”；这个固定 fixture 的职责是可复现回归。真实 Agent 前向测试另录。
