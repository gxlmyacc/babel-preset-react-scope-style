# babel-preset-react-scope-style

一个为 React 组件提供样式作用域化的综合解决方案，包含 Babel 插件、PostCSS 插件，以及 Webpack / Rspack loader 与 Vite 插件等构建集成。

[![NPM version](https://img.shields.io/npm/v/babel-preset-react-scope-style.svg?style=flat)](https://npmjs.com/package/babel-preset-react-scope-style)
[![NPM downloads](https://img.shields.io/npm/dm/babel-preset-react-scope-style.svg?style=flat)](https://npmjs.com/package/babel-preset-react-scope-style)

## [English](README.md)

## 功能特性

- **Babel插件**: 自动向JSX元素注入作用域ID，并转换className表达式
- **PostCSS插件**: 处理CSS文件的作用域隔离，支持全局/局部作用域
- **Webpack Loader**: 与webpack构建流程集成，实现无缝的样式作用域化
- **Vite 插件**: 开箱即用的 Vite 集成，处理 JSX 与作用域 CSS
- **Rspack 支持**: 兼容 Webpack 的 loader 与配置辅助函数
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

在`.babelrc`或`babel.config.js`中添加预设：

```javascript
{
  "presets": [
    "babel-preset-react-scope-style"
  ]
}
```

### 2. Webpack配置

在 webpack 配置中添加 loader（将 `babel-preset-react-scope-style/loader` 放在 `css-loader` 之后、 `sass-loader` 等预处理器之前）：

> **注意：** 若使用 **Vite**、**Rspack** 或 **纯 PostCSS**，请参阅下文 [Vite / Rspack / PostCSS](#vite--rspack--postcss非-webpack-场景)。

```javascript
module.exports = {
  module: {
    rules: [
      // CSS文件
      {
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader',
          'babel-preset-react-scope-style/loader'
        ]
      },
      // SCSS文件
      {
        test: /\.s[ac]ss$/,
        use: [
          'style-loader',
          'css-loader',
          'babel-preset-react-scope-style/loader',
          'sass-loader'
        ]
      },
      // LESS文件
      {
        test: /\.less$/,
        use: [
          'style-loader',
          'css-loader',
          'babel-preset-react-scope-style/loader',
          'less-loader'
        ]
      }
    ]
  }
};
```

## Vite / Rspack / PostCSS（非 Webpack 场景）

各工具链使用相同的导入语法（`?scoped`、`?global`）和 Babel 配置项，区别仅在于 **CSS 处理链路**。

| 工具 | Babel / JSX | CSS 作用域化 |
|------|-------------|--------------|
| **Webpack** | `babel.config.js` 中的 preset | `css-loader` 之后的 `.../loader` |
| **Vite** | `babel-preset-react-scope-style/vite` 插件 | 由 Vite 插件内部调用 PostCSS |
| **Rspack** | `babel.config.js` 中的 preset | 与 Webpack 相同的 loader |
| **自定义** | preset 或 `@babel/core` API | `babel-preset-react-scope-style/postcss` 并手动传参 |

### 子路径导出

| 导入路径 | 用途 |
|----------|------|
| `babel-preset-react-scope-style` | Babel preset（JSX + import 改写） |
| `babel-preset-react-scope-style/loader` | Webpack / Rspack loader |
| `babel-preset-react-scope-style/postcss` | PostCSS 8 插件 |
| `babel-preset-react-scope-style/vite` | Vite 插件 |
| `babel-preset-react-scope-style/rspack` | Rspack 配置辅助 |

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

### Rspack

Rspack 支持 Webpack 风格 loader，**顺序与 Webpack 相同**：`style-loader` → `css-loader` → **`babel-preset-react-scope-style/loader`** → `sass-loader`（如有）。

```javascript
// rspack.config.js
const scopeLoader = require.resolve('babel-preset-react-scope-style/loader');

module.exports = {
  module: {
    rules: [
      {
        test: /\.s[ac]ss$/,
        use: [
          'style-loader',
          'css-loader',
          { loader: scopeLoader },
          'sass-loader',
        ],
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader', { loader: scopeLoader }],
      },
    ],
  },
};
```

可选辅助函数（追加 loader 规则，需与现有 `module.rules` 合并）：

```javascript
const { withReactScopeStyle } = require('babel-preset-react-scope-style/rspack');

module.exports = withReactScopeStyle({
  // 你的 rspack 配置 — 仍需在 babel.config.js 中配置 preset
});
```

仅在使用 loader 时需安装可选 peer `webpack`（Webpack 或 Rspack 场景）。

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

更多示例见 [docs/integrations.md](docs/integrations.md)。

## 使用方法

### 导入带作用域的样式

```javascript
import './Button.scss?scoped';       // 组件特定样式
import './global.scss?global';       // 组件间共享样式
```

**重要说明：** `?scoped`和`?global`是查询参数，不是实际文件名的一部分。loader使用这些参数来确定如何处理样式。

**导入策略说明：**
- **`?scoped`**：为隔离样式创建组件特定的作用域
- **`?global`**：为组件间共享样式创建项目级作用域

### 构建过程中发生了什么

当您导入带有`?scoped`或`?global`的样式文件时，插件会：

1. **生成唯一的作用域ID**：基于文件路径和项目名称
2. **注入作用域ID**：到所有JSX元素的className属性中
3. **转换CSS**：在选择器中包含作用域ID
4. **防止样式冲突**：在不同组件之间

**关键区别：**
- **`?scoped`**：创建组件特定的作用域，使用`.v-xxx`类选择器
- **`?global`**：创建全局作用域，使用`[class*=v-]`属性选择器，用于共享样式

### 示例：转换前后对比

**转换前（源代码）：**
```javascript
import './button.scss?scoped';

function Button({ children, variant }) {
  return (
    <button className={`btn btn-${variant}`}>
      {children}
    </button>
  );
}
```

**转换后（构建后代码）：**
```javascript
import './button.scss?scope-style&scoped=true&id=v-abc123';

function Button({ children, variant }) {
  return (
    <button className="v-abc123 btn btn-variant">
      {children}
    </button>
  );
}
```

### React组件示例

```javascript
import React from 'react';
import classnames from 'classnames';
import './Button.scss?scoped';        // 组件样式
import './global.scss?global';        // 共享样式

function Button({ children, variant, isActive }) {
  return (
    <button 
      className={classnames('btn', `btn-${variant}`, { 'active': isActive })}
    >
      {children}
    </button>
  );
}
```

**文件结构：**
```
Button/
├── Button.jsx
├── Button.scss
└── Button.test.js
```

### 带作用域选择器的CSS

理解作用域ID如何在CSS中生成和定位对于有效样式化至关重要。

#### 1. 默认行为
默认情况下，作用域ID自动添加到每个CSS规则的**最后一个选择器**：


```scss
/* 输入的SCSS */
.btn {
  padding: 8px 16px;
  border-radius: 4px;
  
  .btn-primary {
    background: #007bff;
    color: white;
  }
  
  .btn-secondary {
    background: #6c757d;
    color: white;
  }
}

/* SCSS嵌套和变量 */
$primary-color: #007bff;
$border-radius: 4px;

.form-control {
  border: 1px solid #ced4da;
  border-radius: $border-radius;
  
  &:focus {
    border-color: $primary-color;
    box-shadow: 0 0 0 0.2rem rgba($primary-color, 0.25);
  }
}

/* 输出的CSS */
.btn.v-abc123 {
  padding: 8px 16px;
  border-radius: 4px;
}
.btn .btn-primary.v-abc123 {
  background: #007bff;
  color: white;
}
.btn .btn-secondary.v-abc123 {
  background: #6c757d;
  color: white;
}
.form-control.v-abc123 {
  border: 1px solid #ced4da;
  border-radius: 4px;
}
.form-control.v-abc123:focus {
  border-color: #007bff;
  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
}

```

#### 2. 使用:scope自定义位置
使用`:scope`伪类来控制作用域ID的放置位置：

**⚠️ 重要：** `:scope`可以用两种方式使用，含义不同：

1. **附加到选择器**：`.container:scope` → `.container.v-abc123`（作用域ID附加到选择器上）
2. **独立选择器**：`.container :scope` → `.container .v-abc123`（作用域ID作为独立的选择器）

```scss
/* 输入SCSS */
.container:scope .button { color: blue; }  /* ✅ 作用域ID附加到.container上 */
.container :scope .button { color: blue; } /* ✅ 作用域ID作为独立选择器 */
:scope .header { font-size: 18px; }       /* ✅ 独立作用域选择器 */

/* 生成的CSS（使用默认前缀 'v-'） */
.container.v-abc123 .button { color: blue; } /* 作用域ID在.container上 */
.container .v-abc123 .button { color: blue; } /* 作用域ID作为独立元素 */
.v-abc123 .header { font-size: 18px; }       /* 作用域ID作为根元素 */
```

#### 3. 使用 :global（嵌套分界，非 CSS Modules 语法）

本库**不支持** CSS Modules 的 `:global(.class)`，仅支持：

| 写法 | 含义 |
|------|------|
| 规则开头的 `:global .reset` | 整条规则不作用域化，去掉 `:global` |
| 中间的 `.container :global .ant-btn`（SCSS/Less 嵌套展开） | 作用域加在 **`:global` 之前**；之后片段不作用域化，并去掉 `:global` |
| `:scope` | 显式指定作用域位置（优先于中间的 `:global`） |

```scss
/* 行首 :global — 本条规则不加 scope */
:global .reset { margin: 0; padding: 0; }
/* 输出: .reset { margin: 0; padding: 0; } */

/* 嵌套产生的中间 :global（如覆盖第三方子节点） */
.container {
  :global .ant-btn { color: red; }
}
/* 输出: .container.v-abc123 .ant-btn { color: red; } */
```

#### 4. 原生 CSS 嵌套（PostCSS 8+）

当样式以**嵌套 Rule 树**进入插件（原生 `.css` 嵌套语法）时：

- **平坦链原则**：嵌套展开后的有效选择器，与手写扁平 CSS 使用同一套规则——默认在**选择器链最后一节**挂 scope（如 `.card .title.v-abc123`）。
- **Rule 树叶子才 scope**：外层 block（如 `.card { .title {} }` 中的 `.card`）**不会**再挂一层 scope，避免 `.card.v-xxx .title.v-xxx`。
- **声明 + 子 rule 并存**：自动将块级声明包入 `&:scope { }`（编译后常为 `&.v-abc123 { }`，展开为 `.card.v-abc123`）。
- **`:global` 段**：`:global` 内普通子选择器不挂 scope；内层冗余 `:global` 包装会被移除；内层 `:scope` 仍正常 scope。
- **伪类**：`&:hover` 等输出 `&.v-abc123:hover` 可接受，有效链为 `.card.v-abc123:hover`。
- **扁平 SCSS/Less**（已展平为单条 selector）行为与改造前一致。

```css
/* 输入 */
.card { .title { color: red; } }

/* 输出（概念） */
.card { .title.v-abc123 { color: red; } }
/* 展开后: .card .title.v-abc123 */
```

**跨文件子组件**：嵌套时仍须在**最后一节**体现本文件 scope（`.title.v-abc123`），不能只在祖先 `.card` 上挂 scope。

#### 5. 实际应用示例
```scss
/* 默认行为 - 作用域ID添加到最后一个选择器 */
.button { color: red; }
/* 输出: .button.v-abc123 { color: red; } */

/* :scope - 组件级作用域（嵌套元素必需） */
:scope .button { color: red; }
/* 输出: .v-abc123 .button { color: red; } */

/* 使用:scope自定义位置 - 两种不同方法 */
.container:scope .button { color: blue; }
/* 输出: .container.v-abc123 .button { color: blue; } */

.container :scope .button { color: blue; }
/* 输出: .container .v-abc123 .button { color: blue; } */

/* :global - 防止作用域化 */
:global .reset { margin: 0; }
/* 输出: .reset { margin: 0; } (不添加作用域) */

/* 错误 - 没有:scope这将无法工作 */
.custom-modal .ant-modal-content { padding: 24px; }
/* 输出: .custom-modal.v-abc123 .ant-modal-content { padding: 24px; } */
/* 但选择器无法匹配，因为.ant-modal-content没有被作用域化！ */

/* 正确 - 对嵌套元素使用:scope */
.custom-modal {
  :scope {
    .ant-modal-content { padding: 24px; }
  }
}
/* 输出: .custom-modal.v-abc123 .ant-modal-content { padding: 24px; } */
/* 现在可以工作，因为:scope确保正确的作用域化 */
```

**关键转换说明：**

1. **`:scope` 选择器**：转换为 `.v-abc123` 类选择器（`?scoped`）或 `[class*=v-]` 属性选择器（`?global`）
2. **行首 `:global`**：整条规则不作用域化；**中间 `:global`**（嵌套展开）：仅 `:global` 前的选择器加 scope，后面保持全局
3. **常规 / 扁平选择器**：在最后一节添加作用域 ID（伪类之前，如 `.card.v-abc123:hover`）
4. **原生嵌套 Rule 树**：仅 **Rule 树叶子**（或显式 `:scope` / `:global`）进入 scope；展平后与扁平规则一致
5. **SCSS 变量**：在 CSS 输出中被实际值替换

### 理解 ?scoped 与 ?global

**`?scoped`（组件特定作用域）：**
```css
/* 输入CSS */
.button { color: red; }

/* 输出CSS（使用 .v-xxx 类选择器） */
.button.v-abc123 { color: red; }
```

**`?global`（全局作用域）：**
```css
/* 输入CSS */
.button { color: blue; }

/* 输出CSS（使用 [class*=v-] 属性选择器） */
.button[class*=v-] { color: blue; }
```

**为什么两者都创建作用域样式？**
- `?scoped`：将样式隔离到特定组件
- `?global`：创建可在组件间共享的样式，但仍保持项目级隔离

## 配置选项

### Babel插件选项

```javascript
{
  "presets": [
    ["babel-preset-react-scope-style", {
      scope: true,                    // 启用/禁用作用域
      scopePrefix: 'v-',             // 作用域ID前缀（默认：'v-'，可配置）
      scopeNamespace: 'my-app',      // 作用域ID命名空间
      scopeAttrs: true,              // 向属性注入作用域（默认：true）
      scopeAll: false,               // 作用域化项目中的所有JSX元素（详见下方详细说明）
      scopeVersion: false,           // 在作用域ID中包含版本号
      classAttrs: ['className'],     // 要作用域化的属性（详见下方详细说明）
      scopeRegx: /(\.(?:le|sc|sa|c)ss)(\?[a-z]+)?$/, // 样式文件正则表达式
      scopeFn: null,                 // 自定义作用域函数
      pkg: null                      // 包信息对象（来自package.json）
    }]
  ]
}
```

#### 理解scopeAll

`scopeAll`选项控制是否为项目中的所有JSX元素生成作用域ID，无论文件是否导入了带有`?scoped`后缀的样式文件。

##### 默认行为：`false`
```javascript
scopeAll: false  // 默认：只有导入作用域样式的文件中的JSX才获得作用域ID
```

**当`scopeAll: false`（默认）时会发生什么：**
- **选择性作用域化**：只有导入带有`?scoped`样式的文件中的JSX元素才获得作用域ID
- **基于文件**：作用域ID生成依赖于样式文件导入
- **性能**：更好的性能，因为不是所有JSX文件都被处理

**当`scopeAll: true`时会发生什么：**
- **全局作用域化**：项目中的所有JSX元素都获得作用域ID
- **文件无关**：无论是否导入样式文件，都会生成作用域ID
- **一致性**：每个JSX元素都有作用域ID，确保样式一致性

##### 示例场景

**使用`scopeAll: false`（默认）：**
```jsx
// 文件：ComponentA.jsx（导入带有?scoped的样式）
import './styles.scss?scoped';

function ComponentA() {
  return <div className="header">组件 A</div>;  // ✅ 获得作用域ID
}

// 文件：ComponentB.jsx（无样式导入）
function ComponentB() {
  return <div className="content">组件 B</div>; // ❌ 无作用域ID
}
```

**使用`scopeAll: true`：**
```jsx
// 文件：ComponentA.jsx（导入带有?scoped的样式）
import './styles.scss?scoped';

function ComponentA() {
  return <div className="header">组件 A</div>;  // ✅ 获得作用域ID
}

// 文件：ComponentB.jsx（无样式导入）
function ComponentB() {
  return <div className="content">组件 B</div>; // ✅ 无论如何都获得作用域ID！
}
```

##### 使用场景

**何时使用`scopeAll: false`（默认）：**
- **注重性能**：只对实际需要样式的JSX进行作用域化
- **选择性样式**：不同组件有不同的样式需求
- **构建优化**：减少不必要的作用域ID生成

**何时使用`scopeAll: true`：**
- **一致架构**：所有组件都应该有作用域ID
- **未来准备**：为潜在的样式需求做准备
- **调试友好**：在浏览器开发工具中更容易识别组件
- **团队一致性**：确保所有开发者遵循相同的模式

#### 理解classAttrs

`classAttrs`选项控制哪些JSX属性将接收自动作用域ID注入。这对于理解插件如何与不同属性类型配合工作至关重要。

##### 默认行为：`['className']`
```javascript
classAttrs: ['className']  // 默认：只有className被作用域化
```

**`className`会发生什么：**
- **自动注入**：作用域ID自动添加到`className`值中
- **动态处理**：适用于静态字符串、模板字面量和表达式
- **智能合并**：智能地将现有类与作用域ID合并

**转换示例：**
```jsx
// 输入JSX
<div className="button primary">点击我</div>
<div className={`button ${isActive ? 'active' : ''}`}>切换</div>

// 输出JSX（带作用域ID 'v-abc123'）
<div className="button primary v-abc123">点击我</div>
<div className={`button ${isActive ? 'active' : ''} v-abc123`}>切换</div>
```

##### 其他属性与className的区别

**`className`（特殊行为）：**
- ✅ **全局注入**：作用域ID被注入到所有JSX元素中
- ✅ **自动生成**：没有`className`的元素会获得一个带作用域ID的新`className`
- ✅ **智能合并**：现有的`className`值与作用域ID智能合并
- ✅ **表达式支持**：适用于静态字符串、模板字面量和表达式

**其他属性（条件注入）：**
- ✅ **条件注入**：只有当JSX元素上定义了该属性时，作用域ID才会被注入
- ❌ **无自动生成**：没有该属性的元素不会获得它
- ✅ **智能合并**：现有的属性值与作用域ID智能合并
- ✅ **表达式支持**：适用于静态字符串、模板字面量和表达式

##### 自定义classAttrs配置

**添加多个属性：**
```javascript
{
  classAttrs: ['className', 'class', 'data-class']
}
```

**为什么可能需要这样做：**
- **第三方UI库**：像Ant Design这样的组件使用自定义类名属性
- **遗留代码**：某些库使用`class`而不是`className`
- **自定义属性**：您的组件使用自定义类属性
- **框架兼容性**：支持不同的类React框架

**自定义属性示例：**
```jsx
// 输入JSX
<div class="button" data-class="primary">点击我</div>
<div>无属性</div>

// 输出JSX（带作用域ID 'v-abc123'）
<div class="v-abc123" data-class="v-abc123">点击我</div>
<div>无属性</div>  // 无作用域ID注入 - 属性不存在
```

**Ant Design组件的实际示例：**
```jsx
// 配置：classAttrs: ['className', 'overlayClassName', 'wrapClassName', 'dropdownClassName']

// 输入JSX
<Popover 
  overlayClassName="custom-popover"
  content="弹出内容"
>
  <Button>点击我</Button>
</Popover>

<Modal 
  wrapClassName="custom-modal"
  title="模态框标题"
>
  模态框内容
</Modal>

<Dropdown 
  dropdownClassName="custom-dropdown"
  menu={{ items: menuItems }}
>
  <Button>下拉菜单</Button>
</Dropdown>

// 输出JSX（带作用域ID 'v-abc123'）
<Popover 
  overlayClassName="custom-popover v-abc123"
  content="弹出内容"
>
  <Button>点击我</Button>
</Popover>

<Modal 
  wrapClassName="custom-modal v-abc123"
  title="模态框标题"
>
  模态框内容
</Modal>

<Dropdown 
  dropdownClassName="custom-dropdown v-abc123"
  menu={{ items: menuItems }}
>
  <Button>下拉菜单</Button>
</Dropdown>
```

**为什么这对作用域样式很重要：**
```scss
/* 您的作用域SCSS文件 */
.custom-popover {
  background: white;
  border: 1px solid #ddd;
}

.custom-modal {
  :scope {
    .ant-modal-content {
      padding: 24px;
    }
  }
}

.custom-dropdown {
  :scope {
    .ant-dropdown-menu {
      border-radius: 6px;
    }
  }
}
```

**生成的作用域CSS：**
```css
.custom-popover.v-abc123 {
  background: white;
  border: 1px solid #ddd;
}

.custom-modal.v-abc123 .ant-modal-content {
  padding: 24px;
}

.custom-dropdown.v-abc123 .ant-dropdown-menu {
  border-radius: 6px;
}
```

**关键区别演示：**
```jsx
// 配置：classAttrs: ['className', 'class', 'data-class']

// 输入JSX
<div className="button">有className</div>
<div class="button">有class</div>
<div data-class="button">有data-class</div>
<div>无属性</div>

// 输出JSX（带作用域ID 'v-abc123'）
<div className="button v-abc123">有className</div>        // className: 全局注入
<div class="v-abc123">有class</div>                       // class: 条件注入
<div data-class="v-abc123">有data-class</div>            // data-class: 条件注入
<div className="v-abc123">无属性</div>                    // className: 自动生成！
```

**⚠️ 重要：** 
- `className`获得全局注入（所有元素都获得）
- 其他属性获得条件注入（仅当它们存在时）
```

### 常用配置示例

**基础设置（推荐用于大多数项目）：**
```javascript
{
  "presets": ["babel-preset-react-scope-style"]
}
```

**禁用自动作用域注入：**
```javascript
{
  "presets": [
    ["babel-preset-react-scope-style", {
      scopeAttrs: false  // 禁用自动作用域注入
    }]
  ]
}
```

**自定义命名空间（适用于大型应用）：**
```javascript
{
  "presets": [
    ["babel-preset-react-scope-style", {
      scopeNamespace: 'my-app',
      scopePrefix: 'app-'
    }]
  ]
}
```

**自定义前缀（适用于品牌或一致性）：**
```javascript
{
  "presets": [
    ["babel-preset-react-scope-style", {
      scopePrefix: 'company-',         // 自定义前缀，替代默认的'v-'
      scopeNamespace: 'my-company'     // 可选：自定义命名空间
    }]
  ]
}
```

**版本感知的作用域（适用于库）：**
```javascript
{
  "presets": [
    ["babel-preset-react-scope-style", {
      scopeVersion: true,
      pkg: require('./package.json')
    }]
  ]
}
```

**第三方UI库支持：**
```javascript
{
  "presets": [
    ["babel-preset-react-scope-style", {
      classAttrs: [
        'className',           // 标准React className
        'overlayClassName',    // Ant Design Popover, Tooltip
        'wrapClassName',       // Ant Design Modal, Drawer
        'dropdownClassName',   // Ant Design Dropdown
        'popupClassName',      // Ant Design Select
        'menuClassName',       // Ant Design Menu
        'tabBarClassName'      // Ant Design Tabs
      ]
    }]
  ]
}
```

**全局作用域化（scopeAll: true）：**
```javascript
{
  "presets": [
    ["babel-preset-react-scope-style", {
      scopeAll: true,         // 为所有JSX元素生成作用域ID
      scopeNamespace: 'my-app' // 可选：自定义命名空间以确保一致性
    }]
  ]
}
```

### PostCSS插件

| 构建方式 | 是否需要配置 `postcss.config.js` |
|----------|----------------------------------|
| Webpack + loader | **否** — loader 根据 import query 传入 `scoped` / `global` / `id` |
| Vite 插件 | **否** — Vite 插件内部调用 PostCSS |
| 独立 / 自定义流水线 | **是** — 使用 `babel-preset-react-scope-style/postcss` 并手动传参 |

通常 PostCSS 参数由 Babel 改写后的 `?scoped` / `?global` 导入自动推导。未使用 loader 或 Vite 插件时，请参阅 [纯 PostCSS](#纯-postcss独立使用)。

```javascript
// 仅供参考 - 请勿手动配置
{
  scoped: true,                  // 启用作用域样式
  global: false,                 // 启用全局样式
  id: 'v-component-id',          // 作用域ID（自动生成）
  globalSelector: ''             // 全局选择器前缀
}
```

PostCSS插件会根据您的导入语句（`?scoped`、`?global`）自动从loader接收这些参数。

## 高级功能


### 自定义作用域函数

```javascript
{
  scopeFn: (filePath, query, context) => {
    // 文件转换的自定义逻辑
    return filePath + query;
  }
}
```

**实际应用示例 - 将SCSS转换为CSS：**
```javascript
{
  scopeFn: (filePath, query, context) => {
    // 在构建过程中将.scss文件转换为.css
    if (filePath.endsWith('.scss')) {
      return filePath.replace('.scss', '.css') + query;
    }
    return filePath + query;
  }
}
```

### 多作用域配置（仅内部使用）

**⚠️ 重要：** 仅供参考。loader会根据您的导入语句自动处理多个作用域。

```javascript
// 这是loader内部处理多个作用域的方式
// 请勿在PostCSS配置中手动配置
[
  {
    scoped: true,
    global: false,
    id: 'v-ewp-'
  },
  {
    scoped: true,
    global: false,
    id: 'v-component-123'
  }
]
```

**内部处理过程：**
1. **输入CSS文件**被多次处理
2. **第一个作用域**创建基础作用域版本
3. **额外作用域**生成具有不同ID的额外副本
4. **最终输出**在一个文件中包含所有作用域版本

**使用场景示例：**
- **全局作用域**（`v-ewp-`）：用于共享组件库
- **组件作用域**（`v-component-123`）：用于单个组件样式
- **结果**：一个CSS文件包含在全局和组件上下文中都能工作的样式

**工作原理：**
- loader自动检测不同的导入模式（`?scoped`、`?global`）
- 内部创建适当的作用域配置
- 用户只需要在导入语句中使用`?scoped`或`?global`


**示例输出：**
```css
/* 原始CSS */
.button { color: red; }

/* 使用多个作用域生成 */
.button.v-ewp- { color: red; }        /* 第一个作用域 */
.button.v-component-123 { color: red; } /* 第二个作用域 */
.button.v-component-456 { color: red; } /* 第三个作用域 */
```

### 多作用域配置

```javascript
// 带多个作用域的PostCSS配置
module.exports = {
  plugins: [
    require('babel-preset-react-scope-style/postcss')([
      {
        scoped: true,
        global: true,
        id: 'v-ewp-'
      },
      {
        scoped: true,
        global: false,
        id: 'v-component-123'
      }
    ])
  ]
};
```

## 工作原理

1. **Babel插件**: 
   - 检测带查询参数的样式导入（`?scoped`、`?global`）
   - 向JSX元素的className属性注入作用域ID
   - 转换className表达式以实现正确的作用域化

2. **PostCSS插件**:
   - 处理带作用域隔离的CSS选择器
   - 处理 `:scope`、`:global` 与原生 CSS 嵌套
   - 为组件生成唯一的作用域ID
   - 根据导入类型应用不同的作用域策略

3. **Webpack Loader**:
   - 与webpack构建流程集成
   - 应用PostCSS转换
   - 维护源码映射支持

### 作用域ID生成

插件使用引用文件的路径和项目名称的哈希值生成作用域ID：

```javascript
// 对于 ?scoped 导入
scopeId = scopePrefix + hash(importingFilePath + projectName)
// 默认：scopePrefix = 'v-'，生成如：v-abc123

// 对于 ?global 导入  
scopeId = scopePrefix + hash(importingFilePath + projectName)
// 默认：scopePrefix = 'v-'，生成如：v-abc123
```

**重要说明：** 作用域ID基于引用文件的路径生成，而不是被引用文件的路径。这意味着：
- 组件A导入`./shared/styles.scss?scoped`获得基于组件A路径的作用域ID
- 组件B导入`./shared/styles.scss?scoped`获得基于组件B路径的作用域ID
- 结果：相同的共享文件为不同组件生成不同的作用域ID

### CSS转换策略

**组件作用域（`?scoped`）：**
- 向CSS规则添加`.{scopePrefix}xxx`类选择器（默认：`.v-xxx`）
- 创建紧密的组件隔离
- 示例：`.button` → `.button.v-abc123`（默认前缀）

**全局作用域（`?global`）：**
- 向CSS规则添加`[class*={scopePrefix}]`属性选择器（默认：`[class*=v-]`）
- 允许样式在组件间共享
- 示例：`.button` → `.button[class*=v-]`（默认前缀）
- 在启用组件共享的同时保持项目级隔离

## 示例

**使用classnames的输入JSX:**
```jsx
import classNames from 'classnames';

function Button({ isActive, variant, disabled }) {
  return (
    <button 
      className={classNames(
        'btn',
        `btn-${variant}`,
        { 'btn-active': isActive, 'btn-disabled': disabled }
      )}
    >
      点击我
    </button>
  );
}
```

**带作用域ID的输出JSX:**
```jsx
import classNames from 'classnames';

function Button({ isActive, variant, disabled }) {
  return (
    <button 
      className={classNames(
        'btn',
        `btn-${variant}`,
        { 'btn-active': isActive, 'btn-disabled': disabled }
      ) + ' v-abc123'}
    >
      点击我
    </button>
  );
}
```

**使用clsx的输入JSX:**
```jsx
import clsx from 'clsx';

function Card({ type, size, className }) {
  return (
    <div className={clsx(
      'card',
      type && `card-${type}`,
      size && `card-${size}`,
      className
    )}>
      卡片内容
    </div>
  );
}
```

**带作用域ID的输出JSX:**
```jsx
import clsx from 'clsx';

function Card({ type, size, className }) {
  return (
    <div className={clsx(
      'card',
      type && `card-${type}`,
      size && `card-${size}`,
      className
    ) + ' v-abc123'}>
      卡片内容
    </div>
  );
}
```

### 转换前

```javascript
import './styles.scss?scoped';

function Component() {
  return <div className="header">Hello</div>;
}
```

### 多个组件导入相同文件

**组件A (src/components/Button/Button.jsx):**
```javascript
import './shared/styles.scss?scoped';

function Button() {
  return <button className="btn">点击我</button>;
}
```

**组件B (src/components/Modal/Modal.jsx):**
```javascript
import './shared/styles.scss?scoped';

function Modal() {
  return <div className="modal">模态框内容</div>;
}
```

**结果：** 每个组件获得不同的作用域ID：
- Button组件：`v-abc123`（基于`src/components/Button/Button.jsx`）
- Modal组件：`v-def456`（基于`src/components/Modal/Modal.jsx`）

相同的`shared/styles.scss`文件为每个组件生成不同的作用域版本。

### 转换后

```javascript
import './styles.scss?scope-style&scoped=true&id=v-abc123';

function Component() {
  return <div className="v-abc123 header">Hello</div>;
}
```

### CSS转换

```css
/* 输入 */
.header {
  color: blue;
}

/* 输出 */
.header.v-abc123 {
  color: blue;
}
```

## 常见问题

### Q: 为什么要使用作用域样式？
**A:** 作用域样式可以防止组件之间的CSS冲突，使您的React应用更易维护，减少意外样式覆盖的可能性。

### Q: 作用域ID生成是如何工作的？
**A:** 插件基于文件路径和package.json中的项目名称生成唯一的哈希值，确保在构建过程中ID的一致性。

### Q: 可以与CSS-in-JS库一起使用吗？
**A:** 是的！插件可以与classnames、clsx等动态类名工具库无缝配合。它会自动将作用域ID注入到最终的className值中，确保所有动态类都被正确作用域化。

**示例：**
```jsx
// 输入
className={classNames('btn', variant && `btn-${variant}`)}

// 输出  
className={classNames('btn', variant && `btn-${variant}`) + ' v-abc123'}
```

### Q: ?scoped 和 ?global 有什么区别？
**A:** 
- `?scoped`：创建组件特定的作用域，使用`.{scopePrefix}xxx`类选择器（默认：`.v-xxx`）
- `?global`：创建全局作用域，使用`[class*={scopePrefix}]`属性选择器（默认：`[class*=v-]`），用于组件间共享样式

两者都创建作用域样式，但`?global`允许样式在组件间共享，同时保持项目级隔离。

**实际效果示例：**
- `?scoped`：`.button` → `.button.v-abc123`
- `?global`：`.button` → `.button[class*=v-]`

### Q: 样式文件里 `@import` 的 `?scoped` 和 JS 里的 `?scoped` 一样吗？为什么不支持 `?global`？
**A:** **不一样。** 在 **CSS/SCSS/Less 样式文件** 的 `@import url(...)` 中，本库**只识别并改写 `?scoped` 这一种后缀**（例如 `@import url("./partial.scss?scoped");`）。这里的 `?scoped` 表示：**沿用当前正在被处理的这份样式文件的作用域**，而不是在样式侧再生成一套新的 JS hash 作用域 id。

| 当前样式文件在构建侧的作用域（由 JS `import` 的 `?scoped` / `?global` 决定） | `@import` 里写 `?scoped` 时，等价于 |
| --- | --- |
| 组件作用域（JS `?scoped`，类选择器 `.v-xxx`） | 子文件也按**同一组件**作用域处理 |
| 全局共享作用域（JS `?global`，`[class*=v-]`） | 子文件按**同一全局**作用域处理 |

构建时会把子文件路径改写为带 `scope-style&scoped=true&id=...`（若父文件为 global 则还会带 `&global=true`）的 URL，与 JS 侧改写 import 的规则一致。

**为什么不支持在 `@import` 里写 `?global`？**

1. **作用域模式应由「谁引用了这份 CSS」决定**：组件级还是项目级共享，已经在 **JS** 里通过 `import './x.scss?scoped'` 或 `import './x.scss?global'` 定好了；PostCSS 处理父样式时会把 `scoped` / `global` / `id` 一并传入，子 `@import` 只需一个标记说明「跟着父文件走」即可。
2. **样式文件无法单独生成 JS 侧的 scope id**：hash 来自引用该样式的组件文件路径；嵌套样式不能像在 JS 里那样再声明「我要 global 还是 scoped」，只能**复用父文件已有的 id 与模式**。
3. **避免语义冲突**：若在 `@import` 里再允许 `?global`，容易与 JS 的 `?global`、以及 CSS 选择器里的 `:global` 伪类混淆；实现上也会对无 `?scoped` 的 URL（含 `?global` 或裸路径）保持原样，不注入 `scope-style`。

若子文件需要「整条规则不参与作用域」，请在**该子文件的选择器**中使用行首 `:global`（见上文 `:global` 说明），而不是在 `@import` URL 上写 `?global`。

### Q: 如何处理第三方组件样式？
**A:** 有两种主要方法来处理第三方组件样式：

1. **修改外层元素样式**：为组件提供`className`属性，然后通过该className来修改外层元素样式。

2. **修改内部元素样式**：使用指定的`className`配合`:scope`伪类来控制作用域ID位置，然后通过透传的组件内部类名来修改样式。

**示例：**
```jsx
// 带有自定义className的组件
<AntdButton className="custom-button">点击我</AntdButton>
```

```scss
// 外层元素样式
.custom-button {
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

// 使用:scope的内部元素样式
.custom-button {
  :scope {
    .ant-btn-inner {
      font-weight: 600;
    }
    
    .ant-btn-icon {
      margin-right: 8px;
    }
  }
}
```

### Q: 多个组件文件引用同一个样式文件并添加?scoped后缀后会怎么处理？
**A:** 插件基于引用文件的路径生成不同的作用域ID，而不是被引用的文件。在webpack构建过程中，不同的查询参数会被识别成不同的文件，因此相同的样式文件会因为不同的引用生成多个副本，只是不同的副本中的作用域ID不同。这意味着每个组件都会获得共享样式的独立作用域版本。

### Q: CSS中:scope和:global有什么区别？
**A:** 
- **`:scope`**：控制 scope id 的插入位置（替换为 `.v-xxx` 或 `[class*=v-]`）
- **`:global`**：不是 CSS Modules 的 `:global(...)`。**行首** `:global` 表示整条规则不作用域化；**中间** `:global`（嵌套展开）表示仅 **`:global` 之前** 的选择器加 scope，后面片段保持全局

### Q: scopeAttrs是如何工作的？
**A:** 
- **默认值**：`true` - 自动向JSX元素的className属性注入作用域ID
- **禁用时**：设置为`false`以禁用自动作用域注入（当您想要手动控制时很有用）

### Q: 我应该在实际文件名中包含?scoped或?global吗？
**A:** 不应该！`?scoped`和`?global`是loader的查询参数，不是文件名的一部分。使用标准文件名如`Button.scss`，并在导入语句中添加参数：`import './Button.scss?scoped'`。

**重要说明：** 默认情况下，仅存在`?scoped`后缀的文件中的jsx的className才会生成作用域id。即使某个文件中的jsx不需要配置样式，但如果你希望也为它们生成作用域id（或者让通过`?global`引用的全局作用域样式生效），你可以添加个空白的样式文件然后通过`?scoped`后缀进行引用。

### Q: 我可以在没有webpack的情况下使用此插件吗？
**A:** 可以。请使用 **[Vite 插件](#vite)**（`babel-preset-react-scope-style/vite`）、**[Rspack loader](#rspack)**（与 Webpack 相同），或 **[独立 PostCSS](#纯-postcss独立使用)**。也可使用 [build-react-esm-project](https://github.com/gxlmyacc/build-react-esm-project) 做基于 Gulp 的 React ESM 构建。

### Q: 插件如何处理多个作用域配置？
**A:** 当提供多个作用域配置时，PostCSS插件会多次处理输入的CSS文件，生成一个包含所有作用域版本的单一输出文件。这允许相同的样式在不同的上下文中工作（全局、组件特定等），而不会产生冲突。

### Q: 我需要配置PostCSS插件吗？
**A:** **Webpack / Vite：** 无需手动配置 PostCSS，loader 或 Vite 插件会自动处理。**独立 PostCSS：** 需要在 `postcss.config.js` 中添加 `babel-preset-react-scope-style/postcss`，并自行设置 `scoped`、`global`、`id`（见 [纯 PostCSS](#纯-postcss独立使用)）。

### Q: className和classAttrs中其他属性有什么区别？
**A:** `className`属性获得全局注入 - 它被添加到所有JSX元素中（即使那些没有className的元素），而其他属性（如`class`或`data-class`）只有在JSX元素上已经存在时才会获得作用域ID注入。这就是为什么`className`是全面样式的默认且推荐选择。

### Q: 为什么嵌套元素选择器需要使用:scope？
**A:** 作用域样式不会自动继承到子元素。当您编写`.custom-modal .ant-modal-content`时，只有`.custom-modal`获得作用域ID，但`.ant-modal-content`仍然没有作用域化。使用`:scope`确保嵌套选择器被正确作用域化，并且可以匹配生成的HTML结构。

### Q: scopeAll: false和scopeAll: true有什么区别？
**A:** `scopeAll: false`（默认）只为导入带有`?scoped`样式的文件中的JSX元素生成作用域ID，而`scopeAll: true`为项目中的所有JSX元素生成作用域ID，无论是否导入样式文件。当您想要一致的架构或为样式需求做未来准备时，使用`scopeAll: true`。

### Q: 作用域ID在CSS选择器中是如何定位的？
**A:** 默认在每条规则选择器链的**最后一节**添加作用域 ID（伪类之前，如 `.button.v-abc123:hover`）。使用 `:scope` 控制位置，`:global` 标记全局片段。例如 `.button` → `.button.v-abc123`，`.container:scope .button` → `.container.v-abc123 .button`。

**⚠️ 重要：** `:scope` 可用两种方式：
1. **附加**：`.container:scope` → `.container.v-abc123`
2. **独立**：`.container :scope` → `.container .v-abc123`

### Q: 原生 CSS 嵌套如何作用域化？
**A:** 与扁平规则一致：仅 **Rule 树叶子** 默认挂 scope，展开后平坦链最后一节带 scope（如 `.card { .title {} }` → `.card .title.v-abc123`）。同一 block 既有声明又有子选择器时，声明会自动包入 `&:scope`。`:global` 段内普通类名不挂 scope；`:global` 内 `:scope` 子块仍 scope。每个 JSX 元素仍有同一 `v-xxx`，selector 须在最后一节绑定本文件 scope 以免误伤其他文件的子组件。

## 最佳实践

### 1. 文件命名约定
保持组件文件和样式文件名称一致：
```
Button/
├── Button.jsx
├── Button.scss
└── Button.test.js
```

**对于共享样式：**
```
shared/
├── mixins.scss         # 共享SCSS混入（导入时使用?scoped）
└── common.scss         # 全局共享样式（导入时使用?global）
```

**文件名与导入参数的区别：**
- **文件名**：使用标准扩展名（`.scss`、`.sass`、`.less`）
- **导入参数**：添加`?scoped`或`?global`来控制作用域行为
- **示例**：`Button.scss`（文件）+ `import './Button.scss?scoped'`（导入）

### 2. 样式组织
- 使用`?scoped`用于组件特定样式和SCSS工具
- 使用`?global`用于组件间共享样式（布局、主题、重置）
- 按作用域组织导入：组件样式优先，然后共享样式
- **共享文件**：多个组件导入相同的文件并添加`?scoped`将基于其导入路径获得不同的作用域ID

### 3. 第三方UI库集成
- **Ant Design**：配置`classAttrs`以包含自定义类名属性
- **常见属性**：`overlayClassName`、`wrapClassName`、`dropdownClassName`、`popupClassName`
- **配置示例**：`classAttrs: ['className', 'overlayClassName', 'wrapClassName', 'dropdownClassName']`
- **优势**：应用于第三方组件的自定义样式将被正确作用域化

### 3. CSS选择器
- 嵌套样式优先用原生嵌套或已展平的扁平 selector；需要块级声明时用 `&:scope`
- 谨慎使用 `:global`，仅用于真正的全局片段
- 利用CSS自定义属性进行主题设置

**理解:scope定位：**
- **`.container:scope`**：作用域ID附加到容器上（`.container.v-abc123`）
- **`.container :scope`**：作用域ID作为独立元素（`.container .v-abc123`）
- **根据HTML结构和样式需求选择**

**关于作用域继承的重要说明：**
- **作用域样式不会自动继承到子元素**
- **使用`:scope`来明确目标嵌套元素**
- **没有`:scope`，子元素选择器将无法匹配**


### 4. 性能考虑
- 仅对需要的样式进行作用域化
- 避免过度使用`:global`选择器
- 使用有意义的类名以便更好地调试

## Stylelint

本包提供可选 **Stylelint 插件**（`babel-preset-react-scope-style/stylelint`），与 PostCSS 语义一致。规则**报告文案为英文**；用例见 `test/stylelint-*.test.js`。

### 安装

在业务项目中将 Stylelint 安装为开发依赖（本 preset 不内置 stylelint 可执行文件）：

```bash
npm install -D stylelint
```

### 配置

新建或扩展 `.stylelintrc.cjs`（或复制本仓库 [`stylelint.config.cjs`](stylelint.config.cjs)）：

```javascript
module.exports = {
  plugins: ['babel-preset-react-scope-style/stylelint'],
  rules: {
    'react-scope-style/no-global-paren': true,
    'react-scope-style/no-import-global-query': true,
    'react-scope-style/no-scope-typo': true,
    'react-scope-style/prefer-ampersand-scope-wrapper': [
      true,
      { severity: 'warning', minRuleAncestors: 2 },
    ],
    'react-scope-style/no-duplicate-scope-markers': [
      true,
      { severity: 'warning' },
    ],
  },
};
```

### 规则一览

| 规则 | 级别 | 说明 |
|------|------|------|
| `no-global-paren` | error | 不支持 `:global(...)`（CSS Modules） |
| `no-import-global-query` | error | 样式内 `@import` 的 `?global` 不会生效 |
| `no-scope-typo` | error | 拼写错误：`:scoped`、`?scope` 等 |
| `prefer-ampersand-scope-wrapper` | warning | 深层嵌套建议用 `&:global` / `&:scope` 替代裸包装块 |
| `no-duplicate-scope-markers` | warning | 同选择器或嵌套中重复的 `:global` / `:scope` |

**说明：** Stylelint 只检查样式文件，不检查 JS 里的 `import './x.scss?scope'`。`:global(...)` 由 `no-global-paren` 报错，不由 `no-duplicate-scope-markers` 处理。

### 在本仓库中运行

```bash
npm run lint:style
npm test
```

## 开发

### 构建

```bash
npm run build
```

### 演示

查看`babel/demo`和`postcss/demo`目录中的工作示例。

## 故障排除

### 常见问题

**1. 样式没有被作用域化**
- 检查导入语句是否包含`?scoped`
- 验证Babel配置是否正确
- 确保PostCSS插件配置正确

**2. 作用域ID在每次构建时都改变**
- 检查`scopeVersion`是否设置为`false`
- 确保`pkg`选项配置正确
- 验证文件路径是否一致

**3. CSS没有被处理**
- 检查PostCSS配置
- 验证webpack loader配置
- 确保文件扩展名匹配`scopeRegx`

**4. 全局样式被作用域化**
- 在导入语句中使用`?global`
- 在CSS中使用`:global`选择器
- 检查PostCSS插件配置

### 调试模式

通过设置`DEBUG`环境变量启用调试日志：
```bash
DEBUG=babel-preset-react-scope-style npm run build
```

## 许可证

MIT许可证 - 详见LICENSE文件。

## 相关项目

- [build-react-esm-project](https://github.com/gxlmyacc/build-react-esm-project) - 带作用域样式支持的非webpack环境React构建工具
- [styled-components](https://github.com/styled-components/styled-components) - CSS-in-JS库
- [CSS Modules](https://github.com/css-modules/css-modules) - 基于组件的样式CSS模块
- [PostCSS](https://github.com/postcss/postcss) - CSS转换工具

## 贡献

欢迎贡献！请随时提交Pull Request。
