# Support matrix

Compatibility and known limits for [babel-preset-react-scope-style](../README.md).

| Tool | JSX / Babel | CSS scoping | Status | Notes |
|------|-------------|-------------|--------|-------|
| **Webpack 4/5** | Preset via `babel-loader` or `ReactScopeStyleWebpackPlugin` | Plugin auto-inject or manual `/loader` | Supported | Recommended path |
| **Rspack** | Same as Webpack (`babel-loader` + preset) | `ReactScopeStyleRspackPlugin` (same inject logic as Webpack) | Supported | Shares Webpack injection helpers |
| **Vite** | `/vite` plugin runs Babel preset | Plugin runs PostCSS scope | Supported | Put before `@vitejs/plugin-react` |
| **esbuild** | `/esbuild` plugin or `react-scope-style` CLI | Plugin / CLI runs PostCSS scope | Supported | Optional `sass` / `less` |
| **Next.js Pages Router** | `babel.config.js` (`next/babel` + this preset) | `/next` injects webpack loader | Supported | [examples/next](../examples/next/) |
| **Next.js App Router** | Same Babel requirement | Same loader inject via webpack | Supported (Babel required) | [examples/next-app](../examples/next-app/); not SWC-only |
| **Next.js Turbopack** | — | — | Not supported | Relies on webpack loader injection |
| **Pure SWC / SWC-only Next** | — | — | Not supported | No SWC plugin yet; requires Babel |
| **CSS Modules `:global(...)`** | — | — | Not supported | Use leading / middle `:global` forms only |
| **Stylelint** | — | Optional rules under `/stylelint` | Supported | Optional peer |

## Next.js requirements

1. **Babel is required** (Pages and App Router). Presence of `babel.config.js` (or `.babelrc`) makes Next use Babel instead of a SWC-only pipeline for JS/TS transforms that need this preset.
2. Wrap `next.config.js` with `withReactScopeStyle` so the scope loader is injected into webpack style rules.
3. **Turbopack (`next dev --turbo`) is not supported** while scoping depends on the webpack loader.
4. **App Router is supported** with the same Babel + webpack setup; there is no SWC replacement yet.

### Minimal App Router setup

```js
// babel.config.js
module.exports = {
  presets: [
    'next/babel',
    ['babel-preset-react-scope-style', { scopePrefix: 'v-', classNameLibrary: 'auto' }],
  ],
};

// next.config.js
const withReactScopeStyle = require('babel-preset-react-scope-style/next');
module.exports = withReactScopeStyle({
  // your Next config — do not use next dev --turbo
}, { loaderOptions: { sourceMap: true } });
```

```js
// app/page.js
'use client';
import './Button.scss?scoped';
export default function Page() {
  return <button className="btn">OK</button>;
}
```

Runnable demos:

- Pages Router: [examples/next](../examples/next/) (port 3003)
- App Router: [examples/next-app](../examples/next-app/) (port 3004)

## Runtime entry

All integrations resolve the Babel preset from **`src/index.js`** (package `main` / `exports["."]`). Do not rely on a separate `esm/` build for the options singleton shared with PostCSS.

## Node.js

| Surface | Requirement | Notes |
|---------|-------------|-------|
| **Package runtime** (`engines`) | **Node >= 14.17** | Optional chaining / nullish coalescing; `glob@10` + `commander@9` |
| **Unit tests / coverage** | **Node >= 18** | Uses built-in `node:test`; `c8@11` coverage runs on Node 20+ in CI |
| **CI smoke** | Node 14.17 | `npm run smoke:runtime` loads preset / PostCSS / bundler entry points |
