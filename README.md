# 长句翻译（纯静态）

由 `jingtaiPage/tran` 中 **长句翻译**（`src/views/long.vue` + `tools1.js`）迁移而来：**无 Webpack/Vite**，单页通过 CDN 加载 Vue 3、Element Plus、Lodash、SheetJS、js-md5，与原版 UI 与交互一致。

## 本地调试

```bash
cd jingtaiPage/translate
npm run dev
```

浏览器打开 `http://localhost:8000/`（或终端提示的地址）。

## 功能说明

- 多 Tab、子应用编码 / 所属模块 / 全页翻译开关 / 迭代标记  
- 表格：中文表达式、英文表达式、大写、词条编码  
- 新增 10 行、翻译（百度通用翻译 JSONP）、复制 JSON、保存（`localStorage` 键与 Vue 版一致：`ipd_tarnslate_longDatas`）、导出 Excel、复制枚举/常量、清除全部  
- 顶部菜单样式与 `tran` 的 `App.vue` 一致（仅保留「长句翻译」一项）

## 安全与合规

- 百度 `appid` / 密钥仍写在客户端逻辑中（与旧 `tran` 一致）。**公开部署前请替换为你方申请的密钥**，勿将真实密钥提交到公开仓库。  
- 翻译接口已使用 **HTTPS**（`https://fanyi-api.baidu.com/...`），便于在 GitHub Pages 等 HTTPS 站点下使用。

## 部署

将本目录 **`index.html`、`app.js`** 与 `package.json`（可选）一并上传至静态托管即可；`npm run dev` 仅用于本地预览。
