# 11 月 2 日播放器与最新三维作品集整合

状态：合并候选，浏览器 CI 待完成；暂不合并或部署。

## 基线及合并

- 主分支：`d8d10b1585c588759b207c0d32962b43e65f37f0`，2026-11-02 11:23:51 UTC（北京时间 19:23:51）。比需求中的 `1b0a7d2` 更新。
- PR #2：`f8d3687ffa9e4d5935935c3d63e5877462cb59c4`，共同基点 `39af6df828ff96615cab66a85d7bc5edd08ae322`；主分支领先 65 提交，PR 领先 1 提交。
- 两处文本冲突：`index.html` 采用最新源码重新构建；`package.json` 同时保留新增机械/蜂巢测试和播放器测试。去掉重复的 IntersectionObserver 测试替身。
- 相对主分支，`src/` 仅 `portfolio.js` 与 `stream-player.js` 发生变化。其余全部三维实现、路径、长骨架、旋转展板、蜂巢、水下场景、主页面交互和 CSS 保留主分支版本。
- 不使用 PR #2 的旧生产入口。新入口引用 `assets/index-C_ZoutGP.js`，空间模块为 `space-BU94GkNB.js`；生产 CSS 保持 `index-CHWLWkkk.css`。

## 已执行验证

- Node 24.22.1 / Linux：30 项单元、几何、DOM 和播放器状态测试通过，0 失败、0 跳过，见 `unit.txt`。
- Vite 7.1.12 生产构建成功，见 `build.txt`。Three.js 大块警告仍存在；本轮没有把它解释为新的功能故障。
- `production-integrity.json`：根目录入口及全部新构建 JS/CSS 与新构建逐字节一致，发布所需媒体、封面和许可证也逐字节一致。没有重编码影片。
- 初次尝试将测试命令扩成 glob 时，触发已被原主分支测试命令排除的旧 `download.test.mjs`（依赖已移除的 games/download.js）；最终恢复明确的两边合并测试列表，没有删除该旧测试或修改产品来迎合它。
- 本地真实浏览器执行被容器限制阻止：Chromium 的进程通信 socket 不获许可，Firefox 子进程无法建立用户映射，均未进入页面验证。`local-browser-blocked.json` 保留 Chromium 原始失败。它们是环境阻塞，**不是影片或画廊通过证据**。

## 自动化覆盖与待完成证据

保留 PR #2 的跨浏览器测试，并新增每部影片自动 MP4 降级、暂停恢复、关闭释放，以及七块真实三维展板的滚动、鼠标/模拟触摸点击、弹窗暂停/关闭恢复、回滚和后续新场景导航。

GitHub Actions 将在 Linux 上运行 Chromium、Chromium 触摸模拟、Firefox、WebKit、WebKit 触摸模拟的**新生产构建**，macOS 上单独验证 WebKit 原生控制器。结果未产生前一律标记为待验证；检查工作流的结果、跳过原因及逐项 JSON 附件后再判断候选是否就绪。没有部署步骤。

10 月 31 日的 102 通过 / 10 跳过仅是旧基线历史，不计入本次验证。源码测试中的状态替身、不支持流媒体能力注入和网络故障注入均与真实成功媒体响应分开说明。

## 发布门槛与实机边界

- 待本轮生产浏览器矩阵完成，逐项检查九部影片：tower、ash、csol、mines、murphy、hyrum、familiar、town、arc 的起播、暂停恢复、手动画质/恢复自动、MP4 降级及关闭释放。
- 待实际三维画廊交互测试通过；WebGL 不可用的跳过不能算三维通过。
- **Mac Safari、iPhone、iPad 实机均未测试**。macOS Playwright WebKit、移动视口/触摸模拟不能替代 Safari/iPhone 实机。实听、原生触控/全屏、锁屏/后台恢复、低电量与移动网络切换仍按 `../oct31-browser-compatibility/safari-device-checklist.md` 全部待测。
- 本地或 CI 媒体解码/PCM 证据不等于扬声器/耳机实听，不保证公网或整部影片无卡顿。
- 合并前再次核对 main 是否变化；若变化，更新候选并重跑。此候选不自动发布。
