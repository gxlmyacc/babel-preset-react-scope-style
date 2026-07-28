# Shared demo app

## [中文说明](./README_CN.md)

React demo source used by [webpack](../webpack/), [rspack](../rspack/), [vite](../vite/), [esbuild-bundle](../esbuild-bundle/), and [esbuild-lib](../esbuild-lib/).

- `src/` — application code (demos, components, styles)
- `src/assets/` — static assets (json / txt / png), used by the esbuild lib example to verify non-code file copying
- `scope-style-options.cjs` — shared `babel-preset-react-scope-style` options
- `package.json` — `sideEffects` for `*.scss` / `*.css` (so Webpack does not tree-shake style imports)
- `index.html` — Vite entry HTML
- `public/index.html` — Webpack / Rspack HTML template

Do not run `npm install` here; install dependencies in each bundler example folder.
