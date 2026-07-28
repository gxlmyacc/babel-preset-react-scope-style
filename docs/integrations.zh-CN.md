# 构建工具集成

另见：

- [使用方法](./usage.zh-CN.md) · [配置选项](./configuration.zh-CN.md) · [支持矩阵](./support-matrix.md)
- [English](./integrations.md)

各工具链使用相同的导入语法（`?scoped`、`?global`）和 Babel 配置项，区别仅在于 **CSS 处理链路**。

| 工具 | Babel / JSX | CSS 作用域化 |
|------|-------------|--------------|
| **Webpack** | `babel.config.js` 中的 preset | `babel-preset-react-scope-style/webpack` 插件自动注入，或手动配置 `.../loader` |
| **Vite** | `babel-preset-react-scope-style/vite` 插件 | 由 Vite 插件内部调用 PostCSS |
| **esbuild** | `babel-preset-react-scope-style/esbuild` 插件 | 由 esbuild 插件内部调用 PostCSS（可选 `sass` / `less`） |
| **Next.js** | Babel（`next/babel` + 本 preset）或 SWC 插件（`swcPlugin: true`）；**暂不支持 Turbopack** | `babel-preset-react-scope-style/next` 注入 webpack loader |
| **Rspack** | `babel.config.js` 中的 preset，或插件 `babel` 选项 | `ReactScopeStyleRspackPlugin`（与 Webpack 相同注入逻辑） |
| **自定义** | preset 或 `@babel/core` API | `babel-preset-react-scope-style/postcss` 并手动传参 |

完整支持矩阵（App Router、Turbopack、CSS Modules 限制）：[support-matrix.md](./support-matrix.md)。

### 子路径导出

| 导入路径 | 用途 |
|----------|------|
| `babel-preset-react-scope-style` | Babel preset（JSX + import 改写） |
| `babel-preset-react-scope-style/loader` | Webpack / Rspack / Next loader |
| `babel-preset-react-scope-style/webpack` | Webpack 插件（自动注入 loader + 可选 Babel preset） |
| `babel-preset-react-scope-style/postcss` | PostCSS 8 插件 |
| `babel-preset-react-scope-style/vite` | Vite 插件 |
| `babel-preset-react-scope-style/esbuild` | esbuild 插件 |
| `babel-preset-react-scope-style/esbuild/cli` | esbuild CLI（`react-scope-style`） |
| `babel-preset-react-scope-style/next` | Next.js `withReactScopeStyle` 配置包装器 |
| `babel-preset-react-scope-style/rspack` | Rspack 插件（与 Webpack 相同注入逻辑） |

### Vite

需安装 peer：`@babel/core`；若使用动态 `className` 表达式，还需安装 `classnames` 或 `clsx` 之一。

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import reactScopeStyle from 'babel-preset-react-scope-style/vite';

export default defineConfig({
  plugins: [
    // 建议放在 @vitejs/plugin-react 之前，先完成 JSX 作用域转换
    reactScopeStyle({
      scopePrefix: 'v-',
      classNameLibrary: 'auto', // 优先 classnames，其次 clsx；均未 import 时默认注入 classnames
    }),
    react(),
  ],
});
```

**工作流程**

1. Vite 插件对 `.js` / `.jsx` / `.ts` / `.tsx` 执行与本 preset 相同的 Babel 转换。
2. `import './Button.scss?scoped'` 会被改写为带 `scope-style&scoped=true&id=v-xxx` 的 URL。
3. 当 Vite 处理 URL 中包含上述 query 的 CSS/SCSS/Less/Sass 时，插件执行 PostCSS 作用域转换。

**组件中的写法**（与 Webpack 一致）：

```javascript
import './Button.scss?scoped';
import './theme.scss?global';
```

SCSS/Less 仍按 Vite 常规方式配置预处理器（`css.preprocessorOptions`），**无需**为作用域单独配置 PostCSS。

### esbuild

需安装 peer：`@babel/core`、`esbuild`；若使用动态 `className` 表达式，还需 `classnames` 或 `clsx`。处理 `.scss` / `.sass` 需安装 `sass`；处理 `.less` 需安装 `less`。

#### 纯 CLI（推荐，对齐 build-react-esm-project）

安装后可用 bin 命令 `react-scope-style`（或 `npx react-scope-style`）：

```bash
# 应用 bundle 构建
react-scope-style build \
  --bundle \
  --entry src/main.jsx \
  --out ./dist \
  --scope-style \
  --scope-namespace my-app \
  --sourcemap

# 开发 watch + serve
react-scope-style start \
  --config esbuild-scope.config.js \
  --scope-style \
  --serve-port 3002

# 库模式（默认：多文件 ESM，类似 react-esm-project）
react-scope-style build \
  --src ./src \
  --out ./esm \
  --scope-style \
  --scope-style-version \
  --typescript \
  --sourcemap
```

配置文件（可选）`esbuild-scope.config.js`：

```javascript
module.exports = {
  entry: { main: 'src/main.jsx' },
  out: './dist',
  bundle: true,
  scopeStyle: true,
  scopeNamespace: 'my-app',
  scopeStyleOptions: { scopePrefix: 'v-', classNameLibrary: 'auto' },
  jsx: 'automatic',
  sourcemap: true,
  servedir: 'public',
  servePort: 3002,
};
```

| CLI 参数 | 说明 |
|----------|------|
| `--root` | 项目根目录 |
| `--config` | 配置文件路径 |
| `--entry` | 入口（bundle 模式） |
| `--src` / `--out` | 源码 / 输出目录 |
| `--bundle` | SPA 打包模式（默认：库模式 / no-bundle） |
| `--no-config` | 跳过 `esbuild-scope.config.js` 自动发现 |
| `--scope-style` | 启用 JSX + CSS 作用域（默认开启） |
| `--no-scope-style` | 关闭 JSX + CSS 作用域 |
| `--scope-style-version` | scope id 含 package version |
| `--scope-namespace` | 命名空间前缀 |
| `--sourcemap` | 生成 sourcemap |
| `--typescript` | 库模式 glob 含 ts/tsx |
| `--serve-port` / `--servedir` | start 命令静态服务 |

子路径：`babel-preset-react-scope-style/esbuild/cli`、`babel-preset-react-scope-style/esbuild/run`

#### 编程式插件

```javascript
// esbuild.config.mjs
import * as esbuild from 'esbuild';
import reactScopeStyle from 'babel-preset-react-scope-style/esbuild';

await esbuild.build({
  entryPoints: ['src/main.jsx'],
  bundle: true,
  jsx: 'automatic',
  plugins: [
    reactScopeStyle({
      scopePrefix: 'v-',
      classNameLibrary: 'auto',
    }),
  ],
});
```

**工作流程（bundle 模式）**

1. esbuild 插件对 `.js` / `.jsx` / `.ts` / `.tsx` 执行与本 preset 相同的 Babel 转换。
2. `import './Button.scss?scoped'` 会被改写为带 `scope-style&scoped=true&id=v-xxx` 的 URL。
3. 当 esbuild 加载 URL 中包含上述 query 的 CSS/SCSS/Less/Sass 时，插件按需编译预处理器并执行 PostCSS 作用域转换。

**库模式（默认）**：预扫描 JS 填充 `StyleScoped` 桥接表（与 Gulp 版 build-react-esm-project 相同），import 改写为 plain `.css`，样式按桥接表作用域化。SPA 打包请使用 `--bundle`。

**路径别名**：配置项 `alias` 为 esbuild **原生 alias**（与 `esbuild-scope.config.js` / CLI 的 `alias` 字段一致）。**bundle 模式**直接交给 esbuild；**库模式**通过 `onResolve` 插件与样式 PostCSS 映射实现同等效果。若目标项目另外安装了 [`babel-plugin-alias-config`](https://github.com/gxlmyacc/babel-plugin-alias-config) 与 [`postcss-alias-config`](https://github.com/gxlmyacc/postcss-alias-config)，会在原生 `alias` 之外**自动补充**对 `alias.config.js` / `jsconfig.json` 等配置文件的解析（默认 `aliasConfig: true`、`findConfig: true`）。JS 由 Babel 插件改写 import；样式在 scope 转换前由 PostCSS 处理 `@import` / `url()`。`aliasConfig: false` 可仅关闭后两者。

组件中的写法与 Webpack 一致：`import './Button.scss?scoped'`、`import './theme.scss?global'`。

esbuild 会将汇总后的样式输出为独立 CSS 文件（如 `main.css`），请在 HTML 中引用或确保入口依赖链能加载该文件。

可运行示例：[examples/esbuild-bundle](../examples/esbuild-bundle/)（SPA bundle，端口 3002）、[examples/esbuild-lib](../examples/esbuild-lib/)（库模式多文件 ESM）。

### Rspack

Rspack 支持 Webpack 风格 loader。**推荐**使用 `ReactScopeStyleRspackPlugin`（与 Webpack 插件共用注入逻辑）：

```javascript
// rspack.config.js
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

也可调用 `withReactScopeStyle(config, options)`。手动配置时顺序仍为：`style-loader` → `css-loader` → **`babel-preset-react-scope-style/loader`** → `sass-loader`（如有）。

仅在使用 loader 时需安装可选 peer `webpack`（Webpack 或 Rspack 场景）。

### Next.js

需安装 peer：`next`、`@babel/core`；若使用动态 `className`，还需 `classnames` 或 `clsx`。处理 SCSS 时安装 `sass`。

**要求与限制**

- **Babel 路径（默认）：** 提供含 `next/babel` **与**本 preset 的 `babel.config.js`。
- **纯 SWC 路径（Phase B1）：** 省略 Babel 配置，使用 `withReactScopeStyle(nextConfig, { swcPlugin: true })` — 见 [phase-b-swc.md](./phase-b-swc.md) / [examples/next-swc-poc](../examples/next-swc-poc/)。
- **Pages Router 与 App Router** 均支持 Babel + webpack，或 SWC 插件 + webpack。
- **暂不支持 Turbopack**（`next dev --turbo`；B2 规划中）。
- 详见 [support-matrix.md](./support-matrix.md)。

配置 Babel 后，用 `withReactScopeStyle` 包装 `next.config.js`：

```javascript
// babel.config.js
module.exports = {
  presets: [
    'next/babel',
    ['babel-preset-react-scope-style', { scopePrefix: 'v-', classNameLibrary: 'auto' }],
  ],
};
```

```javascript
// next.config.js
const withReactScopeStyle = require('babel-preset-react-scope-style/next');

module.exports = withReactScopeStyle(
  {
    // 你的 Next 配置
  },
  {
    loaderOptions: { sourceMap: true },
  }
);
```

包装器会向 Next 的 webpack 样式规则注入 `babel-preset-react-scope-style/loader`（插在预处理器之前）。组件写法与 Webpack 一致：`import './Button.scss?scoped'`。

可运行示例：

- Pages Router：[examples/next](../examples/next/)（端口 3003）
- App Router：[examples/next-app](../examples/next-app/)（端口 3004）

### 纯 PostCSS（独立使用）

在不使用 Webpack loader 或 Vite 插件、自行处理 CSS 时使用（自定义脚本、Gulp、其他打包工具等）。

```javascript
// postcss.config.js
module.exports = {
  plugins: [
    require('babel-preset-react-scope-style/postcss')({
      scoped: true,
      global: false,
      id: 'v-your-scope-id', // 须与 JSX 注入的 scope class 一致
    }),
  ],
};
```

**说明**

- **Webpack / Vite**：Babel 改写 import 并注入 scope id；loader/插件会把 `scoped`、`global`、`id` 传给 PostCSS，**不要**在 `postcss.config.js` 里再配本插件。
- **独立 PostCSS**：须自行设置 `scoped`、`global`、`id`，并与组件上的 scope class 保持一致。

插件参数（参考）：

```javascript
{
  scoped: true,       // 启用作用域
  global: false,      // true 时使用 [class*=id] 属性选择器
  id: 'v-abc123',     // 作用域 id（与 JSX 注入的 class 相同）
  globalSelector: '', // :global 的替换内容
}
```

另见：[使用方法](./usage.zh-CN.md)、[配置选项](./configuration.zh-CN.md)。


**插件顺序：** `babel-preset-react-scope-style/postcss` 必须在 **嵌套 Rule 树** 上运行 (PostCSS 8+ native nesting). 若添加 `postcss-nesting` to emit flat selectors for legacy browsers, 应放在 scope 插件 **之后** 以便作用域化仍使用相同的 leaf-gate 规则，再由 nesting 仅展平输出。
