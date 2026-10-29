# 作品集源码

网站公开入口：https://chengzy0424.github.io/czy/

在本目录执行 `npm install` 或 `pnpm install`，然后 `npm run build`。构建脚本先将仓库根目录的 art / games / media / licenses / SVG 复制到被 Git 忽略的 public 目录，再运行 Vite。这样 Git 仓库只保存一份大型游戏与影片文件。

`npm run preview` 预览构建；`npm test` 运行 12 项几何、DOM 交互与下载恢复检查。开发时先完成一次 build，再 `npm run dev`。后续发布将 dist 内容复制回仓库根目录并推送 main；保留 coffee 和 portfolio-source 目录。

游戏与影片数据在 src/portfolio.js，项目正文在 index.html。参考和原型说明见 DESIGN.md。根目录 verification/browser-review.json 记录当前真实浏览器检查范围。
