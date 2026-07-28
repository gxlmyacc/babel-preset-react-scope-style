# Build tool integrations

See also:

- Full sections in [README.md](../README.md#vite--esbuild--next--rspack--postcss-without-webpack) / [README_CN.md](../README_CN.md#vite--esbuild--next--rspack--postcss非-webpack-场景)
- [Support matrix](./support-matrix.md) (Next/SWC/Turbopack/App Router limits)

## Webpack (default)

**Recommended:** use the Webpack plugin to inject the scope loader **and** the Babel preset into `babel-loader`:

```js
const ReactScopeStyleWebpackPlugin = require('babel-preset-react-scope-style/webpack');

module.exports = {
  module: {
    rules: [
      { test: /\.(js|jsx)$/, use: 'babel-loader' },
      { test: /\.s[ac]ss$/, use: ['style-loader', 'css-loader', 'sass-loader'] },
      { test: /\.css$/, use: ['style-loader', 'css-loader'] },
    ],
  },
  plugins: [
    new ReactScopeStyleWebpackPlugin({
      sourceMap: true,
      babel: { scopePrefix: 'v-', classNameLibrary: 'auto' },
    }),
  ],
};
```

Compatibility: skips loader injection if already present; skips Babel injection if `babel-loader` options / `configFile` / project `babel.config.*` already includes this preset. Set `babel: false` to only inject the loader.

Or call `withReactScopeStyle(config, options)`.

Manual loader: place `babel-preset-react-scope-style/loader` after `css-loader` (see main README).

`webpack` is an optional peer dependency — only required when using the loader / plugin.

Runnable demo: [examples/webpack](../examples/webpack/) (port 3000).

## Vite

```js
// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import reactScopeStyle from 'babel-preset-react-scope-style/vite';

export default defineConfig({
  plugins: [
    reactScopeStyle({ scopePrefix: 'v-', classNameLibrary: 'auto' }),
    react(),
  ],
});
```

Peers: `@babel/core`, and `classnames` or `clsx` when using dynamic `className` expressions.

Component imports stay the same: `import './Button.scss?scoped'`.

## Rspack

**Recommended:** same plugin API as Webpack (`ReactScopeStyleRspackPlugin` / `withReactScopeStyle`):

```js
const ReactScopeStyleRspackPlugin = require('babel-preset-react-scope-style/rspack');

module.exports = {
  module: {
    rules: [
      { test: /\.(js|jsx)$/, use: 'babel-loader' },
      { test: /\.s[ac]ss$/, use: ['style-loader', 'css-loader', 'sass-loader'] },
      { test: /\.css$/, use: ['style-loader', 'css-loader'] },
    ],
  },
  plugins: [
    new ReactScopeStyleRspackPlugin({
      sourceMap: true,
      babel: { scopePrefix: 'v-', classNameLibrary: 'auto' },
    }),
  ],
};
```

Manual loader order remains Webpack-compatible. Runnable demo: [examples/rspack](../examples/rspack/) (port 3001).

## esbuild

### Pure CLI (`react-scope-style`)

Install peers: `@babel/core`, `esbuild`, and `classnames` or `clsx` when using dynamic `className`. For SCSS install `sass`; for Less install `less`.

```bash
react-scope-style build --bundle --entry src/main.jsx --out ./dist --scope-style --sourcemap
react-scope-style start --config esbuild-scope.config.js --scope-style --serve-port 3002

# Library mode (default: multi-file ESM, like react-esm-project)
react-scope-style build --src ./src --out ./esm --scope-style --typescript
```

Config file: `esbuild-scope.config.js` — see README esbuild section for full CLI flags.

Runnable demos: [examples/esbuild-bundle](../examples/esbuild-bundle/) (SPA, port 3002), [examples/esbuild-lib](../examples/esbuild-lib/) (library mode).

### Programmatic plugin

```js
import reactScopeStyle from 'babel-preset-react-scope-style/esbuild';

export default {
  entryPoints: ['src/main.jsx'],
  bundle: true,
  jsx: 'automatic',
  plugins: [
    reactScopeStyle({ scopePrefix: 'v-', classNameLibrary: 'auto' }),
  ],
};
```

1. The plugin runs Babel with this preset on `.js` / `.jsx` / `.ts` / `.tsx` (same as Vite).
2. Style imports like `import './Button.scss?scoped'` are rewritten to include `scope-style&scoped=true&id=v-xxx` (bundle mode) or plain `.css` (lib mode with `StyleScoped` bridge).
3. When esbuild loads scoped styles, the plugin compiles preprocessors (if needed) and runs the PostCSS scope transform.

## Next.js

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
  // your Next config
}, {
  loaderOptions: { sourceMap: true },
});
```

**Limits:** Babel config is required (not SWC-only). Turbopack is not supported. **Pages and App Router are both supported** with Babel + webpack. Details: [support-matrix.md](./support-matrix.md).

Runnable demos: [examples/next](../examples/next/) (Pages, port 3003), [examples/next-app](../examples/next-app/) (App Router, port 3004).

## Pure PostCSS

Only when **not** using the Webpack loader or Vite plugin:

```js
// postcss.config.js
module.exports = {
  plugins: [
    require('babel-preset-react-scope-style/postcss')({
      scoped: true,
      global: false,
      id: 'v-your-scope-id',
    }),
    // Optional: run AFTER the scope plugin if you need flattened CSS for older browsers
    // require('postcss-nesting'),
  ],
};
```

Keep `id` in sync with the scope class Babel injects into JSX.

**Plugin order:** `babel-preset-react-scope-style/postcss` must run on the **nested Rule tree** (PostCSS 8+ native nesting). If you add `postcss-nesting` to emit flat selectors for legacy browsers, list it **after** the scope plugin so scoping uses the same leaf-gate rules, then nesting only flattens output.
