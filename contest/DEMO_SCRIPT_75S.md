# Claim2Cover 72 秒 Demo 脚本

## 录制前

- 终端宽度足以完整显示错误码。
- 打开生成的 `DEMO.html`、三张 PNG、`FAIL.log`、`PASS.log` 与 `STATUS_BEFORE_SIGNOFF.json`。
- 画面角落或口播明确 `recorded fixture · liveAiClaimed:false`。
- 如补录真实 Skill 前向测试，另存输入、Agent 输出和 commit，不把它与固定 fixture 混称。

## 分镜与口播

### 0–6 秒

画面：1920×1080 Demo 看板。

口播：

> 封面最危险的不是不好看，是把没证据的话做成最大的标题。

### 6–17 秒

画面：`claim-to-pixel.invalid.json` 的三类主张，停在 `unknown_ten_x`。

口播：

> Claim2Cover 先让 Agent 把输入拆成事实、判断和未知。这里的“效率提升十倍”没有数据，所以只能进 unknown，不能上封面。

### 17–27 秒

画面：运行负例或直接展示 `FAIL.log`。

口播：

> 我把它塞进“全网唯一、保证提升十倍”的横版标题。门禁真实失败：unknown 支撑标题、绝对词和数字没事实 token，而且二十一比九标题超长。

### 27–38 秒

画面：修复 fixture 的三个 platform brief。

口播：

> Agent 降级成“主张先过证据门”，再为三比四、二十一比九和一比一分别写标题、断行、证据模块和版式意图。

### 38–51 秒

画面：`PASS.log`、`CONTRACT_REPORT.json`、渲染日志快速切换。

口播：

> 接下来不是模型自由发挥。本地 contract 确定性检查来源、标题承诺、素材权利、Git 状态和安全区，八道门通过后才渲染。

### 51–63 秒

画面：三张 PNG 各停 3–4 秒。

口播：

> 这是三张真实成品：竖版是主张台账，横版是左右证据合同，方版是签核状态印章。它们不是同一张图裁三次。

### 63–69 秒

画面：`PENDING HUMAN SIGN-OFF` 特写与状态 JSON。

口播：

> 即使渲染成功，系统也故意停在人工签核前。事实、权利和最终发布仍由人负责。

### 69–72 秒

画面：回到 Demo 看板与仓库地址。

口播：

> 先让主张过证据门，再让像素上封面。这就是 Claim2Cover。
