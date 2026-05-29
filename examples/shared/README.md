# Shared demo app

React demo source used by [webpack](../webpack/)、[rspack](../rspack/)、[vite](../vite/)、[esbuild-bundle](../esbuild-bundle/) 与 [esbuild-lib](../esbuild-lib/) 示例。

- `src/` — application code (demos, components, styles)
- `src/assets/` — 静态资源（json / txt / png），供 esbuild lib 模式验证「非代码文件复制」
- `scope-style-options.cjs` — shared `babel-preset-react-scope-style` options
- `package.json` — `sideEffects` for `*.scss` / `*.css` (Webpack 不会摇掉样式 import)
- `index.html` — Vite entry HTML
- `public/index.html` — Webpack / Rspack HTML template

Do not run `npm install` here; install dependencies in each bundler example folder.
