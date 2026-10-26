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

1. Vite 插件对 `.js` / `.jsx` / `.ts` / `.tsx` 执行本 preset 的 Babel 转换。`.ts` / `.tsx` 默认注入 `@babel/preset-typescript`（`typescript: true`）；设 `typescript: false` 则跳过这些文件，交给 Vite 自带 TS 管线。插件使用 `babelrc: false`，**不会**与项目里已注册的 `@babel/preset-typescript` 叠两份。同一项目可混用 JS 与 TS。
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

1. esbuild 插件对 `.js` / `.jsx` / `.ts` / `.tsx` 执行本 preset 的 Babel 转换；`.ts` / `.tsx` 在插件选项 `typescript` 不为 `false` 时注入 `@babel/preset-typescript`（默认 `true`）。该选项与 CLI 库模式的 `--typescript`（控制 glob）含义不同。JS/TS 混用入口没问题。
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
- **Next 14.2 上暂不支持 Turbopack**（B2 spike：Turbopack 禁用 Babel；SWC WASM 加载失败）。PostCSS from-query 基础设施已就绪，待后续矩阵 — [phase-b-swc.md](./phase-b-swc.md)。
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
- **独立 PostCSS**：默认须自行设置 `scoped`、`global`、`id`，并与组件上的 scope class 保持一致；仅生成无作用域样式时可设置 `injectScope: false` 并省略 `id`。

插件参数（参考）：

```javascript
{
  scoped: true,       // 启用作用域
  global: false,      // true 时使用 [class*=id] 属性选择器
  id: 'v-abc123',     // 作用域 id（与 JSX 注入的 class 相同）
  // globalSelector: '', // :global 的替换内容
  // injectScope: true,  // false 时仅转换标记，不向 CSS 选择器注入 id
  // selectorPrefix: '', // 可选：例如 '.history-snapshot'
  // selectorPrefixExclude: ['html', 'head', 'body', ':root'], // 跳过统一前缀
  // transformSelector(selector, { filename }) { return selector; },
}
```

另见：[使用方法](./usage.zh-CN.md)、[配置选项](./configuration.zh-CN.md)。


**插件顺序：** `babel-preset-react-scope-style/postcss` 必须在 **嵌套 Rule 树** 上运行 (PostCSS 8+ native nesting). 若添加 `postcss-nesting` to emit flat selectors for legacy browsers, 应放在 scope 插件 **之后** 以便作用域化仍使用相同的 leaf-gate 规则，再由 nesting 仅展平输出。

### 仅生成不带作用域标识的样式

历史快照等场景可独立调用 PostCSS，无需运行 Babel 或重新生成 JS。SCSS 须先通过 Sass 编译为 CSS，再交给本插件：

```javascript
const sass = require('sass');
const postcss = require('postcss');
const scopeStyle = require('babel-preset-react-scope-style/postcss');

const filename = 'src/TableSummaryCell.scss';
const compiled = sass.compile(filename);
const result = await postcss([
  scopeStyle({
    scoped: true,
    injectScope: false,
    selectorPrefix: '.history-snapshot',
    // selectorPrefixExclude: ['html', 'head', 'body', ':root'], // 默认值，可自定义
    transformSelector(selector, { filename: sourceFile }) {
      // 示例：按源文件补上稳定的业务类名，防止不同分区的 .cell 规则相互覆盖。
      return sourceFile.endsWith('TableSummaryCell.scss')
        ? `.table-summary ${selector}`
        : selector;
    },
  }),
]).process(compiled.css, { from: filename, map: false });
// 将 result.css 写入需要的 CSS 或 SCSS 入口；内容为纯 CSS。
```

- `injectScope` 默认 `true`。设置为 `false` 时允许省略 `id`，仍解析 `:scope` / `:global`，但不添加 hash class 或 `[class*=id]`。它仅作用于 PostCSS，不修改 Babel/JSX 的类名生成或注入。
- 附着式 `.table:scope` 输出 `.table`；独立 `:scope` 保留 `*`，嵌套 `&:scope` 保留 `&`；裸/分隔式嵌套标记保留 `*` 的后代层级，避免简单删除改变选择器含义。函数式 `:global(...)` 仍不支持。
- `selectorPrefix` 可选，在自定义回调之后给最外层规则的每条选择器添加容器前缀，包含 `:global` 转换后的规则，排除命中 `selectorPrefixExclude` 的分支。支持逗号分隔的多个容器；原生嵌套的后代规则继承外层前缀，不重复添加。空字符串表示不添加。
- `selectorPrefixExclude` 默认 `['html', 'head', 'body', ':root']`。若一条选择器的顶层简单选择器命中排除项，该条保留原样、不加前缀，例如 `body, .table` 输出 `body, .history-snapshot .table`。根元素不是映射成容器，而是保留全局匹配；只有前缀注入被跳过，hash 和自定义回调仍按配置处理。
- 自定义 `selectorPrefixExclude` 数组替换默认值，传 `[]` 则全部添加前缀。支持标签、类名、ID、属性或伪类等单个简单选择器，例如 `['html', 'head', 'body', ':root', '.external']`；不支持用复合选择器作为排除项。只匹配当前选择器的顶层节点，不会把 `.body`、`[data-name="body"]`、`:not(body)` 误判为 `body`。
- `:global` 本身不跳过统一前缀，是否跳过由排除项决定。`selectorPrefix` 不改写 `@keyframes` 名称或 `@font-face` 等无选择器的 at-rule。
- `transformSelector` 可选，在标记转换完成后逐条接收逗号分隔的选择器。函数/属性值内部的逗号不会被拆分；回调须返回非空字符串，异常直接向调用方报告。
- 上下文 `filename` 来自当前规则的源文件，无来源时为 `''`。合并不同源文件的 PostCSS AST 时仍保留各规则来源；先编译和处理各文件再拼接 CSS 文本，也可保留文件区分能力。
- 回调包含全局规则以及 `@media` / `@supports` 内的规则，跳过关键帧的 `from` / `to` / 百分比选择器。原生嵌套时接收当前规则的相对选择器（如 `&`），按各业务场景自行决定是否改写。
- 默认注入模式下同样可使用回调，接收到的是已带作用域标识的选择器；多个作用域上下文分别调用。`from` query 自动推导作用域时同样保留这些配置。
- 本插件不负责收集文件、合并样式、去重或还原历史 DOM；这些步骤由生成脚本安排，普通组件的作用域构建流程可以保持原样。
