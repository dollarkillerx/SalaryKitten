# 薪水小猫 SalaryKitten

<p align="center">
  <img src="./assets/logo.png" width="128" alt="薪水小猫 Logo">
</p>

<p align="center">
  趴在桌面上、一秒一秒帮你数工资的 Q 版桌宠
</p>

<p align="center">
  <a href="https://salarykitten.pages.dev/zh/">官网</a> · <a href="https://github.com/dollarkillerx/SalaryKitten/releases/latest">下载</a>
</p>

<p align="center">
  <a href="./README.md">English</a> | <strong>简体中文</strong> | <a href="./README.ja-JP.md">日本語</a>
</p>

![薪水小猫](./docs/screenshots/showcase.png)

## 功能

- **实时薪水** - 按「月薪 ÷ 每月计薪天数 ÷ 每日有效工作秒数」每 0.1 秒累加；午休不计薪，下班后停止
- **上下班提醒** - 上班说「辛苦了」，下班报出今天一共赚了多少；午休前、午休开始、午休结束都会提醒
- **今日目标** - 赚到设定金额（比如 ¥100）时举旗撒彩带庆祝
- **五个角色** - 蓝色大肥鱼、冬装大肥鱼、Claude娘、冒牌 Claude、GPT娘，每人 9 个动作、专属台词和配色
- **真正的桌宠** - 任意拖动（记住位置）、点角色聊天、点金额看时薪和距离下班；透明区域点击直接穿透到桌面
- **老板模式** - 一键隐藏所有金额（气泡、通知、菜单栏都会打码）
- **菜单栏 / 托盘** - macOS 菜单栏直接显示今日金额；Windows 托盘悬停显示
- **自动更新** - 启动后在后台检查 GitHub Releases，下载好了才提醒；更新包带签名校验
- **小巧** - 基于 Tauri 2，Windows 安装包约 4 MB，macOS 约 11 MB（Apple 芯片和 Intel 二合一）
- **跨平台** - macOS（Apple 芯片和 Intel）和 Windows 10/11

## 截图

| | |
|---|---|
| ![蓝色大肥鱼](./docs/screenshots/pet-bluefish.png) | ![GPT娘](./docs/screenshots/pet-gpt.png) |
| 上班中的蓝色大肥鱼 | 午休睡觉的 GPT娘 |
| ![Claude娘](./docs/screenshots/pet-claude-details.png) | ![设置](./docs/screenshots/settings.png) |
| 详情卡片：时薪、距离午休、目标进度 | 设置：角色、薪水、工作时间、午休、目标、更新 |

## 安装

- **macOS**（Apple 芯片和 Intel，macOS 12 及以上）：下载 `SalaryKitten-mac.dmg`，把 SalaryKitten 拖进「应用程序」。已签名并公证。
- **Windows**（x64，Windows 10/11）：下载 `SalaryKitten-win-Setup.exe`。暂未代码签名：如果出现 SmartScreen，点 **更多信息 → 仍要运行**。

装好之后会自动更新（右键桌宠 →「检查更新」，或 设置 →「更新」）。

## 开发

需要 Node 18+ 和 Rust（`rustup`）。

```bash
npm install
npm run dev      # 启动桌宠
npm test         # 薪水计算单元测试
```

桌宠窗口的调试参数（改 `src-tauri/tauri.conf.json` 里的 `url`）：
`pet.html?now=2026-11-18T11:54:50&speed=20` 模拟时间，`&details` 启动即展开详情，
`&character=gpt` 临时换角色（不保存），`&settings` 启动即打开设置窗口。

## 发布

见 [docs/RELEASING.md](./docs/RELEASING.md)：`scripts/release-macos.sh <版本>` 打出签名、公证的 macOS 安装包和更新包；
Windows 安装包由 GitHub Actions 构建；`scripts/publish-release.sh <版本>` 生成 `latest.json` 并上传到 GitHub Release。

## 新增角色

1. 按 `design/brief-states.md` 的 9 个状态准备绿幕原图，放到 `design/green-screen/<角色id>/`（可以让 Codex 读 `design/brief-<角色>.md` 生成）。
2. `swift scripts/key-sprites.swift <角色id>` 抠图并输出 400×400 PNG 到 `ui/assets/characters/<角色id>/`（装了 `pngquant` 会自动压缩）。
3. 在 `ui/shared/characters.js` 加一项（名字、配色），在 `ui/shared/lines.js` 写台词。

## 目录

```
ui/                    前端（纯 HTML/CSS/JS，无构建步骤）
  pet.*                桌宠窗口
  settings.*           设置窗口
  shared/salary.js     薪水计算引擎（纯函数，有单测）
  shared/characters.js 角色清单
  shared/lines.js      各角色台词
  assets/characters/   角色切图
src-tauri/             Tauri 外壳：托盘、设置窗口、通知、开机自启、自动更新
website/               官网（Cloudflare Pages）
design/                角色需求、参考图、Codex 绿幕原图
scripts/               抠图、截图、发布脚本
```

## 关于角色

所有角色均为二创同人 Q 版形象。「蓝色大肥鱼」为开放授权角色；Claude娘、GPT娘为同人拟人形象。
本项目与 Anthropic、OpenAI、DeepSeek 无任何关系，「Claude」「GPT」为其各自所有者的商标。

## 许可证

[MIT](./LICENSE)
