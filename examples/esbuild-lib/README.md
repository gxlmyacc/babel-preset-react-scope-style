# esbuild lib 示例

**库模式（默认）**：多文件 ESM 输出，与 webpack / vite / esbuild-bundle 共用 [`../shared/`](../shared/) 源码。

- import 改写为 plain `.css`（无 `?scope-style` query）
- 通过 `StyleScoped` 桥接表作用域化样式
- `shared/src/assets/` 下 json / txt / png 等非代码文件原样复制到输出目录

## Setup

```bash
cd examples/esbuild-lib
npm install
npm run build
```

产物目录：

- `npm run build` → `esm/`（配置文件 + `scopeStyleOptions`）
- `npm run build:defaults` → `dist/`（无配置文件，纯 CLI 默认）

## 配置

### 配置文件（推荐）

[`lib-scope.config.cjs`](./lib-scope.config.cjs) 使用非默认文件名，需 `--config` 显式加载：

```bash
npm run build
# 等价于
react-scope-style build --config lib-scope.config.cjs
```

### 纯 CLI 默认（无配置文件）

```bash
npm run build:defaults
# 等价于
react-scope-style build --root ../shared --src ./src --out ../esbuild-lib/dist
```

`root` 指向 shared（源码不在本目录）；库模式与 `scopeStyle` 为 CLI 内置默认。scope 命名空间读取 shared 的 `package.json`（`react-scope-style-demo-shared`），前缀为 preset 默认 `v-`（无 `scopeStyleOptions` 时）。

配置文件要点：

```javascript
module.exports = {
  root: '../shared',
  src: './src',
  out: './esm',
  scopeStyleOptions: require('../shared/scope-style-options.cjs'),
};
```

库模式（`bundle: false`）与 `scopeStyle` 为 CLI 默认。

## 验证

构建后检查（`npm run build` / `esm/`）：

- `esm/main.js` — `import` 为 plain `.css`（无 query）
- `esm/demos/ScopedBasic/ScopedBasic.css` — 选择器含 `ex-` scope class
- `esm/assets/meta.json`、`note.txt`、`logo.png` — 与 `shared/src/assets/` 一致

SPA bundle 示例见 [`../esbuild-bundle/`](../esbuild-bundle/)。
