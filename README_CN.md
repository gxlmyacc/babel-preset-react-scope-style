# babel-preset-react-scope-style

一个为React组件提供样式作用域化的综合解决方案，包含Babel插件、PostCSS插件和webpack loader支持。

[![NPM version](https://img.shields.io/npm/v/babel-preset-react-scope-style.svg?style=flat)](https://npmjs.com/package/babel-preset-react-scope-style)
[![NPM downloads](https://img.shields.io/npm/dm/babel-preset-react-scope-style.svg?style=flat)](https://npmjs.com/package/babel-preset-react-scope-style)

## [English](README.md)

## 功能特性

- **Babel插件**: 自动向JSX元素注入作用域ID，并转换className表达式
- **PostCSS插件**: 处理CSS文件的作用域隔离，支持全局/局部作用域
- **Webpack Loader**: 与webpack构建流程集成，实现无缝的样式作用域化
- **灵活配置**: 可自定义作用域前缀、属性和作用域策略
- **React组件支持**: 针对React组件优化，自动处理className属性
- **CSS-in-JS支持**: 兼容classnames、clsx等工具库
- **深度选择器支持**: 处理`>>>`和`:scope`选择器，实现组件样式控制
- **全局样式支持**: 在保持组件隔离的同时支持全局样式



## 安装

```bash
npm install babel-preset-react-scope-style
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

在webpack配置中添加loader（将'babel-preset-react-scope-style/loader'放置在'css-loader'之后，其他loader之前）：

> **注意：** 如果您想在非webpack环境中使用此插件，可以参考 [build-react-esm-project](https://github.com/gxlmyacc/build-react-esm-project) 构建工具，它为React项目提供了带作用域样式支持的综合构建解决方案。

#### CSS文件
```javascript
module.exports = {
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader',
          'babel-preset-react-scope-style/loader',
        ]
      }
    ]
  }
};
```

#### SCSS文件
```javascript
module.exports = {
  module: {
    rules: [
      {
        test: /\.scss$/,
        use: [
          'style-loader',
          'css-loader',
          'babel-preset-react-scope-style/loader',
          {
            loader: 'sass-loader',
          }
        ]
      }
    ]
  }
};
```

#### LESS文件
```javascript
module.exports = {
  module: {
    rules: [
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

#### 完整的Webpack配置
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
        test: /\.scss$/,
        use: [
          'style-loader',
          'css-loader',
          'babel-preset-react-scope-style/loader',
          'sass-loader'
        ]
      },
      // SASS文件
      {
        test: /\.sass$/,
        use: [
          'style-loader',
          'css-loader',
          'babel-preset-react-scope-style/loader',
          {
            loader: 'sass-loader',
            options: {
              sassOptions: {
                indentedSyntax: true
              }
            }
          }
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

```scss
/* 使用 :scope 进行组件级样式设置 */
:scope .button {
  background: blue;
}

.container:scope .button {
  background: red;
}

/* 使用 >>> 进行深度选择器（突破组件边界） */
.container >>> .deep-element {
  color: red;
}

/* 使用 :global 进行全局样式（不会被作用域化） */
:global .global-class {
  font-family: Arial;
}

/* 常规选择器（自动作用域化） */
.btn {
  padding: 8px 16px;
  border-radius: 4px;
  
  &-primary {
    background: #007bff;
    color: white;
  }
  
  &-secondary {
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
```

### 转换后的CSS（构建后的CSS）

**转换后的CSS（构建后）：**
```css
/* 使用 ?scoped 导入时的输出 */
.v-abc123 .button {
  background: blue;
}
.container.v-abc123 .button {
  background: red;
}

.container.v-abc123 .deep-element {
  color: red;
}


.global-class {
  font-family: Arial;
}

.btn.v-abc123 {
  padding: 8px 16px;
  border-radius: 4px;
}

.btn-primary.v-abc123 {
  background: #007bff;
  color: white;
}

.btn-secondary.v-abc123 {
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

/* 使用 ?global 导入时的输出 */
[class*=v-] .button {
  background: blue;
}
.container[class*=v-] .button {
  background: red;
}

.container[class*=v-] .deep-element {
  color: red;
}

.global-class {
  font-family: Arial;
}

.btn[class*=v-] {
  padding: 8px 16px;
  border-radius: 4px;
}

.btn-primary[class*=v-] {
  background: #007bff;
  color: white;
}

.btn-secondary[class*=v-] {
  background: #6c757d;
  color: white;
}

.form-control[class*=v-] {
  border: 1px solid #ced4da;
  border-radius: 4px;
}

.form-control[class*=v-]:focus {
  border-color: #007bff;
  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
}
```

**关键转换说明：**

1. **`:scope` 选择器**：转换为 `.v-abc123` 类选择器（`?scoped`）或 `[class*=v-]` 属性选择器（`?global`）
2. **`>>>` 深度选择器**：父元素获得作用域ID，子元素保持原样
3. **`:global` 选择器**：完全跳过作用域转换，保持原始选择器
4. **常规选择器**：自动在末尾添加作用域ID
5. **嵌套选择器**：每个嵌套层级都会获得作用域ID
6. **SCSS变量**：在CSS输出中被实际值替换

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

### 理解scopeAll

`scopeAll`选项控制是否为项目中的所有JSX元素生成作用域ID，无论文件是否导入了带有`?scoped`后缀的样式文件。

#### 默认行为：`false`
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

#### 示例场景

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

#### 使用场景

**何时使用`scopeAll: false`（默认）：**
- **注重性能**：只对实际需要样式的JSX进行作用域化
- **选择性样式**：不同组件有不同的样式需求
- **构建优化**：减少不必要的作用域ID生成

**何时使用`scopeAll: true`：**
- **一致架构**：所有组件都应该有作用域ID
- **未来准备**：为潜在的样式需求做准备
- **调试友好**：在浏览器开发工具中更容易识别组件
- **团队一致性**：确保所有开发者遵循相同的模式

### 理解classAttrs

`classAttrs`选项控制哪些JSX属性将接收自动作用域ID注入。这对于理解插件如何与不同属性类型配合工作至关重要。

#### 默认行为：`['className']`
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

#### 其他属性与className的区别

**`className`（特殊行为）：**
- ✅ **全局注入**：作用域ID被注入到所有JSX元素中
- ✅ **自动生成**：没有`className`的元素会获得一个带作用域ID的新`className`
- ✅ **智能合并**：现有的`className`值与作用域ID智能合并
- ✅ **表达式支持**：适用于静态字符串、模板字面量和表达式

**其他属性（条件注入）：**
- ✅ **条件注入**：只有当JSX元素上定义了该属性时，作用域ID才会被注入
- ❌ **无自动生成**：没有该属性的元素不会获得它
- ❌ **值替换**：整个属性值被作用域ID替换
- ❌ **有限表达式支持**：仅适用于简单字符串值

#### 自定义classAttrs配置

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
- 非`className`属性的整个值被作用域ID替换
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

**⚠️ 重要：** 该插件仅供内部的loader使用，用户无需配置。PostCSS插件参数（`scoped`、`global`、`id`等）被loader内部使用，插件会根据您的导入语句自动接收正确的参数。

**用户无需进行任何PostCSS配置，所有配置都由webpack loader自动处理。**

### PostCSS插件选项（仅内部使用）

**⚠️ 重要：** 这些选项被loader内部使用，用户不应该配置。

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

### 作用域ID生成规则

理解作用域ID如何在CSS中生成和定位对于有效样式化至关重要。

#### 1. 默认行为
默认情况下，作用域ID自动添加到每个CSS规则的**最后一个选择器**：

```scss
/* 输入SCSS */
.button { color: red; }
.container .item { background: blue; }
.form input[type="text"] { border: 1px solid #ccc; }

/* 生成的CSS（使用默认前缀 'v-'） */
.button.v-abc123 { color: red; }
.container .item.v-abc123 { background: blue; }
.form input[type="text"].v-abc123 { border: 1px solid #ccc; }
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

#### 3. 使用:global的全局样式
将样式包装在`:global`中以防止作用域化：

```scss
/* 输入SCSS */
:global .reset { margin: 0; padding: 0; }


/* 生成的CSS */
.reset { margin: 0; padding: 0; }  /* 无作用域ID */

```

#### 4. 使用>>>的深度选择器
使用`>>>`进行深度选择器：

```scss
/* 输入SCSS */
.container >>> .deep-element { color: green; }
.wrapper >>> .nested .deep { background: yellow; }

/* 生成的CSS */
.container.v-abc123 .deep-element { color: green; }
.wrapper.v-abc123 .nested .deep { background: yellow; }
```

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

**多作用域处理：**
当PostCSS插件接收到作用域配置数组时，它会多次处理输入的CSS文件：
1. **第一个作用域**：生成第一个作用域版本
2. **额外作用域**：创建具有不同作用域ID的额外副本
3. **结果**：输出的CSS文件包含相同样式的多个作用域版本

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

### 带源码映射的Webpack Loader

```javascript
{
  test: /\.css$/,
  use: [
    'style-loader',
    'css-loader',
    {
      loader: 'babel-preset-react-scope-style/loader',
      options: {
        sourceMap: true,
      }
    }
  ]
}
```

## 工作原理

1. **Babel插件**: 
   - 检测带查询参数的样式导入（`?scoped`、`?global`）
   - 向JSX元素的className属性注入作用域ID
   - 转换className表达式以实现正确的作用域化

2. **PostCSS插件**:
   - 处理带作用域隔离的CSS选择器
   - 处理`:scope`、`>>>`和`:global`选择器
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

### CSS-in-JS示例

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
- **`:scope`**：表示当前组件的作用域，会被替换为组件的作用域ID
- **`:global`**：防止特定选择器被作用域化，保持原样不变

### Q: scopeAttrs是如何工作的？
**A:** 
- **默认值**：`true` - 自动向JSX元素的className属性注入作用域ID
- **禁用时**：设置为`false`以禁用自动作用域注入（当您想要手动控制时很有用）

### Q: 我应该在实际文件名中包含?scoped或?global吗？
**A:** 不应该！`?scoped`和`?global`是loader的查询参数，不是文件名的一部分。使用标准文件名如`Button.scss`，并在导入语句中添加参数：`import './Button.scss?scoped'`。

### Q: 我可以在没有webpack的情况下使用此插件吗？
**A:** 可以！虽然此插件设计用于webpack，但您可以使用 [build-react-esm-project](https://github.com/gxlmyacc/build-react-esm-project) 构建工具用于非webpack环境。它通过基于gulp的构建提供作用域样式支持。

### Q: 插件如何处理多个作用域配置？
**A:** 当提供多个作用域配置时，PostCSS插件会多次处理输入的CSS文件，生成一个包含所有作用域版本的单一输出文件。这允许相同的样式在不同的上下文中工作（全局、组件特定等），而不会产生冲突。

### Q: 我需要配置PostCSS插件吗？
**A:** 是的，您需要在`postcss.config.js`中添加PostCSS插件，但不需要配置其参数。插件会根据您的导入语句从webpack loader自动接收正确的参数。

### Q: className和classAttrs中其他属性有什么区别？
**A:** `className`属性获得全局注入 - 它被添加到所有JSX元素中（即使那些没有className的元素），而其他属性（如`class`或`data-class`）只有在JSX元素上已经存在时才会获得作用域ID注入。这就是为什么`className`是全面样式的默认且推荐选择。

### Q: 为什么嵌套元素选择器需要使用:scope？
**A:** 作用域样式不会自动继承到子元素。当您编写`.custom-modal .ant-modal-content`时，只有`.custom-modal`获得作用域ID，但`.ant-modal-content`仍然没有作用域化。使用`:scope`确保嵌套选择器被正确作用域化，并且可以匹配生成的HTML结构。

### Q: scopeAll: false和scopeAll: true有什么区别？
**A:** `scopeAll: false`（默认）只为导入带有`?scoped`样式的文件中的JSX元素生成作用域ID，而`scopeAll: true`为项目中的所有JSX元素生成作用域ID，无论是否导入样式文件。当您想要一致的架构或为样式需求做未来准备时，使用`scopeAll: true`。

### Q: 作用域ID在CSS选择器中是如何定位的？
**A:** 默认情况下，作用域ID添加到每个CSS规则的最后一个选择器。使用`:scope`来控制位置，`:global`来防止作用域化，`>>>`用于深度选择器。例如，`.button`变成`.button.v-abc123`，而`.container:scope .button`变成`.container.v-abc123 .button`。

**⚠️ 重要：** `:scope`可以用两种方式使用：
1. **附加方式**：`.container:scope` → `.container.v-abc123`（作用域ID附加到选择器上）
2. **独立方式**：`.container :scope` → `.container .v-abc123`（作用域ID作为独立选择器）

两种方式都有效，但产生不同的CSS输出。

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
- 尽可能使用`:scope`而不是`>>>`
- 谨慎使用`:global`选择器，仅用于真正的全局样式
- 利用CSS自定义属性进行主题设置

**理解:scope定位：**
- **`.container:scope`**：作用域ID附加到容器上（`.container.v-abc123`）
- **`.container :scope`**：作用域ID作为独立元素（`.container .v-abc123`）
- **根据HTML结构和样式需求选择**

**关于作用域继承的重要说明：**
- **作用域样式不会自动继承到子元素**
- **使用`:scope`来明确目标嵌套元素**
- **没有`:scope`，子元素选择器将无法匹配**

**样式文件中作用域ID生成规则：**

1. **默认行为**：作用域ID自动添加到每个CSS规则的最后一个选择器
2. **自定义位置**：使用`:scope`伪类或`>>>`来控制作用域ID的放置位置
3. **全局样式**：将样式包装在`:global`伪类中以防止作用域化

**示例：**
```scss
/* 默认：作用域ID添加到最后一个选择器 */
.button { color: red; }
/* 输出：.button.v-abc123 { color: red; } */

/* 使用:scope自定义位置 */
.container :scope .button { color: blue; }
/* 输出：.container.v-abc123 .button { color: blue; } */

/* 全局样式（不作用域化） */
:global .reset { margin: 0; }
/* 输出：.reset { margin: 0; }（不添加作用域ID） */
```

**选择器示例：**
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



/* >>> - 深度选择器（谨慎使用） */
.container >>> .deep { color: blue; }
/* 输出: .container.v-abc123 .deep { color: blue; } */

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

### 4. 性能考虑
- 仅对需要的样式进行作用域化
- 避免过度使用`:global`选择器
- 使用有意义的类名以便更好地调试

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
