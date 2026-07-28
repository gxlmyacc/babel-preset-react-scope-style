# 配置选项

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

.custom-modal:scope {
  .ant-modal-content {
    padding: 24px;
  }
}

.custom-dropdown:scope {
  .ant-dropdown-menu {
    border-radius: 6px;
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

通常 PostCSS 参数由 Babel 改写后的 `?scoped` / `?global` 导入自动推导。未使用 loader 或 Vite 插件时，请参阅 [纯 PostCSS](./integrations.zh-CN.md#纯-postcss独立使用)。

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
