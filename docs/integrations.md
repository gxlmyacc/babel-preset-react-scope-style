# Build tool integrations

See also the full sections in [README.md](../README.md#vite--rspack--postcss-without-webpack) and [README_CN.md](../README_CN.md#vite--rspack--postcss非-webpack-场景).

## Webpack (default)

Use the Babel preset and place `babel-preset-react-scope-style/loader` after `css-loader` (see main README).

`webpack` is an optional peer dependency — only required when using the loader.

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

Same loader order as Webpack. Example:

```js
const scopeLoader = require.resolve('babel-preset-react-scope-style/loader');

module.exports = {
  module: {
    rules: [
      {
        test: /\.s[ac]ss$/,
        use: ['style-loader', 'css-loader', { loader: scopeLoader }, 'sass-loader'],
      },
    ],
  },
};
```

Optional: `require('babel-preset-react-scope-style/rspack').withReactScopeStyle(config)`.

Runnable demo: [examples/rspack](../examples/rspack/) (shared app, port 3001).

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
