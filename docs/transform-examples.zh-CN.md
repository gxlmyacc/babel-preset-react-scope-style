# 转换示例

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
