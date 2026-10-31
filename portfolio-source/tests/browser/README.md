# 跨浏览器视频回归

这些测试运行真实浏览器进程，读取真实影片，不替换成功的媒体响应。默认从仓库根目录读取 `media/`、`art/`。测试页面使用当前源码，独立服务运行在 `127.0.0.1:4186`，不要求预先复制数百 MB 媒体到 `public/`。

## 运行

在 `portfolio-source` 中，使用 Node 22.12+：

```sh
pnpm install --frozen-lockfile
pnpm exec playwright install firefox webkit
pnpm test
pnpm test:browser --project=firefox --project=webkit
```

电脑已经安装 Chrome 和 Edge 时，可以运行完整矩阵：

```sh
pnpm test:browser
```

首次安装所需的 Playwright 浏览器约占数百 MB。测试不会自动安装或替换电脑上的 Chrome/Edge。测试固定 Playwright 版本为 1.62.1，浏览器版本写入结果；升级时需重新安装匹配的引擎并重跑。

| 项目 | 环境含义 |
| --- | --- |
| chrome / edge | 已安装的真实桌面 Chrome / Edge |
| firefox | Playwright 的 Firefox 构建；不是改 User-Agent 的 Chromium |
| webkit | Playwright WebKit 构建；不是 Safari 应用 |
| edge-native-branch | 只隐藏测试上下文的 MediaSource，使用 Edge 实际提供的原生 HLS 解码器；不伪造 canPlayType，不代表 Safari |
| edge-touch / webkit-touch | 390×844 的触摸与移动视口模拟；不是实体手机 |

在 Mac 上运行 `pnpm test:browser --project=webkit --project=webkit-touch` 可以补充平台相关的原生播放检查，仍不能写成“实体 iPhone/Safari 已通过”。实体设备步骤见仓库的 `verification/oct31-browser-compatibility/safari-device-checklist.md`。

## 断言和证据

- 九部影片分别验证起播、短时进度连续增长、未静音、音量保留、暂停、60% 位置跳转、暂停时快速选择画质、恢复、回到自动画质、关闭后清空视频源和停止新媒体请求。
- 画质断言检查实际解码分辨率，MP4 后备路径则检查画质菜单禁用。MP4 环境不会假装支持 HLS 画质切换。
- `controls.spec.mjs` 在 Chromium 原生控件上实际点击暂停/恢复并拖动时间轴。触摸用例通过 CDP 注入触摸手势，仅是模拟。Firefox/WebKit 控件的手势和实体 iPhone 控件仍须手测。
- Chromium 使用音频解码字节计数；支持的其他环境使用非零 Web Audio PCM 信号。原生 HLS 不接入 Web Audio，避免测试改变音频路径。Windows Playwright WebKit 缺少可用音频观测接口，独立声音用例明确跳过，其他用例附带 `audio-unverified`，不能据其视频画面移动断言声音通过。
- 真实片段请求被故意中止后，检查兼容 MP4 能恢复。另一个用例模拟“不支持 HLS/MSE”，检查自动后备和禁用画质。注入仅发生在该测试上下文中。
- 独立原生控制器页面覆盖手动档位重试、暂停状态下换源未完成时转 MP4、控制器直接销毁及销毁后的迟到调用。
- 检查首屏/浏览项目无视频请求，320/390 像素布局无水平溢出，触摸打开/返回，关闭时恢复焦点，三维渲染在详情后暂停并在关闭后继续。

`test-results/results.json` 保存结果和 JSON 附件。失败时同时保存截图与 Playwright trace。默认没有自动重试；跳过、失败与通过分开计数。声音输出到实体扬声器/耳机、iOS 系统音量策略、Safari 全屏和系统画中画不在自动化结论内。

## 可选环境变量

- `TEST_MEDIA_ROOT`：已验证的本地媒体副本根目录，包含 `media/` 和 `art/`。本轮副本逐文件核对了 Git blob 哈希，不改动影片。
- `TEST_MEDIA_ORIGIN=https://chengzy0424.github.io/czy`：明确选择公网媒体，测试代码仍运行在本地。此时代理与公网延迟会影响连续播放，不等于公网部署后的完整站点回归。
- `PLAYWRIGHT_BASE_URL`：改为已启动的预览或发布站点，测试不再启动本地服务。`native.spec.mjs` 需要源码测试页面，面向发布站点时运行 `playback.spec.mjs` 和 `controls.spec.mjs`。
- `PLAYWRIGHT_JSON_OUTPUT_FILE`：持久保存某次运行的报告，防止后续运行覆盖。

浏览器测试只验证当次样本。三秒连续进度断言不等于完整影片无卡顿；localhost 起播速度不代表招聘者的网络。`flowToPlayingMs` 包括打开项目和点击影片的整个操作流程，不是精确的媒体起播延迟。
