# babel-preset-react-scope-style

A comprehensive solution for scoping styles in React components, with Babel and PostCSS plugins plus build integrations for Webpack, Rspack (loader), Vite, esbuild, and Next.js.

[![NPM version](https://img.shields.io/npm/v/babel-preset-react-scope-style.svg?style=flat)](https://npmjs.com/package/babel-preset-react-scope-style)
[![NPM downloads](https://img.shields.io/npm/dm/babel-preset-react-scope-style.svg?style=flat)](https://npmjs.com/package/babel-preset-react-scope-style)

## [中文说明](README_CN.md)

## Features

- **Babel Plugin**: Automatically injects scope IDs into JSX elements and transforms className expressions
- **PostCSS Plugin**: Processes CSS files with scope isolation and supports global/local scoping
- **Webpack plugin / loader**: `ReactScopeStyleWebpackPlugin` auto-injects the scope loader; manual loader config still supported
- **Vite Plugin**: First-class Vite integration for JSX and scoped CSS
- **esbuild Plugin**: esbuild integration for JSX and scoped CSS (with optional Sass/Less compile)
- **Next.js helper**: `withReactScopeStyle` wraps `next.config` and injects the webpack scope loader
- **Rspack Support**: `ReactScopeStyleRspackPlugin` shares Webpack injection logic
- **Flexible Configuration**: Customizable scope prefixes, attributes, and scoping strategies
- **React Component Support**: Optimized for React components with automatic className handling
- **CSS-in-JS Support**: Works with classnames, clsx, and other utility libraries
- **:scope / :global selectors**: Control where scope IDs attach and which fragments stay global
- **Stylelint plugin**: Optional lint for redundant multiple `:global` / `:scope` markers (warning by default)
- **Native CSS nesting**: Supports nested Rule trees from PostCSS 8+; flattened chains match flat CSS scoping rules
- **Global Style Support**: Allows global styles while maintaining component isolation

## Installation

```bash
npm install babel-preset-react-scope-style
# peers: @babel/core (required)
# optional: classnames or clsx (dynamic className), webpack (loader only)
# or
yarn add babel-preset-react-scope-style
```

## Quick Start

### 1. Babel Configuration

Add the preset to your `.babelrc` or `babel.config.js`:

```javascript
{
  "presets": [
    "babel-preset-react-scope-style"
  ]
}
```

### 2. Webpack Configuration

**Recommended:** use the Webpack plugin to inject the scope loader and the Babel preset into `babel-loader`:

```javascript
// webpack.config.js
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

Import styles in components:

```javascript
import './Button.scss?scoped';
import './theme.scss?global';
```

For **Vite**, **esbuild**, **Next.js**, **Rspack**, or **standalone PostCSS**, see the [integrations guide](./docs/integrations.md).

| Tool | Entry | CSS scoping |
|------|-------|-------------|
| **Webpack** | `babel-preset-react-scope-style/webpack` | plugin auto-inject or `.../loader` |
| **Vite** | `babel-preset-react-scope-style/vite` | handled by Vite plugin |
| **esbuild** | `babel-preset-react-scope-style/esbuild` | handled by esbuild plugin |
| **Next.js** | `babel-preset-react-scope-style/next` | injects webpack loader |
| **Rspack** | `babel-preset-react-scope-style/rspack` | same as Webpack |
| **Custom** | preset + `babel-preset-react-scope-style/postcss` | manual PostCSS options |

Full support matrix (App Router, Turbopack, CSS Modules limits): [docs/support-matrix.md](./docs/support-matrix.md).

## Documentation

| Topic | English | 中文 |
|-------|---------|------|
| Build integrations | [docs/integrations.md](./docs/integrations.md) | [docs/integrations.zh-CN.md](./docs/integrations.zh-CN.md) |
| Usage | [docs/usage.md](./docs/usage.md) | [docs/usage.zh-CN.md](./docs/usage.zh-CN.md) |
| Configuration | [docs/configuration.md](./docs/configuration.md) | [docs/configuration.zh-CN.md](./docs/configuration.zh-CN.md) |
| Advanced features | [docs/advanced.md](./docs/advanced.md) | [docs/advanced.zh-CN.md](./docs/advanced.zh-CN.md) |
| Transform examples | [docs/transform-examples.md](./docs/transform-examples.md) | [docs/transform-examples.zh-CN.md](./docs/transform-examples.zh-CN.md) |
| FAQ & troubleshooting | [docs/faq.md](./docs/faq.md) | [docs/faq.zh-CN.md](./docs/faq.zh-CN.md) |
| Support matrix | [docs/support-matrix.md](./docs/support-matrix.md) | [docs/support-matrix.md](./docs/support-matrix.md) |
| Phase B (SWC / Turbopack) | [docs/phase-b-swc.md](./docs/phase-b-swc.md) | [docs/phase-b-swc.md](./docs/phase-b-swc.md) |
| Runnable demos | [examples/README.md](./examples/README.md) | [examples/README_CN.md](./examples/README_CN.md) |

## Stylelint

Optional Stylelint rules ship at `babel-preset-react-scope-style/stylelint` (English messages). See [docs/stylelint.md](./docs/stylelint.md) for install, config, and rule list.

## Development

Requires **Node >= 14.17** to use the published package. The unit-test suite needs **Node >= 18** (`node:test`); see [docs/support-matrix.md](./docs/support-matrix.md#nodejs).

The package ships **`src/` directly** (no `esm/` compile step). `main` / `exports["."]` point at `src/index.js`.

```bash
npm run smoke:runtime
npm run lint:style
npm test
```

Runnable demos live under [examples/](./examples/).

## License

MIT License — see [LICENSE](./LICENSE) file for details.

## Related Projects

- [build-react-esm-project](https://github.com/gxlmyacc/build-react-esm-project) — React build tool with scope style support for non-webpack environments
- [styled-components](https://github.com/styled-components/styled-components) — CSS-in-JS library
- [CSS Modules](https://github.com/css-modules/css-modules) — CSS modules for component-based styling
- [PostCSS](https://github.com/postcss/postcss) — CSS transformation tool

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
