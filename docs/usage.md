# Usage

### Import Styles with Scoping

```javascript
import './Button.scss?scoped';       // Component-specific styles
import './global.scss?global';       // Shared styles across components
```

**Important Note:** The `?scoped` and `?global` are query parameters, not part of the actual filename. The loader uses these parameters to determine how to process the styles.

**Import Strategy Explanation:**
- **`?scoped`**: Creates component-specific scoping for isolated styles
- **`?global`**: Creates project-level scoping for shared styles across components

### What Happens During Build

When you import a style file with `?scoped` or `?global`, the plugin:

1. **Generates a unique scope ID** based on the file path and project name
2. **Injects the scope ID** into all JSX elements' className attributes
3. **Transforms the CSS** to include the scope ID in selectors
4. **Prevents style conflicts** between different components

**Key Differences:**
- **`?scoped`**: Creates component-specific scoping with `.v-xxx` class selectors
- **`?global`**: Creates global scoping with `[class*=v-]` attribute selectors for shared styles

### Example: Before and After

**Before (Source Code):**
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

**After (Built Code):**
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

### React Component Example

```javascript
import React from 'react';
import classnames from 'classnames';
import './Button.scss?scoped';        // Component styles
import './global.scss?global';        // Shared styles

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

**File Structure:**
```
Button/
├── Button.jsx
├── Button.scss
└── Button.test.js
```

### CSS with Scope Selectors

Understanding how scope IDs are generated and positioned in CSS is crucial for effective styling.

#### 1. Default Behavior
By default, scope IDs are automatically added to the **last selector** of each CSS rule:

```scss
/* Input SCSS */
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

/* SCSS nesting and variables */
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

/* Output CSS */
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

#### 2. Using :scope to Customize Position

Use `:scope` to choose which part of a selector chain gets the scope ID. **Prefer attaching** `:scope` to a parent selector (or `&:scope` in nesting), not a bare `:scope` wrapper.

| Form | Compiled (concept) | Recommended |
|------|-------------------|-------------|
| **`.container:scope .button`** | `.container.v-abc123 .button` | ✅ Yes (flat) |
| **`.container { &:scope .button {} }`** | `.container.v-abc123 .button` | ✅ Yes (nested) |
| **`.container:scope { .button {} }`** | `.container.v-abc123 { .button {} }` | ✅ Yes (block) |
| `.container :scope .button` | `.container .v-abc123 .button` | ⚠️ Avoid — extra level, often no match |
| `:scope .header`, `.parent { :scope { .child {} } }` | `.v-abc123 .header`, etc. | ⚠️ Avoid — same issue |

**Why avoid bare `:scope`?** Babel injects the scope class onto **existing** JSX nodes (same element as `className` / `wrapClassName`). Attached `.custom-modal:scope .ant-modal-content` means “scoped `.custom-modal` → child”. Forms like `.custom-modal :scope …` or `.custom-modal { :scope { … } }` imply an **extra** child that is only `.v-xxx`, which usually does not exist in the DOM, so rules often fail.

```scss
/* ✅ Recommended */
.container:scope .button { color: blue; }

.container {
  &:scope .button { color: blue; }
}

.custom-modal:scope {
  .ant-modal-content { padding: 24px; }
}

/* ⚠️ Not recommended */
.container :scope .button { color: blue; }
:scope .header { font-size: 18px; }
```

#### 3. Using :global (nesting boundary, not CSS Modules syntax)

This library does **not** support CSS Modules-style `:global(.class)`. Only these forms are supported:

| Form | Meaning |
|------|---------|
| `:global .reset` at rule start | Entire rule is unscoped; `:global` is stripped |
| `.container :global .ant-btn` (middle, from SCSS/Less nesting) | Scope is added to the part **before** `:global`; the part after stays unscoped; `:global` is removed |
| `:scope` | Explicit scope position (takes priority over middle `:global`) |

```scss
/* Leading :global — no scope on this rule */
:global .reset { margin: 0; padding: 0; }
/* Output: .reset { margin: 0; padding: 0; } */

/* Middle :global after nesting (e.g. styling third-party children) */
.container {
  :global .ant-btn { color: red; }
}
/* Output: .container.v-abc123 .ant-btn { color: red; } */
```

#### 4. Native CSS nesting (PostCSS 8+)

When styles enter the plugin as a **nested Rule tree** (native `.css` nesting):

- **Flat-chain principle**: After nesting expands, effective selectors follow the same rules as hand-written flat CSS — scope on the **last segment** by default (e.g. `.card .title.v-abc123`).
- **Leaf-only gate**: Parent blocks (e.g. `.card` in `.card { .title {} }`) are **not** scoped again, avoiding `.card.v-xxx .title.v-xxx`.
- **Declarations + child rules**: Block-level declarations are auto-wrapped in `&:scope { }` (often compiled to `&.v-abc123 { }`, equivalent to `.card.v-abc123`).
- **`:global` segments**: Plain selectors inside `:global` are not scoped; redundant nested `:global` wrappers are removed; inner `:scope` still scopes normally.
- **Pseudo-classes**: `&:hover` may output `&.v-abc123:hover`; the effective chain is `.card.v-abc123:hover`.
- **Flat SCSS/Less** (already expanded to a single selector string) behaves as before.

```css
/* Input */
.card { .title { color: red; } }

/* Output (concept) */
.card { .title.v-abc123 { color: red; } }
/* expands to: .card .title.v-abc123 */
```

**Cross-file child components**: scope must appear on the **last segment** of the chain (`.title.v-abc123`), not only on an ancestor `.card`.

#### 5. Practical Application Examples
```scss
/* Default behavior - scope ID added to last selector */
.button { color: red; }
/* Output: .button.v-abc123 { color: red; } */

/* :global - prevent scoping */
:global .reset { margin: 0; }
/* Output: .reset { margin: 0; } (no scope added) */

/* Wrong - scope on last segment only; third-party inner nodes often don't match */
.custom-modal .ant-modal-content { padding: 24px; }
/* Output: .custom-modal.v-abc123 .ant-modal-content { padding: 24px; } */

/* Correct - attach :scope on the container / passed-in class */
.custom-modal:scope {
  .ant-modal-content { padding: 24px; }
}
/* Output: .custom-modal.v-abc123 .ant-modal-content { padding: 24px; } */

/* Or nested (equivalent) */
.custom-modal {
  &:scope .ant-modal-content { padding: 24px; }
}

.container:scope .button { color: blue; }
/* Output: .container.v-abc123 .button { color: blue; } */
```

**Key Transformation Notes:**

1. **`:scope` selector**: Transforms to `.v-abc123` class selector (`?scoped`) or `[class*=v-]` attribute selector (`?global`)
2. **Leading `:global`**: Entire rule unscoped; **middle `:global`** (from nesting): scope on the selector before `:global`, suffix unchanged
3. **Regular / flat selectors**: Scope ID on the last segment (before pseudo-classes, e.g. `.card.v-abc123:hover`)
4. **Native nested Rule trees**: Only **Rule tree leaves** (or explicit `:scope` / `:global`) are scoped; after flattening, same as flat rules
5. **SCSS variables**: Replaced with actual values in CSS output

### Understanding ?scoped vs ?global

**`?scoped` (Component-specific scope):**
```css
/* Input CSS */
.button { color: red; }

/* Output CSS (using .v-xxx class selector) */
.button.v-abc123 { color: red; }
```

**`?global` (Global scope):**
```css
/* Input CSS */
.button { color: blue; }

/* Output CSS (using [class*=v-] attribute selector) */
.button[class*=v-] { color: blue; }
```

**Why do both create scoped styles?**
- `?scoped`: Isolates styles to specific components
- `?global`: Creates shared styles that work across components but still maintain project-level isolation
