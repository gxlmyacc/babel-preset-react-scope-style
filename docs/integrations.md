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
