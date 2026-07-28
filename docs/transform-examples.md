# Transform examples

### Using classnames

**Input JSX:**
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
      Click me
    </button>
  );
}
```

**Output JSX with scope ID:**
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
      Click me
    </button>
  );
}
```

### Using clsx

**Input JSX:**
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
      Card content
    </div>
  );
}
```

**Output JSX with scope ID:**
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
      Card content
    </div>
  );
}
```

### Before Transformation

```javascript
import './styles.scss?scoped';

function Component() {
  return <div className="header">Hello</div>;
}
```

### Multiple Components Importing Same File

**Component A (src/components/Button/Button.jsx):**
```javascript
import './shared/styles.scss?scoped';

function Button() {
  return <button className="btn">Click me</button>;
}
```

**Component B (src/components/Modal/Modal.jsx):**
```javascript
import './shared/styles.scss?scoped';

function Modal() {
  return <div className="modal">Modal content</div>;
}
```

**Result:** Each component gets a different scope ID:
- Button component: `v-abc123` (based on `src/components/Button/Button.jsx`)
- Modal component: `v-def456` (based on `src/components/Modal/Modal.jsx`)

The same `shared/styles.scss` file generates different scoped versions for each component.

### After Transformation

```javascript
import './styles.scss?scope-style&scoped=true&id=v-abc123';

function Component() {
  return <div className="v-abc123 header">Hello</div>;
}
```

### CSS Transformation

```css
/* Input */
.header {
  color: blue;
}

/* Output */
.header.v-abc123 {
  color: blue;
}
```
