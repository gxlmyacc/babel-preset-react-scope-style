# 示例

[babel-preset-react-scope-style](../README_CN.md) 的可运行演示。

## [English](./README.md)

| 目录 | 作用 |
|------|------|
| [shared](./shared/) | **共享** React 应用（`src/`、样式、演示菜单） |
| [webpack](./webpack/) | Webpack 5 + Babel preset + `ReactScopeStyleWebpackPlugin` |
| [rspack](./rspack/) | Rspack + Babel preset + `ReactScopeStyleRspackPlugin` |
| [vite](./vite/) | Vite + `babel-preset-react-scope-style/vite` |
| [esbuild-bundle](./esbuild-bundle/) | esbuild CLI — **bundle** 模式（SPA，shared 应用） |
| [esbuild-lib](./esbuild-lib/) | esbuild CLI — **lib** 模式（多文件 ESM，shared 应用） |
| [next](./next/) | Next.js **Pages Router** + `babel-preset-react-scope-style/next` |
| [next-app](./next-app/) | Next.js **App Router** + Babel + `withReactScopeStyle`（非 SWC / 非 Turbopack） |
| [next-swc-poc](./next-swc-poc/) | Phase **B1** SWC + webpack CSS；B2 Turbopack 基础设施（14.2 turbo 尚不可跑） |

各 bundler 示例的应用代码都在 `shared/` 下。

## 安装与启动

选择一个 bundler（父包通过 `"babel-preset-react-scope-style": "file:../.."` 链接；无需根目录编译 — 包从 `src/` 运行）：

```bash
cd examples/webpack   # 或 rspack / vite / esbuild-bundle / esbuild-lib / next / next-app
npm install
npm run dev
```

- Webpack: http://localhost:3000
- Rspack: http://localhost:3001
- Vite: http://localhost:5173
- esbuild bundle: http://localhost:3002
- Next.js Pages: http://localhost:3003
- Next.js App Router: http://localhost:3004

各 bundler 目录均通过 `"babel-preset-react-scope-style": "file:../.."` 链接父包。每个目录的 `.npmrc` 含 `install-links=false`（在 Windows 上复制而非符号链接）。

## 国际化

共享应用支持 **英文**（默认）与 **中文**。文案在 `shared/src/i18n/locales/`。使用顶栏语言下拉切换；选择保存在 `localStorage`（`react-scope-style-demo-locale`）。

## 演示菜单

| 场景 | 展示内容 |
|------|----------|
| **基础 scoped** | `?scoped` import，默认作用在选择器最后一段 |
| **共享 global** | `?global` import，`[class*=ex-]` 共享样式 |
| **:scope 选择器** | 默认 vs `.box:scope` vs `.box :scope` |
| **:global 选择器** | 前置 `:global` 与嵌套 `:global .external-widget` |
| **透传子组件** | 父级 `className` + `.skin-a:scope` 命中子组件内部节点 |
| **自定义 classAttrs** | mock 弹窗上的 `wrapClassName` |

作用域选项统一定义在 `shared/scope-style-options.cjs`。
