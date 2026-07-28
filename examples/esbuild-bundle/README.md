# esbuild bundle example

## [中文说明](./README_CN.md)

**Bundle mode**: single-entry SPA build. Shares the [`../shared/`](../shared/) app with the webpack / rspack / vite examples.

| Item | Source |
|------|--------|
| Source | `../shared/src/` (`root` + `entry` point at shared) |
| Scope options | `../shared/scope-style-options.cjs` |
| React deps | This folder’s `node_modules` (via `alias`) |
| Static entry | `public/index.html` here (loads `main.js` / `main.css`) |

## Setup

```bash
cd examples/esbuild-bundle
npm install
```

## Scripts

- `npm run dev` — watch + serve → open http://localhost:3002/ to debug the shared demo app
- `npm run build` — writes `public/main.js` + `public/main.css`

Config: [`esbuild-scope.config.cjs`](./esbuild-scope.config.cjs) (auto-discovered by the CLI).

## Equivalent CLI

```bash
react-scope-style build
react-scope-style start
```

## Notes

- `public/index.html` is esbuild-specific (webpack/rspack inject scripts via HtmlWebpackPlugin; vite uses `index.html` at the shared root)
- The first `npm run dev` watches then starts the static server; if the page is blank, confirm `public/main.js` was generated
- For lib mode (multi-file ESM), see [`../esbuild-lib/`](../esbuild-lib/)
