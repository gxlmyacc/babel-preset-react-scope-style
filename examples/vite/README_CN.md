# Vite 示例

## [English](./README.md)

仅 bundler 配置包。应用源码：[`../shared/`](../shared/)。

## 安装

```bash
cd examples/vite
npm install
```

## 脚本

- `npm run dev` — http://localhost:5173
- `npm run build` — `dist/`（本目录下）
- `npm run preview` — 预览生产构建

## 配置

- `vite.config.js` — `root: ../shared`，`reactScopeStyle()` 选项来自 `../shared/scope-style-options.cjs`
- 无 `babel.config.js` — JSX 作用域化由 Vite 插件完成
