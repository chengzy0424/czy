# Safari 路径与跨浏览器兼容性补充

日期：2026-10-31（Asia/Shanghai）。基准为 `main` 的 `39af6df828ff96615cab66a85d7bc5edd08ae322`，本轮重新查询远端仍为同一提交。原有 `oct30-video-streaming/native.json` 的范围确实是桌面 Edge；它没有声称 Safari 实机通过。本轮同样没有实体 Mac Safari、iPhone 或 iPad，不能据下列结果判定 Safari 实机已通过，也没有确认 Safari 本身存在播放故障。

## 修复与依据

1. **原生 HLS 重试会忘记手动档位。** 原代码的 `start()` 无论选择什么档位都重新加载 master，选择框却保留原值。现在初次播放、切换和重试共享所选清单解析。状态测试在旧代码失败，Edge 实际原生解码器上的控制器集成测试验证重试后仍加载 `/720/index.m3u8`，位置保留。
2. **暂停后快速换源再转 MP4 会自行播放。** `load()` 会清空就绪状态；旧代码把 `readyState===0` 当成播放意图。现在在元数据尚未到达时保留上一次时间与暂停意图。真实原生分支测试延迟新清单，暂停切档后立即转 MP4，确认仍暂停、进度和音量保留。
3. **自动进入 MP4 后仍显示可操作的画质菜单。** 旧代码只在点击兼容按钮时禁用菜单，自动降级没有同步。`browser-before.json` 在实际 Edge 中复现“视频已经转 MP4、菜单仍 enabled”。现在由播放模式统一控制菜单，手动和自动后备一致。
4. **旧请求可能覆盖新状态。** 原生换源后，旧 `play()` 的延迟拒绝可能覆盖当前提示；旧的排队暂停事件也可能把正在播放的状态写成暂停。现在播放承诺按加载代次隔离，暂停事件额外核对实际 paused 状态。这两项由明确标为状态模型的回归测试覆盖，不冒充 Safari 事件顺序实测。

另外把原生 HLS/MP4 的停止、移除 src 和 load 清理集中到 `controller.destroy()`，并让销毁后的迟到调用无效。**原来的外层 `releaseMedia()` 已经清理视频，因此这项是统一释放职责的加固，不能表述为已经复现线上关闭后泄漏。** 控制器直接销毁、启动中关闭、返回列表和普通关闭均有测试。

原有基础测试中有 3 项因缺少 `IntersectionObserver` 测试替身而失败，本轮修正测试环境。没有因此修改三维实现。

## 实际测试矩阵

Windows 主机，Playwright 1.62.1，单 worker、无自动重试；`source-matrix.json` 记录 **102 通过、10 跳过、0 失败**。本地服务运行当前源码，媒体来自基准仓库的原始文件。1,138 个媒体/封面/许可文件逐一核对 Git blob 哈希，全部一致，见 `fixture-verification.json`；没有用占位影片替代。

| 环境 | 实际视频路径 | 九部影片 | 音频证据 | 通过 / 跳过 |
| --- | --- | --- | --- | --- |
| Chrome 156.0.8078.76 | HLS.js / MSE | 9/9 操作链通过 | 浏览器音频解码字节增长 | 15 / 1 |
| Edge 156.0.4314.50 | HLS.js / MSE | 9/9 操作链通过 | 浏览器音频解码字节增长 | 15 / 1 |
| Firefox 153.0（Playwright 构建） | HLS.js / MSE | 9/9 操作链通过 | Web Audio 非零 PCM 信号 | 15 / 1 |
| Edge 原生分支 | 真实原生 HLS 解码；测试只隐藏 MediaSource | 9/9 操作链通过 | 记录原生音频解码字节；不是实听 | 16 / 0 |
| Edge 390×844 触摸模拟 | HLS.js / MSE | 9/9 操作链通过 | 浏览器音频解码字节增长 | 15 / 1 |
| Windows WebKit 26.5 | 自动后备 MP4 | 9/9 兼容播放操作链通过 | **未验证** | 13 / 3 |
| Windows WebKit 390×844 触摸模拟 | 自动后备 MP4 | 9/9 兼容播放操作链通过 | **未验证** | 13 / 3 |

HLS 操作链：起播、有图像、短时连续前进、API 跳转到约 60%、暂停、快速选低/高档后仍暂停、恢复、实际解码分辨率达到所选档位、回到自动、音量保留、关闭释放。MP4 环境检查菜单禁用，不执行不存在的 HLS 档位切换。每部连续进度样本约三秒，不能推导整片或任意网络无卡顿。

其他断言覆盖首屏和浏览项目不请求影片、320/390 像素无水平溢出、触摸入口和返回、焦点恢复、失败后 MP4 恢复、启动中关闭，以及三维渲染在详情后暂停、关闭后继续。所有环境的三维暂停/恢复用例均通过。

10 项跳过来自测试项目分工或环境能力：6 项原生控制器用例仅在实际具备原生能力的项目执行；两种 Windows WebKit 环境各跳过 HLS 片段故障恢复和独立音频证明用例。跳过不计为通过。

## 原生控件与生产文件

`controls.json` 为编译后页面上的 **4/4 通过**：Chrome、Edge、Edge 原生 HLS、Edge 触摸模拟。实际点击浏览器原生暂停/播放控件，拖动原生进度条到后段，再恢复。桌面使用鼠标拖动，触摸用 CDP 触摸序列；后者不是手指在实体设备上的测试。Firefox/WebKit 原生控件的手势没有在此用例覆盖。

发布入口已指向 `assets/index-C43vUNQ5.js`，关联空间模块为 `space-C5oQMon5.js`。Vite 生产代码构建通过；此稀疏检出只重新打包 HTML/JS/CSS，使用现存且哈希已验证的媒体，不重编码或重打包视频。CSS、Three.js、HLS.js 和启动索引保持原有内容哈希。新的空间模块文件名来自其对主模块的引用变化，三维源码没有修改。

`production-edge.json` 记录编译产物的完整 Edge 回归，**15/15 通过**，包含九部影片与页面行为。测试使用本地生产预览，不是 GitHub Pages 已部署新代码的声明。

完整源码矩阵之后，仅将暂停换档提示简化为“已暂停”，避免元数据就绪后仍显示“正在切换”；媒体逻辑没有再改变。最终文件重新运行 18 项基础/状态测试、15 项生产 Edge 测试、4 项生产原生控件测试，以及 `final-native.json` 中的原生控制器集成测试。

## 必须保留的边界

- **没有 Safari/iPhone 实机通过结论。** [Playwright 官方说明](https://playwright.dev/docs/browsers#webkit)明确指出 WebKit 构建不是 Safari，视频能力随操作系统变化。在本机，WebKit 的 User-Agent 虽包含 Macintosh/Safari，`navigator.platform` 实际为 Win32，原生 HLS 能力为空、MediaSource 不可用，影片实际进入 MP4。
- **Windows WebKit 声音未验证。** 本轮该构建没有 AudioContext，音频字节计数为零且没有可用音轨观测结果。视频时间前进和 `muted=false` 均不能证明声音通过，所以独立声音用例明确跳过。
- **不把音频观测器插入原生 HLS。** WebKit 对该组合有[公开问题记录](https://bugs.webkit.org/show_bug.cgi?id=180696)；测试仪器可能改变媒体行为。Chromium 原生分支记录现成解码计数，其他原生环境若无计数需实听。所有自动化音频证据都不是实体扬声器/耳机验收。
- **实机触摸、全屏、系统音量、低电量模式、后台/锁屏恢复，以及蜂窝网络切换仍待验证。** 清单和九部影片的未测表保留在 [safari-device-checklist.md](safari-device-checklist.md)。
- 首段加载仍受网络影响。两条流媒体路径均依赖 GitHub，并不是独立的地区 CDN。本地速度不代表访客速度。

## 失败记录与复跑

`existing-before.txt` 保留原有 3 项测试环境失败；`unit-before.txt` 使用基准播放器与本轮状态测试运行，1 通过、6 失败，其中包含新增控制器职责断言；`unit-after.txt` 为修复后 18/18 通过。新增职责断言的失败不应全称为既有产品故障。

`browser-before.json` 保留自动 MP4 菜单问题的实际浏览器失败。`smoke.json` 和 `local-csol.json` 是早期排查记录：有公网媒体延迟，也有测试错误地假设所有引擎都能提供音频分析/计数的失败。后续使用明确能力边界与哈希一致的本地媒体完成最终矩阵。公网高档切换在本地未复现，尚不足以单独归因于浏览器；没有将探索记录删掉或算成通过。

执行说明见 [browser README](../../portfolio-source/tests/browser/README.md)。常用命令：

```sh
cd portfolio-source
pnpm install --frozen-lockfile
pnpm exec playwright install firefox webkit
pnpm test
pnpm test:browser --project=firefox --project=webkit
# 已安装 Chrome 和 Edge 时，运行完整矩阵：
pnpm test:browser
```

最终播放器源码 SHA-256：`2d6df46722eabef75dbfd72938310ce4ac9c10798397c2d3608c47b9d9fc4e4d`；组合界面源码 SHA-256：`09313d27d38e9378b534841451509d1d9a398d2a4523c4614b7d3284f272f9a2`。完整源码矩阵时播放器哈希为 `8c06fa1afc1ae060d47e0374f3fb1071dcbb9ec93092115a0246fa23ea64f894`，与最终版本仅上述提示文字不同。
