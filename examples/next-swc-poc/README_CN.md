# next-swc-poc

Phase **B1** 示例（已支持）：Next.js App Router，**无** `babel.config.js`，CSS 走 Webpack。

- 通过 `withReactScopeStyle({ swcPlugin: true })` 加载 SWC WASM
- 重写 `?scoped` / `?global`，并注入 scope `className`
- Webpack loader 执行 PostCSS scope

## 准备

```bash
npm run build:swc-plugin   # 仓库根目录（需 Rust）
cd examples/next-swc-poc
npm install
npm run build
npm run dev
```

开发服务：[http://localhost:3005](http://localhost:3005)。

## Turbopack（Phase B2 spike — Next 14.2）

`npm run dev:turbo` 在 Next 14.2 + 本包上**尚不可用**：

| 组合 | 14.2.35 结果 |
|------|----------------|
| Turbopack + `experimental.swcPlugins`（本包 WASM） | `Expected to find module` |
| Turbopack + `babel.config.js` | Next 直接退出：Turbopack 不支持 Babel |

已落地的基础设施（待宿主支持后即可用）：

- PostCSS **from-query**（从 `result.opts.from` 读 `?scope-style&id=…`）
- `postcss.config.js` 仅在 `process.env.TURBOPACK` 时注册插件（避免与 Webpack loader 双重 scope）
- `withReactScopeStyle({ turbopack: true })` 声明 turbo stub

详见 [docs/phase-b-swc.md](../../docs/phase-b-swc.md)。Next 15+/16 矩阵为后续工作。

## 说明

- Webpack + SWC 路径不要放 `babel.config.js`。
- 修改 crate 后需重新 `npm run build:swc-plugin`。
