# 使用方法

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

#### 2. 使用 :scope 自定义位置

使用 `:scope` 控制作用域 ID 挂在选择器链的哪一节。**推荐写法**是把 `:scope` **附着在父选择器上**（或嵌套里写 `&:scope`），而不是单独写「裸 `:scope`」。

| 写法 | 编译结果（概念） | 推荐 |
|------|------------------|------|
| **`.container:scope .button`** | `.container.v-abc123 .button` | ✅ 推荐（扁平） |
| **`.container { &:scope .button {} }`** | `.container.v-abc123 .button` | ✅ 推荐（嵌套） |
| **`.container:scope { .button {} }`** | `.container.v-abc123 { .button {} }` | ✅ 推荐（块级嵌套） |
| `.container :scope .button` | `.container .v-abc123 .button` | ⚠️ 不推荐：多一层独立节点，常与真实 DOM 不符 |
| `:scope .header`、`.parent { :scope { .child {} } }` | `.v-abc123 .header` 等 | ⚠️ 不推荐：同上 |

**为何不推荐裸 `:scope`？** Babel 会把 scope class 注入到**已有 class 的 JSX 节点**上（常与 `className` / `wrapClassName` 在同一元素）。附着式 `.custom-modal:scope .ant-modal-content` 表示「带 scope 的 `.custom-modal` 下的子节点」；而 `.custom-modal :scope .ant-modal-content` 或 `.custom-modal { :scope { ... } }` 会要求中间多一个**仅含 scope class 的子元素**，一般对不上实际结构，样式容易不生效。

```scss
/* ✅ 推荐 */
.container:scope .button { color: blue; }

.container {
  &:scope .button { color: blue; }
}

.custom-modal:scope {
  .ant-modal-content { padding: 24px; }
}

/* ⚠️ 不推荐（多一层 .v-xxx 节点，通常匹配不到） */
.container :scope .button { color: blue; }
:scope .header { font-size: 18px; }
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

/* :global - 防止作用域化 */
:global .reset { margin: 0; }
/* 输出: .reset { margin: 0; } (不添加作用域) */

/* 错误 - 仅祖先挂 scope，子选择器节未绑定本文件 scope，常匹配不到 */
.custom-modal .ant-modal-content { padding: 24px; }
/* 输出: .custom-modal.v-abc123 .ant-modal-content { padding: 24px; } */

/* 正确 - 将 :scope 附着在透传 class / 容器上 */
.custom-modal:scope {
  .ant-modal-content { padding: 24px; }
}
/* 输出: .custom-modal.v-abc123 .ant-modal-content { padding: 24px; } */

/* 或嵌套写法（等价） */
.custom-modal {
  &:scope .ant-modal-content { padding: 24px; }
}

/* 附着式扁平写法 */
.container:scope .button { color: blue; }
/* 输出: .container.v-abc123 .button { color: blue; } */
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
