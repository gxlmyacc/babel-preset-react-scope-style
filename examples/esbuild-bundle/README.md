# esbuild bundle 示例

**Bundle 模式**：单入口打包 SPA，与 webpack / rspack / vite 示例共用 [`../shared/`](../shared/) 应用。

| 项 | 来源 |
|----|------|
| 源码 | `../shared/src/`（`root` + `entry` 指向 shared） |
| scope 配置 | `../shared/scope-style-options.cjs` |
| React 依赖 | 本目录 `node_modules`（`alias` 解析） |
| 静态入口 | 本目录 `public/index.html`（引用打包产物 `main.js` / `main.css`） |

## Setup

```bash
# repository root
npm run build
cd examples/esbuild-bundle
npm install
```

## Scripts

- `npm run dev` — watch + serve → 打开 http://localhost:3002/ 即可调试 shared 演示应用
- `npm run build` — 输出到 `public/main.js` + `public/main.css`

配置见 [`esbuild-scope.config.cjs`](./esbuild-scope.config.cjs)（CLI 自动发现）。

## 等价 CLI

```bash
react-scope-style build
react-scope-style start
```

## Notes

- `public/index.html` 为 esbuild 专用入口（webpack/rspack 由 HtmlWebpackPlugin 注入脚本；vite 使用 shared 根目录 `index.html`）
- 首次 `npm run dev` 会先 watch 构建再启动静态服务；若页面空白，确认 `public/main.js` 已生成
- 库模式（多文件 ESM）见 [`../esbuild-lib/`](../esbuild-lib/)
