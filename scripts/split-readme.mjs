/**
 * 从 README.md / README_CN.md 按标题切分章节并写入 docs/。
 * 无入参；在项目根目录执行。
 * 无返回值；stdout 输出各文件行数。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

/**
 * 按起始标题（含）到下一同级 ## 标题（不含）提取 Markdown 片段。
 * @param {string} content - 源文件全文
 * @param {string} startHeading - 起始 ## 标题行（不含换行）
 * @param {string|null} endHeading - 结束于该 ## 标题前；null 表示到文件末尾
 * @returns {string}
 */
function extractSection(content, startHeading, endHeading) {
  const lines = content.split('\n');
  const startIdx = lines.findIndex((l) => l === startHeading);
  if (startIdx === -1) throw new Error(`Start heading not found: ${startHeading}`);
  let endIdx = lines.length;
  if (endHeading) {
    const found = lines.findIndex((l, i) => i > startIdx && l === endHeading);
    if (found === -1) throw new Error(`End heading not found: ${endHeading}`);
    endIdx = found;
  }
  return lines.slice(startIdx, endIdx).join('\n').trimEnd() + '\n';
}

/**
 * 将 README 内指向自身锚点的链接改为 docs 相对路径。
 * @param {string} body - 章节正文
 * @param {Record<string, string>} anchorMap - 锚点 id → docs 路径
 * @returns {string}
 */
function fixEnLinks(body, anchorMap) {
  let out = body;
  for (const [anchor, docPath] of Object.entries(anchorMap)) {
    out = out.replace(new RegExp(`\\]\\(#${anchor}\\)`, 'g'), `](${docPath})`);
  }
  out = out.replace(/\]\(\.\.\/examples\//g, '](../examples/');
  out = out.replace(/\[docs\/integrations\.md\]\(docs\/integrations\.md\)/g, '[integrations.md](./integrations.md)');
  out = out.replace(/\[docs\/support-matrix\.md\]\(docs\/support-matrix\.md\)/g, '[support-matrix.md](./support-matrix.md)');
  return out;
}

/**
 * 将 README_CN 内指向自身锚点的链接改为 docs 相对路径。
 * @param {string} body - 章节正文
 * @param {Record<string, string>} anchorMap - 锚点 id → docs 路径
 * @returns {string}
 */
function fixCnLinks(body, anchorMap) {
  let out = body;
  for (const [anchor, docPath] of Object.entries(anchorMap)) {
    out = out.replace(new RegExp(`\\]\\(#${anchor}\\)`, 'g'), `](${docPath})`);
  }
  out = out.replace(/\]\(\.\.\/examples\//g, '](../examples/');
  out = out.replace(/\[docs\/support-matrix\.md\]\(docs\/support-matrix\.md\)/g, '[support-matrix.md](./support-matrix.md)');
  return out;
}

const readmeEn = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
const readmeCn = fs.readFileSync(path.join(root, 'README_CN.md'), 'utf8');
const existingIntegrations = fs.readFileSync(path.join(root, 'docs/integrations.md'), 'utf8');

const enAnchorMap = {
  vite: './integrations.md#vite',
  esbuild: './integrations.md#esbuild',
  nextjs: './integrations.md#nextjs',
  rspack: './integrations.md#rspack',
  'pure-postcss-standalone': './integrations.md#pure-postcss-standalone',
};

const cnAnchorMap = {
  vite: './integrations.zh-CN.md#vite',
  esbuild: './integrations.zh-CN.md#esbuild',
  nextjs: './integrations.zh-CN.md#nextjs',
  rspack: './integrations.zh-CN.md#rspack',
  'pure-postcss-standalone': './integrations.zh-CN.md#pure-postcss-standalone',
};

const enSections = {
  integrations: extractSection(readmeEn, '## Vite / esbuild / Next / Rspack / PostCSS (without Webpack)', '## Usage'),
  usage: extractSection(readmeEn, '## Usage', '## Configuration'),
  configuration: extractSection(readmeEn, '## Configuration', '## Advanced Features'),
  advanced: extractSection(readmeEn, '## Advanced Features', '## Examples'),
  transformExamples: extractSection(readmeEn, '## Examples', '## FAQ'),
  faq: extractSection(readmeEn, '## FAQ', '## Stylelint'),
  stylelint: extractSection(readmeEn, '## Stylelint', '## Development'),
  troubleshooting: extractSection(readmeEn, '## Troubleshooting', '## License'),
};

const cnSections = {
  integrations: extractSection(readmeCn, '## Vite / esbuild / Next / Rspack / PostCSS（非 Webpack 场景）', '## 使用方法'),
  usage: extractSection(readmeCn, '## 使用方法', '## 配置选项'),
  configuration: extractSection(readmeCn, '## 配置选项', '## 高级功能'),
  advanced: extractSection(readmeCn, '## 高级功能', '## 示例'),
  transformExamples: extractSection(readmeCn, '## 示例', '## 常见问题'),
  faq: extractSection(readmeCn, '## 常见问题', '## Stylelint'),
  stylelint: extractSection(readmeCn, '## Stylelint', '## 开发'),
  troubleshooting: extractSection(readmeCn, '## 故障排除', '## 许可证'),
};

const postcssOrderNote = existingIntegrations.match(/\*\*Plugin order:\*\*[\s\S]*$/);
const postcssOrderBlock = postcssOrderNote ? '\n\n' + postcssOrderNote[0].trim() : '';

const integrationsEn = `# Build tool integrations

See also:

- [Usage](./usage.md) · [Configuration](./configuration.md) · [Support matrix](./support-matrix.md)
- [中文文档](./integrations.zh-CN.md)

${fixEnLinks(enSections.integrations.replace(/^## Vite[^\n]+\n\n/, ''), enAnchorMap).replace(
  /More examples: \[docs\/integrations\.md\]\(docs\/integrations\.md\)\./,
  'See also: [Usage](./usage.md), [Configuration](./configuration.md).'
)}${postcssOrderBlock}
`;

const integrationsCn = `# 构建工具集成

另见：

- [使用方法](./usage.zh-CN.md) · [配置选项](./configuration.zh-CN.md) · [支持矩阵](./support-matrix.md)
- [English](./integrations.md)

${fixCnLinks(cnSections.integrations.replace(/^## Vite[^\n]+\n\n/, ''), cnAnchorMap).replace(
  /更多示例：\[docs\/integrations\.md\]\(docs\/integrations\.md\)。/,
  '另见：[使用方法](./usage.zh-CN.md)、[配置选项](./configuration.zh-CN.md)。'
)}${postcssOrderBlock.replace(
  '**Plugin order:**',
  '**插件顺序：**'
).replace(
  'must run on the **nested Rule tree**',
  '必须在 **嵌套 Rule 树** 上运行'
).replace(
  'If you add `postcss-nesting`',
  '若添加 `postcss-nesting`'
).replace(
  'list it **after** the scope plugin',
  '应放在 scope 插件 **之后**'
).replace(
  'so scoping uses the same leaf-gate rules, then nesting only flattens output.',
  '以便作用域化仍使用相同的 leaf-gate 规则，再由 nesting 仅展平输出。'
)}
`;

const files = [
  ['docs/integrations.md', integrationsEn],
  ['docs/integrations.zh-CN.md', integrationsCn],
  ['docs/usage.md', `# Usage\n\n${fixEnLinks(enSections.usage.replace(/^## Usage\n\n/, ''), enAnchorMap)}`],
  ['docs/usage.zh-CN.md', `# 使用方法\n\n${fixCnLinks(cnSections.usage.replace(/^## 使用方法\n\n/, ''), cnAnchorMap)}`],
  ['docs/configuration.md', `# Configuration\n\n${fixEnLinks(enSections.configuration.replace(/^## Configuration\n\n/, ''), enAnchorMap)}`],
  ['docs/configuration.zh-CN.md', `# 配置选项\n\n${fixCnLinks(cnSections.configuration.replace(/^## 配置选项\n\n/, ''), cnAnchorMap)}`],
  ['docs/advanced.md', `# Advanced features\n\n${fixEnLinks(enSections.advanced.replace(/^## Advanced Features\n\n/, ''), enAnchorMap)}`],
  ['docs/advanced.zh-CN.md', `# 高级功能\n\n${fixCnLinks(cnSections.advanced.replace(/^## 高级功能\n\n/, ''), cnAnchorMap)}`],
  ['docs/transform-examples.md', `# Transform examples\n\n${fixEnLinks(enSections.transformExamples.replace(/^## Examples\n\n/, ''), enAnchorMap)}`],
  ['docs/transform-examples.zh-CN.md', `# 转换示例\n\n${fixCnLinks(cnSections.transformExamples.replace(/^## 示例\n\n/, ''), cnAnchorMap)}`],
  [
    'docs/faq.md',
    `# FAQ & best practices\n\n${fixEnLinks(enSections.faq.replace(/^## FAQ\n\n/, ''), enAnchorMap)}\n\n## Troubleshooting\n\n${fixEnLinks(enSections.troubleshooting.replace(/^## Troubleshooting\n\n/, ''), enAnchorMap)}`,
  ],
  [
    'docs/faq.zh-CN.md',
    `# 常见问题与最佳实践\n\n${fixCnLinks(cnSections.faq.replace(/^## 常见问题\n\n/, ''), cnAnchorMap)}\n\n## 故障排除\n\n${fixCnLinks(cnSections.troubleshooting.replace(/^## 故障排除\n\n/, ''), cnAnchorMap)}`,
  ],
  ['docs/stylelint.md', `# Stylelint\n\n${fixEnLinks(enSections.stylelint.replace(/^## Stylelint\n\n/, ''), enAnchorMap).replace(/\]\(stylelint\.config\.cjs\)/g, '](../stylelint.config.cjs)')}`],
  ['docs/stylelint.zh-CN.md', `# Stylelint\n\n${fixCnLinks(cnSections.stylelint.replace(/^## Stylelint\n\n/, ''), cnAnchorMap).replace(/\]\(stylelint\.config\.cjs\)/g, '](../stylelint.config.cjs)')}`],
];

for (const [rel, content] of files) {
  const full = path.join(root, rel);
  fs.writeFileSync(full, content, 'utf8');
  const lineCount = content.split('\n').length;
  console.log(`${rel}: ${lineCount} lines`);
}

// Slim README EN
const slimReadmeEn = `# babel-preset-react-scope-style

A comprehensive solution for scoping styles in React components, with Babel and PostCSS plugins plus build integrations for Webpack, Rspack (loader), Vite, esbuild, and Next.js.

[![NPM version](https://img.shields.io/npm/v/babel-preset-react-scope-style.svg?style=flat)](https://npmjs.com/package/babel-preset-react-scope-style)
[![NPM downloads](https://img.shields.io/npm/dm/babel-preset-react-scope-style.svg?style=flat)](https://npmjs.com/package/babel-preset-react-scope-style)

## [中文说明](README_CN.md)

## Features

- **Babel Plugin**: Automatically injects scope IDs into JSX elements and transforms className expressions
- **PostCSS Plugin**: Processes CSS files with scope isolation and supports global/local scoping
- **Webpack plugin / loader**: \`ReactScopeStyleWebpackPlugin\` auto-injects the scope loader; manual loader config still supported
- **Vite Plugin**: First-class Vite integration for JSX and scoped CSS
- **esbuild Plugin**: esbuild integration for JSX and scoped CSS (with optional Sass/Less compile)
- **Next.js helper**: \`withReactScopeStyle\` wraps \`next.config\` and injects the webpack scope loader
- **Rspack Support**: \`ReactScopeStyleRspackPlugin\` shares Webpack injection logic
- **Flexible Configuration**: Customizable scope prefixes, attributes, and scoping strategies
- **React Component Support**: Optimized for React components with automatic className handling
- **CSS-in-JS Support**: Works with classnames, clsx, and other utility libraries
- **:scope / :global selectors**: Control where scope IDs attach and which fragments stay global
- **Stylelint plugin**: Optional lint for redundant multiple \`:global\` / \`:scope\` markers (warning by default)
- **Native CSS nesting**: Supports nested Rule trees from PostCSS 8+; flattened chains match flat CSS scoping rules
- **Global Style Support**: Allows global styles while maintaining component isolation

## Installation

\`\`\`bash
npm install babel-preset-react-scope-style
# peers: @babel/core (required)
# optional: classnames or clsx (dynamic className), webpack (loader only)
# or
yarn add babel-preset-react-scope-style
\`\`\`

## Quick Start

### 1. Babel Configuration

Add the preset to your \`.babelrc\` or \`babel.config.js\`:

\`\`\`javascript
{
  "presets": [
    "babel-preset-react-scope-style"
  ]
}
\`\`\`

### 2. Webpack Configuration

**Recommended:** use the Webpack plugin to inject the scope loader and the Babel preset into \`babel-loader\`:

\`\`\`javascript
// webpack.config.js
const ReactScopeStyleWebpackPlugin = require('babel-preset-react-scope-style/webpack');

module.exports = {
  module: {
    rules: [
      { test: /\\.(js|jsx)$/, use: 'babel-loader' },
      { test: /\\.s[ac]ss$/, use: ['style-loader', 'css-loader', 'sass-loader'] },
      { test: /\\.css$/, use: ['style-loader', 'css-loader'] },
    ],
  },
  plugins: [
    new ReactScopeStyleWebpackPlugin({
      sourceMap: true,
      babel: { scopePrefix: 'v-', classNameLibrary: 'auto' },
    }),
  ],
};
\`\`\`

Import styles in components:

\`\`\`javascript
import './Button.scss?scoped';
import './theme.scss?global';
\`\`\`

For **Vite**, **esbuild**, **Next.js**, **Rspack**, or **standalone PostCSS**, see the [integrations guide](./docs/integrations.md).

| Tool | Entry | CSS scoping |
|------|-------|-------------|
| **Webpack** | \`babel-preset-react-scope-style/webpack\` | plugin auto-inject or \`.../loader\` |
| **Vite** | \`babel-preset-react-scope-style/vite\` | handled by Vite plugin |
| **esbuild** | \`babel-preset-react-scope-style/esbuild\` | handled by esbuild plugin |
| **Next.js** | \`babel-preset-react-scope-style/next\` | injects webpack loader |
| **Rspack** | \`babel-preset-react-scope-style/rspack\` | same as Webpack |
| **Custom** | preset + \`babel-preset-react-scope-style/postcss\` | manual PostCSS options |

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
| Runnable demos | [examples/README.md](./examples/README.md) | [examples/README.md](./examples/README.md) |

## Stylelint

Optional Stylelint rules ship at \`babel-preset-react-scope-style/stylelint\` (English messages). See [docs/stylelint.md](./docs/stylelint.md) for install, config, and rule list.

## Development

Requires **Node >= 14.17** to use the published package. The unit-test suite needs **Node >= 18** (\`node:test\`); see [docs/support-matrix.md](./docs/support-matrix.md#nodejs).

The package ships **\`src/\` directly** (no \`esm/\` compile step). \`main\` / \`exports["."]\` point at \`src/index.js\`.

\`\`\`bash
npm run smoke:runtime
npm run lint:style
npm test
\`\`\`

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
`;

const slimReadmeCn = `# babel-preset-react-scope-style

一个为 React 组件提供样式作用域化的综合解决方案，包含 Babel 插件、PostCSS 插件，以及 Webpack / Rspack loader、Vite / esbuild / Next.js 插件等构建集成。

[![NPM version](https://img.shields.io/npm/v/babel-preset-react-scope-style.svg?style=flat)](https://npmjs.com/package/babel-preset-react-scope-style)
[![NPM downloads](https://img.shields.io/npm/dm/babel-preset-react-scope-style.svg?style=flat)](https://npmjs.com/package/babel-preset-react-scope-style)

## [English](README.md)

## 功能特性

- **Babel插件**: 自动向JSX元素注入作用域ID，并转换className表达式
- **PostCSS插件**: 处理CSS文件的作用域隔离，支持全局/局部作用域
- **Webpack 插件 / Loader**: \`ReactScopeStyleWebpackPlugin\` 自动注入 scope loader；也可手动配置 loader
- **Vite 插件**: 开箱即用的 Vite 集成，处理 JSX 与作用域 CSS
- **esbuild 插件**: esbuild 集成，处理 JSX 与作用域 CSS（可选编译 Sass/Less）
- **Next.js 集成**: \`withReactScopeStyle\` 包装 next.config，注入 webpack scope loader
- **Rspack 支持**: \`ReactScopeStyleRspackPlugin\` 与 Webpack 共用注入逻辑
- **灵活配置**: 可自定义作用域前缀、属性和作用域策略
- **React组件支持**: 针对React组件优化，自动处理className属性
- **CSS-in-JS支持**: 兼容classnames、clsx等工具库
- **:scope / :global 选择器**：控制作用域位置与全局片段
- **Stylelint 插件**：可选校验多余的 \`:global\` / \`:scope\`（默认 warning）
- **原生 CSS 嵌套**：支持 PostCSS 保留的嵌套 Rule 树，展平后与扁平选择器规则一致
- **全局样式支持**: 在保持组件隔离的同时支持全局样式

## 安装

\`\`\`bash
npm install babel-preset-react-scope-style
# peer：@babel/core（必需）
# 可选：classnames 或 clsx（动态 className）、webpack（仅 loader 需要）
# 或者
yarn add babel-preset-react-scope-style
\`\`\`

## 快速开始

### 1. Babel配置

在 \`.babelrc\` 或 \`babel.config.js\` 中添加预设：

\`\`\`javascript
{
  "presets": [
    "babel-preset-react-scope-style"
  ]
}
\`\`\`

### 2. Webpack配置

**推荐**：使用 Webpack 插件自动注入 scope loader，并向 \`babel-loader\` 注入本 Babel preset：

\`\`\`javascript
// webpack.config.js
const ReactScopeStyleWebpackPlugin = require('babel-preset-react-scope-style/webpack');

module.exports = {
  module: {
    rules: [
      { test: /\\.(js|jsx)$/, use: 'babel-loader' },
      { test: /\\.s[ac]ss$/, use: ['style-loader', 'css-loader', 'sass-loader'] },
      { test: /\\.css$/, use: ['style-loader', 'css-loader'] },
    ],
  },
  plugins: [
    new ReactScopeStyleWebpackPlugin({
      sourceMap: true,
      babel: { scopePrefix: 'v-', classNameLibrary: 'auto' },
    }),
  ],
};
\`\`\`

在组件中导入样式：

\`\`\`javascript
import './Button.scss?scoped';
import './theme.scss?global';
\`\`\`

若使用 **Vite**、**esbuild**、**Next.js**、**Rspack** 或 **纯 PostCSS**，请参阅 [构建工具集成](./docs/integrations.zh-CN.md)。

| 工具 | 入口 | CSS 作用域化 |
|------|------|--------------|
| **Webpack** | \`babel-preset-react-scope-style/webpack\` | 插件自动注入或 \`.../loader\` |
| **Vite** | \`babel-preset-react-scope-style/vite\` | 由 Vite 插件处理 |
| **esbuild** | \`babel-preset-react-scope-style/esbuild\` | 由 esbuild 插件处理 |
| **Next.js** | \`babel-preset-react-scope-style/next\` | 注入 webpack loader |
| **Rspack** | \`babel-preset-react-scope-style/rspack\` | 与 Webpack 相同 |
| **自定义** | preset + \`babel-preset-react-scope-style/postcss\` | 手动配置 PostCSS |

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
| 可运行示例 | [examples/README.md](./examples/README.md) | [examples/README.md](./examples/README.md) |

## Stylelint

可选 Stylelint 规则见 \`babel-preset-react-scope-style/stylelint\`（英文提示信息）。安装、配置与规则说明见 [docs/stylelint.zh-CN.md](./docs/stylelint.zh-CN.md)。

## 开发

使用已发布包需 **Node >= 14.17**。单元测试需 **Node >= 18**（\`node:test\`）；详见 [docs/support-matrix.md](./docs/support-matrix.md#nodejs)。

本包直接发布 **\`src/\`**（无 \`esm/\` 编译步骤）。\`main\` / \`exports["."]\` 指向 \`src/index.js\`。

\`\`\`bash
npm run smoke:runtime
npm run lint:style
npm test
\`\`\`

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
`;

fs.writeFileSync(path.join(root, 'README.md'), slimReadmeEn, 'utf8');
fs.writeFileSync(path.join(root, 'README_CN.md'), slimReadmeCn, 'utf8');

console.log(`README.md: ${slimReadmeEn.split('\n').length} lines`);
console.log(`README_CN.md: ${slimReadmeCn.split('\n').length} lines`);
