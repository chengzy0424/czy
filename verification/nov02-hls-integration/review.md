# 11 月 2 日播放器与最新三维作品集整合

**结论：在本轮自动化覆盖范围内未发现明显功能回退。合并候选已完成整合、重建和 CI 验证；仍为 Draft，尚未合并或发布。Safari/iPhone/iPad 实机验收未完成。**

## 基线和可复核版本

- 最新主分支基线：`5ae553a73e9354e7230bef8ccd82f1efc94b62b0`，2026-11-02 13:14:26 UTC（北京时间 21:14:26），比需求中的 `1b0a7d2` 更新。
- 修复来源：[PR #2](https://github.com/chengzy0424/czy/pull/2)，`f8d3687ffa9e4d5935935c3d63e5877462cb59c4`。共同基点 `39af6df828ff96615cab66a85d7bc5edd08ae322`，整合时主分支领先 82 提交，修复分支领先 1 提交。
- 候选：[PR #3](https://github.com/chengzy0424/czy/pull/3)，`codex/hls-gallery-integration-20261102`。
- 完整测试的代码提交：`292e4bd4496735df728f2dbc397df0f83447a538`。Actions 检出 PR 合并预览 `7327f05f3d4de5c647c927805a62360189e3a8f8`；两者 tree 均为 `952623309ea78c3f3d13d26f3698c95b70e78321`，已核对相同。
- 最终运行：[GitHub Actions 41451975414](https://github.com/chengzy0424/czy/actions/runs/41451975414)。最终附加的报告提交仅更新说明与证据，使用 `[skip ci]`，不改代码、测试、工作流、媒体或生产资源。下列结果指向上述实际受测提交，不冒充在报告提交上重跑。

## 合并和生产资源

两处文本冲突已解决：根目录 `index.html` 从整合后的源码重新生成，`package.json` 合并两边的明确测试列表，保留机械/蜂巢/三维与播放器测试。去掉重复的 IntersectionObserver 测试替身。

相对 main，`portfolio-source/src/` 仅 `portfolio.js` 和 `stream-player.js` 改动；19 个其他源码/入口文件逐字节保留。固定长骨架、旋转作品展板、向下浏览、机械、蜂巢、水下场景和 CSS 均来自最新 main。播放器纳入原生 HLS 手动画质及重试、换源中的暂停意图、MP4 模式/菜单同步、迟到播放回调隔离和幂等资源释放。详见 [source-integrity.json](source-integrity.json)。

新生产入口引用 `assets/index-BM4z3J61.js`，空间模块为 `space-LnrVby_c.js`，CSS 为 `index-BcffEIWe.css`。没有沿用 PR #2 的旧入口。新增干净检出构建支持及 `tools/sync-production.mjs`；根目录入口和全部新构建 JS/CSS 与 CI 新构建逐字节一致，1,132 个媒体、封面、许可文件逐字节一致，未重编码影片。见 [production-integrity.json](production-integrity.json)。Vite 对 Three.js 和新增 HDR 数据块给出大块警告，HDR 保持 main 的延迟加载设计。

## 最终验证结果

Node 24.22.1 / Vite 7.1.12 / Playwright 1.62.1。基础、几何、DOM 和播放器状态测试 **32 通过、0 失败、0 跳过**；五个生产矩阵作业均重新运行基础测试、生产构建和资源一致性检查。基础测试只按 32 个唯一用例计数，不累加重复执行。

| 项目 | 测试对象 | 通过 | 跳过 | 失败 |
| --- | --- | ---: | ---: | ---: |
| chromium | Linux，新生产构建 | 25 | 0 | 0 |
| chromium-touch | Linux，新生产构建 | 25 | 0 | 0 |
| firefox | Linux，新生产构建 | 24 | 1 | 0 |
| webkit | Linux，新生产构建 | 24 | 1 | 0 |
| webkit-touch | Linux，新生产构建 | 24 | 1 | 0 |
| native-webkit | macOS，独立原生控制器 | 1 | 0 | 0 |
| **总计** | **126 个浏览器用例，无自动重试** | **123** | **3** | **0** |

Chromium 为 151.0.7922.34，Firefox 为 153.0，WebKit 为 26.5。Linux 桌面 Chromium/Firefox 使用 Xvfb；Firefox 使用 PulseAudio 虚拟输出；其他生产项目为 headless。原生控制器在 macOS Playwright WebKit 实际原生 HLS 能力下验证，但不是 Safari 应用。

三项跳过均为 Firefox、WebKit、WebKit 触摸项目中只适用于 Chromium 的原生控制条鼠标/模拟拖动用例，原因保留在 JSON。**没有影片起播、画质、MP4 或三维画廊因缺少编解码器/WebGL 而跳过。** `test-list.txt` 中的 234 是可选全配置用例清单，不是本次执行数量；10 月 31 日的 102/10 仅是历史结果，不计入本轮。

逐项证据：[Chromium](chromium.json)、[Chromium 触摸模拟](chromium-touch.json)、[Firefox](firefox.json)、[WebKit](webkit.json)、[WebKit 触摸模拟](webkit-touch.json)、[macOS 原生控制器](native-webkit.json)。JSON 持久保留每项状态、环境、媒体状态和画廊命中记录；完整运行附件含截图，Actions 保留 14 天。运行与附件校验信息见 [ci-artifacts.json](ci-artifacts.json)。

## 九部影片和画廊覆盖

五个生产浏览器项目均逐片通过 tower、ash、csol、mines、murphy、hyrum、familiar、town、arc 的实际 HLS.js 播放：起播与短时连续进度、音频解码计数或非零 PCM、暂停、60% 位置跳转、暂停时快速选择低/高画质、恢复播放、实际解码分辨率达到最高档、恢复自动画质、音量保留，以及关闭后清空源并停止新的媒体请求。

每部影片另外独立验证“不支持 HLS/MSE”注入条件下的自动 MP4 降级、禁用画质菜单、暂停恢复和关闭释放。失败片段注入后，兼容播放按钮能恢复 MP4；启动中关闭、返回列表也释放媒体。成功媒体响应来自仓库真实媒体，未用假视频替换；能力及网络故障注入仅限指定测试。

五个生产项目均通过七块真实三维展板的正确项目命中、播放器弹窗、返回/关闭恢复滚动位置和绘制计数、逆向回滚，以及继续进入机械、蜂巢和水下章节。点击使用真实鼠标或模拟触摸输入，未直接调用项目选择函数。桌面 Chromium 用滚轮；Firefox 先验证真实滚轮会推动页面，再以 DOM scrollTo 定位点击检查点；移动模拟用 DOM scrollTo 与模拟触摸。没有据此宣称覆盖实体手指滑动手感。

独立 macOS 原生 HLS 控制器还通过：选定档位重试保留对应 manifest、暂停快速换源时转 MP4 保留位置/音量/暂停意图、销毁清空源，以及销毁后迟到调用不恢复播放。

## 环境问题与修正记录

本地 Chromium 的进程通信 socket 和 Firefox 子进程用户映射受容器限制，未进入页面，不计通过；原始记录保留在 [local-browser-blocked.json](local-browser-blocked.json)。浏览器实测在上述 Actions 环境完成。

初始 CI 暴露了测试定位器重复、WebKit 不支持 wheel 自动化、Firefox 无音频输出/WebGL、音频观察器连接时机、320 像素布局异步稳定、Firefox wheel delta 假设以及桌面 Chromium 无头软件渲染超时。这些修正限定在测试和 CI 环境，没有改动播放器产品代码。前一基线完整通过后，main 又前进 17 提交；已纳入最新蜂巢/HDR/视角并重新构建，完整重跑本表的最终矩阵。为软件渲染保留 600 秒画廊用例预算，仍检查所有展板和章节。最终没有放宽媒体/画质/释放断言，没有将失败改为跳过，也没有用重试隐藏失败；三维仍点击全部七块展板。各轮结果见 [ci-history.json](ci-history.json)。软件渲染速度受 runner 环境影响，本轮不作硬件帧率承诺。

曾试用 glob 测试命令，遇到原主分支已排除、依赖已移除 games/download.js 的旧 download.test.mjs；最终恢复明确合并测试列表，没有删除该旧测试或修改产品迁就它。

## 实机边界和后续流程

- **Mac Safari、iPhone、iPad 实机均未测试。** Playwright WebKit、移动视口、模拟触摸不是实体设备结果。
- 原生触控/时间轴手势、Safari 全屏、系统画中画、锁屏/后台恢复、低电量与移动网络切换、扬声器/耳机实听仍待按 [Safari 实机清单](../oct31-browser-compatibility/safari-device-checklist.md) 完成。Chromium 控件模拟通过不能替代这些项目。
- 解码/PCM 证据不等于实听；短时连续播放不保证整部影片无卡顿，localhost 不代表公网速度；本轮没有对线上站点执行发布验收。
- 当前候选在已测范围内可供合并审查。PR 保持 Draft，原 PR #2 保留；未合并、未部署。进入发布前补齐实机验收，再次核对 main；若代码基线变化，更新候选并重跑相关矩阵。发布后另做线上烟测。
