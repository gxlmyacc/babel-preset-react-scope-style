# Examples

Runnable demos for [babel-preset-react-scope-style](../README.md).

## [中文说明](./README_CN.md)

| Directory | Role |
|-----------|------|
| [shared](./shared/) | **Shared** React app (`src/`, styles, demo menu) |
| [webpack](./webpack/) | Webpack 5 + Babel preset + `ReactScopeStyleWebpackPlugin` |
| [rspack](./rspack/) | Rspack + Babel preset + `ReactScopeStyleRspackPlugin` |
| [vite](./vite/) | Vite + `babel-preset-react-scope-style/vite` |
| [esbuild-bundle](./esbuild-bundle/) | esbuild CLI — **bundle** mode (SPA, shared app) |
| [esbuild-lib](./esbuild-lib/) | esbuild CLI — **lib** mode (multi-file ESM, shared app) |
| [next](./next/) | Next.js **Pages Router** + `babel-preset-react-scope-style/next` |
| [next-app](./next-app/) | Next.js **App Router** + Babel + `withReactScopeStyle` (not SWC-only / not Turbopack) |
| [next-swc-poc](./next-swc-poc/) | Phase **B1** SWC + webpack CSS; B2 Turbopack infra (14.2 turbo not runnable yet) |

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

Each bundler folder links the parent package via `"babel-preset-react-scope-style": "file:../.."`. Each has `.npmrc` with `install-links=false` (copies instead of symlinks on Windows).

## i18n

The shared app supports **English** (default) and **Chinese**. Copy lives under `shared/src/i18n/locales/`. Use the language dropdown in the top bar; the choice is stored in `localStorage` (`react-scope-style-demo-locale`).

## Demo menu

| Scene | What it shows |
|-------|----------------|
| **Basic scoped** | `?scoped` import, default scope on last selector segment |
| **Shared global** | `?global` import, `[class*=ex-]` shared styles |
| **:scope selectors** | Default vs `.box:scope` vs `.box :scope` |
| **:global selectors** | Leading `:global` and nested `:global .external-widget` |
| **Pass-through child** | Parent `className` + `.skin-a:scope` targeting child inner nodes |
| **Custom classAttrs** | `wrapClassName` on mock modal |

Scope options are defined once in `shared/scope-style-options.cjs`.
