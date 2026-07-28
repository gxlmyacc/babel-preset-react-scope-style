# esbuild lib example

## [中文说明](./README_CN.md)

**Lib mode (default)**: multi-file ESM output. Shares [`../shared/`](../shared/) sources with webpack / vite / esbuild-bundle.

- Imports rewritten to plain `.css` (no `?scope-style` query)
- Styles scoped via the `StyleScoped` bridge map
- Non-code files under `shared/src/assets/` (json / txt / png) are copied as-is to the output

## Setup

```bash
cd examples/esbuild-lib
npm install
npm run build
```

Output directories:

- `npm run build` → `esm/` (config file + `scopeStyleOptions`)
- `npm run build:defaults` → `dist/` (no config file, pure CLI defaults)

## Configuration

### Config file (recommended)

[`lib-scope.config.cjs`](./lib-scope.config.cjs) uses a non-default filename, so pass `--config` explicitly:

```bash
npm run build
# equivalent to
react-scope-style build --config lib-scope.config.cjs
```

### Pure CLI defaults (no config file)

```bash
npm run build:defaults
# equivalent to
react-scope-style build --root ../shared --src ./src --out ../esbuild-lib/dist
```

`root` points at shared (sources are not in this folder). Lib mode and `scopeStyle` are CLI built-in defaults. The scope namespace is read from shared’s `package.json` (`react-scope-style-demo-shared`); the prefix is the preset default `v-` when `scopeStyleOptions` is omitted.

Config file essentials:

```javascript
module.exports = {
  root: '../shared',
  src: './src',
  out: './esm',
  scopeStyleOptions: require('../shared/scope-style-options.cjs'),
};
```

Lib mode (`bundle: false`) and `scopeStyle` are CLI defaults.

## Verify

After build (`npm run build` / `esm/`):

- `esm/main.js` — imports are plain `.css` (no query)
- `esm/demos/ScopedBasic/ScopedBasic.css` — selectors include `ex-` scope classes
- `esm/assets/meta.json`, `note.txt`, `logo.png` — match `shared/src/assets/`

SPA bundle example: [`../esbuild-bundle/`](../esbuild-bundle/).
