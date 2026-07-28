# Examples

Runnable demos for [babel-preset-react-scope-style](../../README.md).

| Directory | Role |
|-----------|------|
| [shared](./shared/) | **Shared** React app (`src/`, styles, demo menu) |
| [webpack](./webpack/) | Webpack 5 + Babel preset + `ReactScopeStyleWebpackPlugin` |
| [rspack](./rspack/) | Rspack + Babel preset + `ReactScopeStyleRspackPlugin` |
| [vite](./vite/) | Vite + `babel-preset-react-scope-style/vite` |
| [esbuild-bundle](./esbuild-bundle/) | esbuild CLI — **bundle** 模式（SPA，shared 应用） |
| [esbuild-lib](./esbuild-lib/) | esbuild CLI — **lib** 模式（多文件 ESM，shared 应用） |
| [next](./next/) | Next.js **Pages Router** + `babel-preset-react-scope-style/next` |
| [next-app](./next-app/) | Next.js **App Router** + Babel + `withReactScopeStyle`（非 SWC / 非 Turbopack） |

Application code for all bundler examples lives under `shared/`.

## Setup

Pick a bundler (parent package is linked via `"babel-preset-react-scope-style": "file:../.."`; no root compile step — the package runs from `src/`):

```bash
cd examples/webpack   # or rspack / vite / esbuild-bundle / esbuild-lib / next / next-app
npm install
npm run dev
```

- Webpack: http://localhost:3000
- Rspack: http://localhost:3001
- Vite: http://localhost:5173
- esbuild bundle: http://localhost:3002
- Next.js Pages: http://localhost:3003
- Next.js App Router: http://localhost:3004

Both link the parent package via `"babel-preset-react-scope-style": "file:../.."`. Each bundler folder has `.npmrc` with `install-links=false` (copies instead of symlinks on Windows).

## i18n

The shared app supports **English** (default) and **Chinese**. Copy lives under `shared/src/i18n/locales/`. Use the language dropdown in the top bar; the choice is stored in `localStorage` (`react-scope-style-demo-locale`).

## Demo menu

| Scene | What it shows |
|-------|----------------|
| **基础 scoped** | `?scoped` import, default scope on last selector segment |
| **共享 global** | `?global` import, `[class*=ex-]` shared styles |
| **:scope 选择器** | Default vs `.box:scope` vs `.box :scope` |
| **:global 选择器** | Leading `:global` and nested `:global .external-widget` |
| **透传子组件** | Parent `className` + `.skin-a:scope` targeting child inner nodes |
| **自定义 classAttrs** | `wrapClassName` on mock modal |

Scope options are defined once in `shared/scope-style-options.cjs`.
