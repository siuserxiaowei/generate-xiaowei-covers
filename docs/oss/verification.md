# 申请材料与案例验证记录

验证日期：2026-09-16。该记录说明执行证据和范围，不是资助入选或第三方采用证明。

## 运行环境与基础状态

- 起始代码提交：`3ed8c20`（本次资料补充前的 `origin/main`）。
- 本地环境：macOS、Node.js `v26.8.1`、系统 Google Chrome 渲染后端。
- 基础 `COVER_RENDERER=chrome npm test` 在导入案例前完成，退出码为 0；包含结构检查、风格检查、真实渲染和契约负例测试。
- 本次新验证脚本为无第三方 npm 依赖的 Node.js 脚本；没有为验证发起模型 API 请求。

## 本次新增验证

| 项目 | 结果 | 证据 |
|---|---|---|
| 历史案例文件 | 2 组、17 个清单文件校验通过 | `npm run verify:cases`、[manifest.json](../cases/manifest.json) |
| 历史图片原样保留 | 6 张 PNG 与本机历史文件 SHA-256 一致 | manifest 中 `originals` 与公开 `artifacts` 的摘要 |
| 真实重渲染 | 两组 HTML 各生成 3 张 PNG，尺寸通过 | `npm run test:cases`、[日志](evidence/case-tests.txt) |
| 校验失败路径 | 摘要改变、越界路径、尺寸不符、缺失记录、私有草稿 URL 共 5 项被拒绝 | `scripts/test-case-studies.mjs` |
| 申请字符数 | 英文 492 / 493 / 495，中文 204 / 158 / 175；每项小于等于 500 | `npm run verify:application` |
| 素材检查 | 两组人物图与仓库已有授权图片相同；6 张 PNG 未含文本/EXIF metadata 块 | 本次本地按字节/PNG chunk 检查；视觉核对见下文 |
| 历史记录矛盾 | WorkBuddy 原检查清单与其 Logo 条目矛盾，公开副本修正并披露 | [SOURCE.md](../cases/workbuddy-ai-daily/SOURCE.md) |

## 视觉核对

已查看两张原始配对图，确认每组同时显示完整横版与独立方版。WorkBuddy 图保留“四路信息源 → 日报”和“流程示意”；邮箱图保留三条选择路径和“选择路径（示意）”。图片中未见账户凭据或私人协作文档链接。可见人物为仓库已授权的同一人物素材。

这是对已查看图片的检查，不是通用 OCR、全面隐私审计或新一轮用户测试。原图片未修改；浏览器重渲染只承诺生成成功和输出尺寸，不承诺跨系统像素一致。

## 公共与私有材料的边界

案例只导入自己的封面制品、必要素材和经过脱敏的执行记录；没有公开完整私人文章、聊天截图、账户页面、模型历史会话或申请人的账户邮箱/组织 ID。扫描器只覆盖明确列出的路径、私有飞书链接与密钥格式，不声称能发现所有敏感内容。

## 复核方式

```bash
git clone https://github.com/siuserxiaowei/generate-xiaowei-covers.git
cd generate-xiaowei-covers
COVER_RENDERER=chrome npm test
```

需要 Node.js 20+ 与可用 Chrome；也可明确使用已安装的 Playwright 后端。线上最终结果请查看 [GitHub Actions](https://github.com/siuserxiaowei/generate-xiaowei-covers/actions/workflows/validate.yml) 对本次提交的运行记录。本文不提前把尚未完成的 CI 宣称为成功。

## 未验证或未实现

- 独立用户采用、月活、月下载量、传播效果、节约时间：没有可靠数据。
- 历史任务的具体模型、Token 消耗、端到端调用轨迹：未保留可公开记录。
- WorkBuddy 当前能力、邮件平台限额：本次未重测。
- 全部图像生成风格的视觉质量和实时 API 语义回归：仍需专项评估。
- Windows 与所有浏览器/字体组合：本次本地测试不覆盖。
- 官方表单：已写好材料，尚未提交。
