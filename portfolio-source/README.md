# 程子悦 · 三维交互作品集

数字媒体技术专业。展示 Unity 游戏开发、软件开发、视频制作与剪辑及 AI 影像创作。

公开地址：https://chengzy0424.github.io/czy/ 。最新视觉修正与浏览器验证记录见 `verification/oct30-refinement/README.md`；此前的影片接入记录见 `verification/oct30-release.json`。

## 内容

- 四款 Unity 游戏：Tower Defense、far cry / Ash Exodus、Csol far、saolei。现在仅提供真实玩法演示视频，发布内容已移除网页试玩及引擎构建。演示含游戏原声，点击播放默认开启声音。
- BOE 精电显示技术有限公司实习：PSV 开发部产品开发科电子设计岗。四款 Android HMI Demo 的职责和开发经历，尚不展示未确认可公开的界面。
- 三部个人影像：《墨菲定律》《海勒姆定律》《熟悉的陷阱》。
- 两部 AIGC 影像：《空格里的小镇》《一弧之间》。
- ARPG 仍处于计划阶段。
- 邮箱 434902760@qq.com，电话 13318994968。

## 运行

Node 22.12+，安装依赖后 `npm run dev`。`npm run build` 生成 release-oct30，`npm run preview` 预览生产输出。`npm test` 检查连续镜头、几何体、深度、粒子恢复与网页交互。`node tools/check-delivery.mjs` 检查媒体格式、快速起播结构及资源响应。

GitHub Pages 使用相对资源路径。仓库根目录是发布产物，portfolio-source 是源码；公开媒体由根目录共享，运行源码中的发布构建脚本会复制所需媒体。不存在必须下载游戏引擎才能观看项目的流程。

## 设计与加载

原创 ZY 连续曲面标志、两只半透明水母、定向流光、连续滚动镜头、不同深度的作品展板、红色机械区域与蜂窝区域。参考的是实际观看的录屏内部空间关系、光线和运动，不包含抖音界面或播放器。

未使用 Blender。使用 Three.js 程序化几何与着色器；这些是本项目的实现选择，不代表已核实参考网站技术。

文字和入口先显示，三维代码延后加载；几何构建分段让出主线程，支持异步着色器编译。手机减少粒子数量和像素密度；减少动态、静态后备、直接查看作品均可用。画廊纹理接近相应章节才加载。

视频只在用户点击时加载，播放详情打开时背景动画暂停，关闭后释放播放器。影片默认 720p，可切换 1080p；H.264/AAC MP4，moov 索引前置，支持 Range 拖动。四款游戏均含原声；FPS 默认 720p/60fps，支持高清档和 480p/30fps 流畅档，自动模式在持续缓冲时降低画质。切换保留播放位置、暂停状态及音量。封面提供 480/960/1440 三档 WebP。

## 维护

`src/portfolio.js` 管理影片元数据与详情；`index.html` 含无需等待三维加载即可阅读的项目内容。添加影片时同步更新数据与静态列表。原始游戏工程和原始桌面影片不属于发布文件，不应删除。

性能记录只说明测试设备与网络条件。没有承诺所有设备稳定 60 帧；实体手机、不同运营商网络及 Safari 等环境须进一步验证。Git 历史仍可能保留早期游戏大文件，本轮不重写历史。

本轮四帧结构修正与验证：[oct30-reference-match](verification/oct30-reference-match/review.md)。

本轮原声媒体与交互精修验证：[oct30-audio-refinement](verification/oct30-audio-refinement/review.md)。