# babel-preset-react-scope-style

一个为 React 组件提供样式作用域化的综合解决方案，包含 Babel 插件、PostCSS 插件，以及 Webpack / Rspack loader、Vite / esbuild / Next.js 插件等构建集成。

[![NPM version](https://img.shields.io/npm/v/babel-preset-react-scope-style.svg?style=flat)](https://npmjs.com/package/babel-preset-react-scope-style)
[![NPM downloads](https://img.shields.io/npm/dm/babel-preset-react-scope-style.svg?style=flat)](https://npmjs.com/package/babel-preset-react-scope-style)

## [English](README.md)

## 功能特性

- **Babel插件**: 自动向JSX元素注入作用域ID，并转换className表达式
- **PostCSS插件**: 处理CSS文件的作用域隔离，支持全局/局部作用域
- **Webpack 插件 / Loader**: `ReactScopeStyleWebpackPlugin` 自动注入 scope loader；也可手动配置 loader
- **Vite 插件**: 开箱即用的 Vite 集成，处理 JSX 与作用域 CSS
- **esbuild 插件**: esbuild 集成，处理 JSX 与作用域 CSS（可选编译 Sass/Less）
- **Next.js 集成**: `withReactScopeStyle` 包装 next.config，注入 webpack scope loader
- **Rspack 支持**: `ReactScopeStyleRspackPlugin` 与 Webpack 共用注入逻辑
- **灵活配置**: 可自定义作用域前缀、属性和作用域策略
- **React组件支持**: 针对React组件优化，自动处理className属性
- **CSS-in-JS支持**: 兼容classnames、clsx等工具库
- **:scope / :global 选择器**：控制作用域位置与全局片段
- **Stylelint 插件**：可选校验多余的 `:global` / `:scope`（默认 warning）
- **原生 CSS 嵌套**：支持 PostCSS 保留的嵌套 Rule 树，展平后与扁平选择器规则一致
- **全局样式支持**: 在保持组件隔离的同时支持全局样式

## 安装

```bash
npm install babel-preset-react-scope-style
# peer：@babel/core（必需）
# 可选：classnames 或 clsx（动态 className）、webpack（仅 loader 需要）
# 或者
yarn add babel-preset-react-scope-style
```

## 快速开始

### 1. Babel配置

在 `.babelrc` 或 `babel.config.js` 中添加预设：

```javascript
{
  "presets": [
    "babel-preset-react-scope-style"
  ]
}
```

### 2. Webpack配置

**推荐**：使用 Webpack 插件自动注入 scope loader，并向 `babel-loader` 注入本 Babel preset：

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

在组件中导入样式：

```javascript
import './Button.scss?scoped';
import './theme.scss?global';
```

若使用 **Vite**、**esbuild**、**Next.js**、**Rspack** 或 **纯 PostCSS**，请参阅 [构建工具集成](./docs/integrations.zh-CN.md)。

| 工具 | 入口 | CSS 作用域化 |
|------|------|--------------|
| **Webpack** | `babel-preset-react-scope-style/webpack` | 插件自动注入或 `.../loader` |
| **Vite** | `babel-preset-react-scope-style/vite` | 由 Vite 插件处理 |
| **esbuild** | `babel-preset-react-scope-style/esbuild` | 由 esbuild 插件处理 |
| **Next.js** | `babel-preset-react-scope-style/next` | 注入 webpack loader |
| **Rspack** | `babel-preset-react-scope-style/rspack` | 与 Webpack 相同 |
| **自定义** | preset + `babel-preset-react-scope-style/postcss` | 手动配置 PostCSS |

完整支持矩阵（App Router、Turbopack、CSS Modules 限制）：[docs/support-matrix.md](./docs/support-matrix.md)。

## 文档

| 主题 | English | 中文 |
|------|---------|------|
| 构建集成 | [docs/integrations.md](./docs/integrations.md) | [docs/integrations.zh-CN.md](./docs/integrations.zh-CN.md) |
| 使用方法 | [docs/usage.md](./docs/usage.md) | [docs/usage.zh-CN.md](./docs/usage.zh-CN.md) |
| 配置选项 | [docs/configuration.md](./docs/configuration.md) | [docs/configuration.zh-CN.md](./docs/configuration.zh-CN.md) |
| 高级功能 | [docs/advanced.md](./docs/advanced.md) | [docs/advanced.zh-CN.md](./docs/advanced.zh-CN.md) |
| 转换示例 | [docs/transform-examples.md](./docs/transform-examples.md) | [docs/transform-examples.zh-CN.md](./docs/transform-examples.zh-CN.md) |
| 常见问题与故障排除 | [docs/faq.md](./docs/faq.md) | [docs/faq.zh-CN.md](./docs/faq.zh-CN.md) |
| 支持矩阵 | [docs/support-matrix.md](./docs/support-matrix.md) | [docs/support-matrix.md](./docs/support-matrix.md) |
| 可运行示例 | [examples/README.md](./examples/README.md) | [examples/README_CN.md](./examples/README_CN.md) |

## Stylelint

可选 Stylelint 规则见 `babel-preset-react-scope-style/stylelint`（英文提示信息）。安装、配置与规则说明见 [docs/stylelint.zh-CN.md](./docs/stylelint.zh-CN.md)。

## 开发

使用已发布包需 **Node >= 14.17**。单元测试需 **Node >= 18**（`node:test`）；详见 [docs/support-matrix.md](./docs/support-matrix.md#nodejs)。

本包直接发布 **`src/`**（无 `esm/` 编译步骤）。`main` / `exports["."]` 指向 `src/index.js`。

```bash
npm run smoke:runtime
npm run lint:style
npm test
```

可运行示例见 [examples/](./examples/)。

## 许可证

MIT 许可证 — 详见 [LICENSE](./LICENSE) 文件。

## 相关项目

- [build-react-esm-project](https://github.com/gxlmyacc/build-react-esm-project) — 非 webpack 环境下的 React 构建工具，支持 scope style
- [styled-components](https://github.com/styled-components/styled-components) — CSS-in-JS 库
- [CSS Modules](https://github.com/css-modules/css-modules) — 基于组件的 CSS Modules
- [PostCSS](https://github.com/postcss/postcss) — CSS 转换工具

## 贡献

欢迎提交 Pull Request！
