# 共享演示应用

## [English](./README.md)

供 [webpack](../webpack/)、[rspack](../rspack/)、[vite](../vite/)、[esbuild-bundle](../esbuild-bundle/) 与 [esbuild-lib](../esbuild-lib/) 使用的 React 演示源码。

- `src/` — 应用代码（demos、组件、样式）
- `src/assets/` — 静态资源（json / txt / png），供 esbuild lib 模式验证「非代码文件复制」
- `scope-style-options.cjs` — 共享的 `babel-preset-react-scope-style` 选项
- `package.json` — 为 `*.scss` / `*.css` 声明 `sideEffects`（Webpack 不会摇掉样式 import）
- `index.html` — Vite 入口 HTML
- `public/index.html` — Webpack / Rspack HTML 模板

请勿在此目录执行 `npm install`；请在各 bundler 示例目录安装依赖。
