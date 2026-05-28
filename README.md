# babel-preset-react-scope-style

A comprehensive solution for scoping styles in React components, with Babel and PostCSS plugins plus build integrations for Webpack, Rspack (loader), and Vite.

[![NPM version](https://img.shields.io/npm/v/babel-preset-react-scope-style.svg?style=flat)](https://npmjs.com/package/babel-preset-react-scope-style)
[![NPM downloads](https://img.shields.io/npm/dm/babel-preset-react-scope-style.svg?style=flat)](https://npmjs.com/package/babel-preset-react-scope-style)

## [中文说明](README_CN.md)

## Features

- **Babel Plugin**: Automatically injects scope IDs into JSX elements and transforms className expressions
- **PostCSS Plugin**: Processes CSS files with scope isolation and supports global/local scoping
- **Webpack Loader**: Integrates with webpack build process for seamless style scoping
- **Vite Plugin**: First-class Vite integration for JSX and scoped CSS
- **Rspack Support**: Webpack-compatible loader and config helper
- **Flexible Configuration**: Customizable scope prefixes, attributes, and scoping strategies
- **React Component Support**: Optimized for React components with automatic className handling
- **CSS-in-JS Support**: Works with classnames, clsx, and other utility libraries
- **:scope / :global selectors**: Control where scope IDs attach and which fragments stay global
- **Stylelint plugin**: Optional lint for redundant multiple `:global` / `:scope` markers (warning by default)
- **Native CSS nesting**: Supports nested Rule trees from PostCSS 8+; flattened chains match flat CSS scoping rules
- **Global Style Support**: Allows global styles while maintaining component isolation

## Installation

```bash
npm install babel-preset-react-scope-style
# peers: @babel/core (required)
# optional: classnames or clsx (dynamic className), webpack (loader only)
# or
yarn add babel-preset-react-scope-style
```

## Quick Start

### 1. Babel Configuration

Add the preset to your `.babelrc` or `babel.config.js`:

```javascript
{
  "presets": [
    "babel-preset-react-scope-style"
  ]
}
```

### 2. Webpack Configuration

Add the loader to your webpack configuration (place `babel-preset-react-scope-style/loader` after `css-loader` and before other preprocessors such as `sass-loader`):

> **Note:** For **Vite**, **Rspack**, or **standalone PostCSS**, see [Vite / Rspack / PostCSS](#vite--rspack--postcss-without-webpack) below.

```javascript
module.exports = {
  module: {
    rules: [
      // CSS files
      {
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader',
          'babel-preset-react-scope-style/loader'
        ]
      },
      // SCSS files
      {
        test: /\.s[ac]ss$/,
        use: [
          'style-loader',
          'css-loader',
          'babel-preset-react-scope-style/loader',
          'sass-loader'
        ]
      },
      // LESS files
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

## Vite / Rspack / PostCSS (without Webpack)

The same import syntax (`?scoped`, `?global`) and Babel options apply across toolchains. Only the **CSS pipeline** differs.

| Tool | Babel / JSX | CSS scoping |
|------|-------------|-------------|
| **Webpack** | preset in `babel.config.js` | `babel-preset-react-scope-style/loader` after `css-loader` |
| **Vite** | `babel-preset-react-scope-style/vite` plugin | handled by the Vite plugin (PostCSS internally) |
| **Rspack** | preset in `babel.config.js` | same loader as Webpack (Rspack-compatible) |
| **Custom** | preset or `@babel/core` API | `babel-preset-react-scope-style/postcss` with explicit options |

### Package entry points

| Import path | Purpose |
|-------------|---------|
| `babel-preset-react-scope-style` | Babel preset (JSX + import rewriting) |
| `babel-preset-react-scope-style/loader` | Webpack / Rspack loader |
| `babel-preset-react-scope-style/postcss` | PostCSS 8 plugin |
| `babel-preset-react-scope-style/vite` | Vite plugin |
| `babel-preset-react-scope-style/rspack` | Rspack config helper |

### Vite

Install peers: `@babel/core`, and `classnames` or `clsx` if you use dynamic `className` expressions.

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import reactScopeStyle from 'babel-preset-react-scope-style/vite';

export default defineConfig({
  plugins: [
    // Run before @vitejs/plugin-react so JSX/TSX is scoped first
    reactScopeStyle({
      scopePrefix: 'v-',
      classNameLibrary: 'auto', // prefer classnames, then clsx if imported; default inject classnames
    }),
    react(),
  ],
});
```

**How it works**

1. The Vite plugin runs Babel with this preset on `.js` / `.jsx` / `.ts` / `.tsx` (same as Webpack).
2. Style imports like `import './Button.scss?scoped'` are rewritten to include `scope-style&scoped=true&id=v-xxx`.
3. When Vite processes CSS/SCSS/Less/Sass modules whose URL contains that query, the plugin runs the PostCSS scope transform.

**Usage in components** (unchanged):

```javascript
import './Button.scss?scoped';
import './theme.scss?global';
```

SCSS/Less still use Vite’s normal preprocessor settings (`css.preprocessorOptions`); no extra PostCSS config is required for scoping.

### Rspack

Rspack supports Webpack-style loaders. Use the **same loader order** as Webpack: `style-loader` → `css-loader` → **`babel-preset-react-scope-style/loader`** → `sass-loader` (if any).

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

Optional helper (appends a loader rule; merge with your existing `module.rules` as needed):

```javascript
const { withReactScopeStyle } = require('babel-preset-react-scope-style/rspack');

module.exports = withReactScopeStyle({
  // your rspack config — still add Babel preset in babel.config.js
});
```

`webpack` is an optional peer dependency; install it only when using the loader (Webpack or Rspack).

### Pure PostCSS (standalone)

Use this when you process CSS yourself (custom scripts, Gulp, other bundlers) **without** the Webpack loader or Vite plugin.

```javascript
// postcss.config.js
module.exports = {
  plugins: [
    require('babel-preset-react-scope-style/postcss')({
      scoped: true,
      global: false,
      id: 'v-your-scope-id', // must match the scope class injected into JSX
    }),
  ],
};
```

**Important**

- With **Webpack / Vite**, the Babel preset rewrites imports and injects scope IDs; the loader/plugin passes `scoped`, `global`, and `id` to PostCSS **automatically** — you do **not** add this plugin to `postcss.config.js`.
- With **standalone PostCSS**, you must set `scoped`, `global`, and `id` yourself and keep `id` in sync with the Babel-generated scope class on your components.

Plugin options (reference):

```javascript
{
  scoped: true,       // enable scoping
  global: false,      // true → [class*=id] attribute selectors
  id: 'v-abc123',     // scope id (same as injected JSX class)
  globalSelector: '', // replacement for :global
}
```

More examples: [docs/integrations.md](docs/integrations.md).

## Usage

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

## Configuration

### Babel Plugin Options

```javascript
{
  "presets": [
    ["babel-preset-react-scope-style", {
      scope: true,                    // Enable/disable scoping
      scopePrefix: 'v-',             // Scope ID prefix (default: 'v-', configurable)
      scopeNamespace: 'my-app',      // Namespace for scope IDs
      scopeAttrs: true,              // Inject scope into attributes (default: true)
      scopeAll: false,               // Scope all JSX elements in the project (see detailed explanation below)
      scopeVersion: false,           // Include version in scope ID
      classAttrs: ['className'],     // Attributes to scope (see detailed explanation below)
      scopeRegx: /(\.(?:le|sc|sa|c)ss)(\?[a-z]+)?$/, // Style file regex
      scopeFn: null,                 // Custom scope function
      pkg: null                      // Package info object (from package.json)
    }]
  ]
}
```

#### Understanding scopeAll

The `scopeAll` option controls whether scope IDs are generated for ALL JSX elements in the project, regardless of whether the file imports any style files with `?scoped` suffix.

##### Default Behavior: `false`
```javascript
scopeAll: false  // Default: only JSX in files with scoped style imports get scope IDs
```

**What happens when `scopeAll: false` (default):**
- **Selective scoping**: Only JSX elements in files that import styles with `?scoped` get scope IDs
- **File-based**: Scope ID generation depends on style file imports
- **Performance**: Better performance as not all JSX files are processed

**What happens when `scopeAll: true`:**
- **Universal scoping**: ALL JSX elements in the project get scope IDs
- **File-independent**: Scope IDs are generated regardless of style file imports
- **Consistent**: Every JSX element has a scope ID for consistent styling

##### Example Scenarios

**With `scopeAll: false` (default):**
```jsx
// File: ComponentA.jsx (imports styles with ?scoped)
import './styles.scss?scoped';

function ComponentA() {
  return <div className="header">Component A</div>;  // ✅ Gets scope ID
}

// File: ComponentB.jsx (no style imports)
function ComponentB() {
  return <div className="content">Component B</div>; // ❌ No scope ID
}
```

**With `scopeAll: true`:**
```jsx
// File: ComponentA.jsx (imports styles with ?scoped)
import './styles.scss?scoped';

function ComponentA() {
  return <div className="header">Component A</div>;  // ✅ Gets scope ID
}

// File: ComponentB.jsx (no style imports)
function ComponentB() {
  return <div className="content">Component B</div>; // ✅ Gets scope ID anyway!
}
```

##### Use Cases

**When to use `scopeAll: false` (default):**
- **Performance-focused**: Only scope JSX that actually needs styling
- **Selective styling**: Different components have different styling needs
- **Build optimization**: Reduce unnecessary scope ID generation

**When to use `scopeAll: true`:**
- **Consistent architecture**: All components should have scope IDs
- **Future-proofing**: Prepare for potential styling needs
- **Debugging**: Easier to identify components in browser dev tools
- **Team consistency**: Ensure all developers follow the same pattern

#### Understanding classAttrs

The `classAttrs` option controls which JSX attributes will receive automatic scope ID injection. This is crucial for understanding how the plugin works with different attribute types.

##### Default Behavior: `['className']`
```javascript
classAttrs: ['className']  // Default: only className gets scoped
```

**What happens with `className`:**
- **Automatic injection**: Scope ID is automatically added to `className` values
- **Dynamic handling**: Works with static strings, template literals, and expressions
- **Smart merging**: Intelligently combines existing classes with scope ID

**Example transformations:**
```jsx
// Input JSX
<div className="button primary">Click me</div>
<div className={`button ${isActive ? 'active' : ''}`}>Toggle</div>

// Output JSX (with scope ID 'v-abc123')
<div className="button primary v-abc123">Click me</div>
<div className={`button ${isActive ? 'active' : ''} v-abc123`}>Toggle</div>
```

##### Other Attributes vs className

**`className` (Special behavior):**
- ✅ **Universal injection**: Scope ID is injected into ALL JSX elements
- ✅ **Auto-generation**: Elements without `className` get a new `className` with scope ID
- ✅ **Smart merging**: Existing `className` values are intelligently merged with scope ID
- ✅ **Expression support**: Works with static strings, template literals, and expressions

**Other attributes (Conditional injection):**
- ✅ **Conditional injection**: Scope ID is only injected if the attribute exists on the JSX element
- ❌ **No auto-generation**: Elements without the attribute won't get it
- ✅ **Smart merging**: Existing attribute values are intelligently merged with scope ID
- ✅ **Expression support**: Works with static strings, template literals, and expressions

##### Custom classAttrs Configuration

**Add multiple attributes:**
```javascript
{
  classAttrs: ['className', 'class', 'data-class']
}
```

**Why you might want this:**
- **Third-party UI libraries**: Components like Ant Design use custom class name attributes
- **Legacy code**: Some libraries use `class` instead of `className`
- **Custom attributes**: Your components use custom class attributes
- **Framework compatibility**: Supporting different React-like frameworks

**Example with custom attributes:**
```jsx
// Input JSX
<div class="button" data-class="primary">Click me</div>
<div>No attributes</div>

// Output JSX (with scope ID 'v-abc123')
<div class="v-abc123" data-class="v-abc123">Click me</div>
<div>No attributes</div>  // No scope ID injected - attribute doesn't exist
```

**Real-world example with Ant Design components:**
```jsx
// Configuration: classAttrs: ['className', 'overlayClassName', 'wrapClassName', 'dropdownClassName']

// Input JSX
<Popover 
  overlayClassName="custom-popover"
  content="Popover content"
>
  <Button>Click me</Button>
</Popover>

<Modal 
  wrapClassName="custom-modal"
  title="Modal Title"
>
  Modal content
</Modal>

<Dropdown 
  dropdownClassName="custom-dropdown"
  menu={{ items: menuItems }}
>
  <Button>Dropdown</Button>
</Dropdown>

// Output JSX (with scope ID 'v-abc123')
<Popover 
  overlayClassName="custom-popover v-abc123"
  content="Popover content"
>
  <Button>Click me</Button>
</Popover>

<Modal 
  wrapClassName="custom-modal v-abc123"
  title="Modal Title"
>
  Modal content
</Modal>

<Dropdown 
  dropdownClassName="custom-dropdown v-abc123"
  menu={{ items: menuItems }}
>
  <Button>Dropdown</Button>
</Dropdown>
```

**Why this matters for scoped styles:**
```scss
/* Your scoped SCSS file */
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

**Generated CSS with scope ID:**
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

**Key difference demonstration:**
```jsx
// Configuration: classAttrs: ['className', 'class', 'data-class']

// Input JSX
<div className="button">Has className</div>
<div class="button">Has class</div>
<div data-class="button">Has data-class</div>
<div>No attributes</div>

// Output JSX (with scope ID 'v-abc123')
<div className="button v-abc123">Has className</div>        // className: universal injection
<div class="v-abc123">Has class</div>                       // class: conditional injection
<div data-class="v-abc123">Has data-class</div>            // data-class: conditional injection
<div className="v-abc123">No attributes</div>               // className: auto-generated!
```

**⚠️ Important:** 
- `className` gets universal injection (all elements get it)
- Other attributes get conditional injection (only if they exist)

### Common Configuration Examples

**Basic Setup (Recommended for most projects):**
```javascript
{
  "presets": ["babel-preset-react-scope-style"]
}
```

**Disable Automatic Scope Injection:**
```javascript
{
  "presets": [
    ["babel-preset-react-scope-style", {
      scopeAttrs: false  // Disable automatic scope injection
    }]
  ]
}
```

**Custom Namespace (For large applications):**
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

**Custom Prefix (For branding or consistency):**
```javascript
{
  "presets": [
    ["babel-preset-react-scope-style", {
      scopePrefix: 'company-',         // Custom prefix instead of default 'v-'
      scopeNamespace: 'my-company'     // Optional: custom namespace
    }]
  ]
}
```

**Version-aware Scoping (For libraries):**
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

**Third-party UI Library Support:**
```javascript
{
  "presets": [
    ["babel-preset-react-scope-style", {
      classAttrs: [
        'className',           // Standard React className
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

**Universal Scoping (scopeAll: true):**
```javascript
{
  "presets": [
    ["babel-preset-react-scope-style", {
      scopeAll: true,         // Generate scope IDs for ALL JSX elements
      scopeNamespace: 'my-app' // Optional: custom namespace for consistency
    }]
  ]
}
```

### PostCSS Plugin

| Build setup | Do you configure `postcss.config.js`? |
|-------------|----------------------------------------|
| Webpack + loader | **No** — loader passes `scoped` / `global` / `id` from import queries |
| Vite plugin | **No** — Vite plugin runs PostCSS internally |
| Standalone / custom pipeline | **Yes** — use `babel-preset-react-scope-style/postcss` and set options explicitly |

PostCSS parameters (`scoped`, `global`, `id`, etc.) are normally derived from your `?scoped` / `?global` imports after Babel rewriting. See [Pure PostCSS](#pure-postcss-standalone) when you are not using the loader or Vite plugin.

```javascript
// This is for reference only - DO NOT configure manually
{
  scoped: true,                  // Enable scoped styles
  global: false,                 // Enable global styles
  id: 'v-component-id',          // Scope ID (auto-generated)
  globalSelector: ''             // Global selector prefix
}
```

The PostCSS plugin automatically receives these parameters from the loader based on your import statements (`?scoped`, `?global`).

## Advanced Features

### Custom Scope Function

```javascript
{
  scopeFn: (filePath, query, context) => {
    // Custom logic for file transformation
    return filePath + query;
  }
}
```

**Real-world Application Example - Converting SCSS to CSS:**
```javascript
{
  scopeFn: (filePath, query, context) => {
    // Convert .scss files to .css during build process
    if (filePath.endsWith('.scss')) {
      return filePath.replace('.scss', '.css') + query;
    }
    return filePath + query;
  }
}
```

### Multiple Scope Configuration (Internal Use Only)

**⚠️ Important:** This is for reference only. The loader automatically handles multiple scopes based on your import statements.

```javascript
// This is how the loader internally handles multiple scopes
// DO NOT manually configure in PostCSS config
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

**Internal Processing:**
1. **Input CSS file** is processed multiple times
2. **First scope** creates the base scoped version
3. **Additional scopes** generate additional copies with different IDs
4. **Final output** contains all scoped versions in one file

**Usage Example:**
- **Global scope** (`v-ewp-`): For shared component libraries
- **Component scope** (`v-component-123`): For individual component styles
- **Result**: One CSS file containing styles that work in both global and component contexts

**How It Works:**
- The loader automatically detects different import patterns (`?scoped`, `?global`)
- Internally creates appropriate scope configurations
- Users only need to use `?scoped` or `?global` in their import statements

**Example Output:**
```css
/* Original CSS */
.button { color: red; }

/* Generated with multiple scopes */
.button.v-ewp- { color: red; }        /* First scope */
.button.v-component-123 { color: red; } /* Second scope */
.button.v-component-456 { color: red; } /* Third scope */
```

## How It Works

1. **Babel Plugin**: 
   - Detects style imports with query parameters (`?scoped`, `?global`)
   - Injects scope IDs into JSX elements' className attributes
   - Transforms className expressions for proper scoping

2. **PostCSS Plugin**:
   - Processes CSS selectors with scope isolation
   - Handles `:scope`, `:global`, and native CSS nesting
   - Generates unique scope IDs for components
   - Applies different scoping strategies based on import types

3. **Webpack Loader**:
   - Integrates with webpack build process
   - Applies PostCSS transformations
   - Maintains source map support

### Scope ID Generation

The plugin generates scope IDs using a hash of the importing file's path and project name:

```javascript
// For ?scoped imports
scopeId = scopePrefix + hash(importingFilePath + projectName)
// Default: scopePrefix = 'v-', generates like: v-abc123

// For ?global imports  
scopeId = scopePrefix + hash(importingFilePath + projectName)
// Default: scopePrefix = 'v-', generates like: v-abc123
```

**Important Note:** Scope IDs are generated based on the importing file's path, not the imported file's path. This means:
- Component A importing `./shared/styles.scss?scoped` gets a scope ID based on Component A's path
- Component B importing `./shared/styles.scss?scoped` gets a scope ID based on Component B's path
- Result: The same shared file generates different scoped versions for each component

### CSS Transformation Strategy

**Component Scope (`?scoped`):**
- Adds `.{scopePrefix}xxx` class selectors to CSS rules (default: `.v-xxx`)
- Creates tight component isolation
- Example: `.button` → `.button.v-abc123` (default prefix)

**Global Scope (`?global`):**
- Adds `[class*={scopePrefix}]` attribute selectors to CSS rules (default: `[class*=v-]`)
- Allows styles to be shared across components
- Example: `.button` → `.button[class*=v-]` (default prefix)
- Maintains project-level isolation while enabling component sharing

## Examples

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

## FAQ

### Q: Why use scoped styles?
**A:** Scoped styles prevent CSS conflicts between components, making your React application more maintainable and reducing the chance of unexpected style overrides.

### Q: How does the scope ID generation work?
**A:** The plugin generates a unique hash based on the file path and project name from package.json, ensuring consistent IDs across builds.

### Q: Can I use this with CSS-in-JS libraries?
**A:** Yes! The plugin works seamlessly with classnames, clsx, and other utility libraries for dynamic class names. It automatically injects the scope ID into the final className value, ensuring that all dynamic classes are properly scoped.

**Example:**
```jsx
// Input
className={classNames('btn', variant && `btn-${variant}`)}

// Output  
className={classNames('btn', variant && `btn-${variant}`) + ' v-abc123'}
```

### Q: What's the difference between ?scoped and ?global?
**A:** 
- `?scoped`: Creates component-specific scoping with `.v-xxx` class selectors
- `?global`: Creates global scoping with `[class*=v-]` attribute selectors for shared styles across components

Both create scoped styles, but `?global` allows styles to be shared between components while maintaining project-level isolation.

**Actual Effect Example:**
- `?scoped`: `.button` → `.button.v-abc123`
- `?global`: `.button` → `.button[class*=v-]`

### Q: Does `?scoped` in a stylesheet `@import` work the same as in JS? Why is `?global` not supported there?
**A:** **No.** Inside **CSS/SCSS/Less** files, only the **`?scoped` suffix** in `@import url(...)` is recognized and rewritten (e.g. `@import url("./partial.scss?scoped");`). There, `?scoped` means **reuse the scope of the stylesheet currently being processed**, not “create a new JS hash scope id” for that child file.

| How the parent stylesheet is scoped (from the JS `import` `?scoped` / `?global`) | Child `@import` with `?scoped` behaves like |
| --- | --- |
| Component scope (JS `?scoped`, `.v-xxx` class) | Same **component** scope |
| Shared global scope (JS `?global`, `[class*=v-]`) | Same **global** scope |

The child URL is rewritten to include `scope-style&scoped=true&id=...` (and `&global=true` when the parent is global), consistent with JS import rewriting.

**Why not `?global` on `@import` URLs?**

1. **Scope mode is defined by who imports the CSS in JS** — component vs shared project scope is already chosen via `import './x.scss?scoped'` or `import './x.scss?global'`. PostCSS receives `scoped`, `global`, and `id` for the parent file; nested imports only need a marker meaning “follow the parent”.
2. **Stylesheets cannot mint their own JS scope ids** — the hash comes from the importing component’s path. Nested sheets can only **inherit** the parent’s id and mode, not pick global vs scoped independently like JS imports.
3. **Clearer semantics** — allowing `?global` on `@import` would collide with JS `?global` and with the `:global` selector pseudo-class. URLs without `?scoped` (including `?global` or plain paths) are left unchanged and do not get `scope-style` injected.

To opt a **rule** out of scoping, use a **leading** `:global` in that file’s selectors (see `:global` above), not `?global` on the `@import` URL.

### Q: How do I handle third-party component styles?
**A:** There are two main approaches for styling third-party components:

1. **Modify outer element styles**: Provide a `className` prop to the component, then use that className to modify the outer element styles.

2. **Modify internal element styles**: Use **attached** `:scope` on the passed `className` / `wrapClassName` (e.g. `.custom-modal:scope .ant-modal-content`), then target internal class names.

**Example:**
```jsx
// Component with custom className
<AntdButton className="custom-button">Click me</AntdButton>
```

```scss
// Outer element styling
.custom-button {
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

// Internal elements: attach :scope on the parent (avoid bare :scope blocks)
.custom-button:scope {
  .ant-btn-inner {
    font-weight: 600;
  }

  .ant-btn-icon {
    margin-right: 8px;
  }
}
```

### Q: What happens when multiple component files import the same style file with ?scoped?
**A:** The plugin generates different scope IDs based on the importing file's path, not the imported file. In webpack builds, different query parameters are treated as different files, so the same style file will generate multiple copies with different scope IDs. This means each component gets its own scoped version of the shared styles.

### Q: What's the difference between :scope and :global in CSS?
**A:** 
- **`:scope`**: Controls where the scope ID is inserted (replaces `:scope` with `.v-xxx` or `[class*=v-]`)
- **`:global`**: Not CSS Modules `:global(...)`. Use **leading** `:global` to skip scoping for a whole rule, or **middle** `:global` (after SCSS/Less nesting) so only the selector **before** `:global` gets the scope class; the suffix stays global

### Q: How does scopeAttrs work?
**A:** 
- **Default**: `true` - Automatically injects scope IDs into JSX elements' className attributes
- **When disabled**: Set to `false` to disable automatic scope injection (useful when you want manual control)

### Q: Should I include ?scoped or ?global in my actual file names?
**A:** No! The `?scoped` and `?global` are query parameters for the loader, not part of the filename. Use standard file names like `Button.scss` and add the parameters in your import statements: `import './Button.scss?scoped'`.

**Important Note:** By default, only JSX elements in files that import styles with the `?scoped` suffix will generate scope IDs. Even if JSX elements in a file don't need styling, if you want to generate scope IDs for them (or make global scope styles referenced via `?global` take effect), you can add an empty style file and reference it with the `?scoped` suffix.

### Q: Can I use this plugin without webpack?
**A:** Yes. Use the **[Vite plugin](#vite)** (`babel-preset-react-scope-style/vite`), **[Rspack loader](#rspack)** (same as Webpack), or **[standalone PostCSS](#pure-postcss-standalone)**. You can also use [build-react-esm-project](https://github.com/gxlmyacc/build-react-esm-project) for Gulp-based React ESM builds.

### Q: How does the plugin handle multiple scope configurations?
**A:** When multiple scope configurations are provided, the PostCSS plugin processes the input CSS file multiple times, generating a single output file that contains all scoped versions. This allows the same styles to work in different contexts (global, component-specific, etc.) without conflicts.

### Q: Do I need to configure the PostCSS plugin?
**A:** **Webpack / Vite:** No manual PostCSS setup — the loader or Vite plugin applies scoping automatically. **Standalone PostCSS:** Yes — add `babel-preset-react-scope-style/postcss` to `postcss.config.js` and set `scoped`, `global`, and `id` yourself (see [Pure PostCSS](#pure-postcss-standalone)).

### Q: What's the difference between className and other attributes in classAttrs?
**A:** The `className` attribute gets universal injection - it's added to ALL JSX elements (even those without a className), while other attributes (like `class` or `data-class`) only get scope ID injection if they already exist on the JSX element. This is why `className` is the default and recommended choice for comprehensive styling.

### Q: Why do I need to use :scope for nested element selectors?
**A:** By default, scope is added to the **last** segment of a chain. With `.custom-modal .ant-modal-content`, scope often lands on `.ant-modal-content`, while third-party inner nodes usually **lack** your injected scope class, so the rule misses. Use **`.custom-modal:scope .ant-modal-content`** (or `&:scope`) to anchor scope on the container class you pass in. Avoid bare `:scope { }` or `.custom-modal :scope .child` — they insert an extra `.v-xxx` level that usually does not match real DOM.

### Q: What's the difference between scopeAll: false and scopeAll: true?
**A:** `scopeAll: false` (default) only generates scope IDs for JSX elements in files that import styles with `?scoped`, while `scopeAll: true` generates scope IDs for ALL JSX elements in the project, regardless of style file imports. Use `scopeAll: true` when you want consistent architecture or future-proofing for styling needs.

### Q: How are scope IDs positioned in CSS selectors?
**A:** By default, scope IDs are added to the **last segment** of each selector chain (before pseudo-classes, e.g. `.button.v-abc123:hover`). Use `:scope` to control position and `:global` for global fragments. For example, `.button` → `.button.v-abc123`, `.container:scope .button` → `.container.v-abc123 .button`.

**⚠️ Important:** Prefer **attached** `.container:scope` / `&:scope` (→ `.container.v-abc123`). Bare `.container :scope` compiles but inserts a separate `.v-xxx` node; styles often do not apply.

### Q: How does native CSS nesting get scoped?
**A:** Same as flat rules: only **Rule tree leaves** get scope by default, so `.card { .title {} }` becomes `.card .title.v-abc123` after flattening. Declarations alongside child rules are auto-wrapped in `&:scope`. Selectors inside `:global` are not scoped; `:scope` blocks inside `:global` still scope. Every JSX element still gets the same `v-xxx`; the selector must bind scope on the last segment so child components from other files are not affected.

## Best Practices

### 1. File Naming Convention
Keep your component files and style files with matching names:
```
Button/
├── Button.jsx
├── Button.scss
└── Button.test.js
```

**For Shared Styles:**
```
shared/
├── mixins.scss         # Shared SCSS mixins (import with ?scoped)
└── common.scss         # Global shared styles (import with ?global)
```

**File Naming vs Import Parameters:**
- **File names**: Use standard extensions (`.scss`, `.sass`, `.less`)
- **Import parameters**: Add `?scoped` or `?global` to control scoping behavior
- **Example**: `Button.scss` (file) + `import './Button.scss?scoped'` (import)

### 2. Style Organization
- Use `?scoped` for component-specific styles and SCSS utilities
- Use `?global` for shared styles across components (layouts, themes, resets)
- Organize imports by scope: component styles first, then shared styles
- **Shared Files**: Multiple components importing the same file with `?scoped` will get different scope IDs based on their import path

### 3. Third-party UI Library Integration
- **Ant Design**: Configure `classAttrs` to include custom class name attributes
- **Common attributes**: `overlayClassName`, `wrapClassName`, `dropdownClassName`, `popupClassName`
- **Configuration example**: `classAttrs: ['className', 'overlayClassName', 'wrapClassName', 'dropdownClassName']`
- **Benefit**: Custom styles applied to third-party components will be properly scoped

### 4. CSS Selectors
- Prefer native nesting or flat selectors; use `&:scope` when a block needs both declarations and child rules
- Use `:global` sparingly for truly global fragments
- Leverage CSS custom properties for theming

**Understanding :scope (recommended order):**
1. **`.container:scope .child`** — flat; common with passed `className`
2. **`.container { &:scope .child {} }`** or **`.container:scope { .child {} }`** — nested SCSS
3. **Avoid** `.container :scope .child`, `:scope .child`, `.container { :scope { .child {} } }` — extra node, often broken

**Nested child selectors:**
- Scope does not apply to “ancestor-only” rules the way you might expect
- Anchor scope on the element that has your `className` (`:scope` right after that selector)
- Plain `.parent .child` often scopes `.child` only; third-party inner classes may not match

### 5. Performance Considerations
- Scope only the styles you need
- Avoid excessive use of `:global` selectors
- Use meaningful class names for better debugging

## Stylelint

This package ships optional **Stylelint plugins** (`babel-preset-react-scope-style/stylelint`) aligned with PostCSS semantics. Rule messages are in **English**. Test cases live under `test/stylelint-*.test.js`.

### Install

In your app or library repo, install Stylelint as a dev dependency (this preset does not bundle Stylelint):

```bash
npm install -D stylelint
```

### Configure

Create or extend `.stylelintrc.cjs` (or copy [`stylelint.config.cjs`](stylelint.config.cjs) from this repo):

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

### Rules

| Rule | Severity | Purpose |
|------|----------|---------|
| `no-global-paren` | error | `:global(...)` (CSS Modules) is not supported |
| `no-import-global-query` | error | `?global` on `@import` in stylesheets is ignored |
| `no-scope-typo` | error | Typos such as `:scoped` or `?scope` instead of `:scope` / `?scoped` |
| `prefer-ampersand-scope-wrapper` | warning | Deep nesting: prefer `&:global` / `&:scope` over bare `:global` / `:scope` wrappers |
| `no-duplicate-scope-markers` | warning | Multiple `:global` or `:scope` in one selector or nested wrappers |

**Notes:**

- Stylelint only scans stylesheets, not JS `import './x.scss?scope'` (fix those in the bundler import).
- `no-duplicate-scope-markers` does not apply to `:global(...)`; use `no-global-paren` instead.

### Lint in this repository

```bash
npm run lint:style
npm test
```

## Development

### Build

```bash
npm run build
```

### Demo

Check the `babel/demo` and `postcss/demo` directories for working examples.

## Troubleshooting

### Common Issues

**1. Styles not being scoped**
- Check that your import statement includes `?scoped`
- Verify Babel configuration is correct
- Ensure PostCSS plugin is properly configured

**2. Scope IDs changing on every build**
- Check that `scopeVersion` is set to `false`
- Ensure `pkg` option is properly configured
- Verify file paths are consistent

**3. CSS not being processed**
- Check PostCSS configuration
- Verify webpack loader configuration
- Ensure file extensions match `scopeRegx`

**4. Global styles being scoped**
- Use `?global` in import statements
- Use `:global` selectors in CSS
- Check PostCSS plugin configuration

### Debug Mode

Enable debug logging by setting the `DEBUG` environment variable:
```bash
DEBUG=babel-preset-react-scope-style npm run build
```

## License

MIT License - see LICENSE file for details.

## Related Projects

- [build-react-esm-project](https://github.com/gxlmyacc/build-react-esm-project) - React build tool with scope style support for non-webpack environments
- [styled-components](https://github.com/styled-components/styled-components) - CSS-in-JS library
- [CSS Modules](https://github.com/css-modules/css-modules) - CSS modules for component-based styling
- [PostCSS](https://github.com/postcss/postcss) - CSS transformation tool

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.



