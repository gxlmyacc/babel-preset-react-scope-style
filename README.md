# babel-preset-react-scope-style

A comprehensive solution for scoping styles in React components, providing Babel plugin, PostCSS plugin, and webpack loader support.

[![NPM version](https://img.shields.io/npm/v/babel-preset-react-scope-style.svg?style=flat)](https://npmjs.com/package/babel-preset-react-scope-style)
[![NPM downloads](https://img.shields.io/npm/dm/babel-preset-react-scope-style.svg?style=flat)](https://npmjs.com/package/babel-preset-react-scope-style)

## [中文说明](README_CN.md)

## Features

- **Babel Plugin**: Automatically injects scope IDs into JSX elements and transforms className expressions
- **PostCSS Plugin**: Processes CSS files with scope isolation and supports global/local scoping
- **Webpack Loader**: Integrates with webpack build process for seamless style scoping
- **Non-Webpack Support**: Compatible with build-react-esm-project for non-webpack environments
- **Flexible Configuration**: Customizable scope prefixes, attributes, and scoping strategies
- **React Component Support**: Optimized for React components with automatic className handling
- **CSS-in-JS Support**: Works with classnames, clsx, and other utility libraries
- **Deep Selector Support**: Handles `>>>` and `:scope` selectors for component styling
- **Global Style Support**: Allows global styles while maintaining component isolation
- **Multi-Build Environment**: Supports both webpack and non-webpack build tools



## Installation

```bash
npm install babel-preset-react-scope-style
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

Add the loader to your webpack configuration (place 'babel-preset-react-scope-style/loader' after 'css-loader' and before other loaders):

> **Note:** If you want to use this plugin in a non-webpack environment, you can refer to the [build-react-esm-project](https://github.com/gxlmyacc/build-react-esm-project) build tool, which provides a comprehensive build solution for React projects with scope style support.


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

## Usage

### Import Styles with Scoping

```javascript
import React from 'react';
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

### SCSS with Scope Selectors

```scss
/* Use :scope for component-level styling */
:scope .button {
  background: blue;
}

/* Use >>> for deep selectors (escapes component boundary) */
.container >>> .deep-element {
  color: red;
}

/* Global styles with :global (won't be scoped) */
:global .global-class {
  font-family: Arial;
}

/* Regular selectors (automatically scoped) */
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
```

### Transformed CSS (Built CSS)

**Transformed CSS (after build):**
```css
/* Output when using ?scoped import */
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

/* Output when using ?global import */
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

**Key transformation notes:**

1. **`:scope` selector**: Transforms to `.v-abc123` class selector (`?scoped`) or `[class*=v-]` attribute selector (`?global`)
2. **`>>>` deep selector**: Parent element gets scope ID, child elements remain unchanged
3. **`:global` selector**: Completely skips scope transformation, keeps original selector
4. **Regular selectors**: Automatically add scope ID at the end
5. **Nested selectors**: Each nested level gets scope ID
6. **SCSS variables**: Replaced with actual values in CSS output

### Understanding ?scoped vs ?global

**`?scoped` (Component-specific scoping):**
```scss
/* Input SCSS */
.button { 
  color: red; 
}

/* Output CSS (with .v-xxx class selector) */
.button.v-abc123 { color: red; }
```

**`?global` (Global scoping):**
```scss
/* Input SCSS */
.button { 
  color: blue; 
}

/* Output CSS (with [class*=v-] attribute selector) */
.button[class*=v-] { color: blue; }
```

**Why both create scoped styles?**
- `?scoped`: Isolates styles to specific components
- `?global`: Creates shared styles that work across components but still maintain project-level isolation

## Configuration Options

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

### Understanding scopeAll

The `scopeAll` option controls whether scope IDs are generated for ALL JSX elements in the project, regardless of whether the file imports any style files with `?scoped` suffix.

#### Default Behavior: `false`
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

#### Example Scenarios

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

#### Use Cases

**When to use `scopeAll: false` (default):**
- **Performance-focused**: Only scope JSX that actually needs styling
- **Selective styling**: Different components have different styling needs
- **Build optimization**: Reduce unnecessary scope ID generation

**When to use `scopeAll: true`:**
- **Consistent architecture**: All components should have scope IDs
- **Future-proofing**: Prepare for potential styling needs
- **Debugging**: Easier to identify components in browser dev tools
- **Team consistency**: Ensure all developers follow the same pattern

### Understanding classAttrs

The `classAttrs` option controls which JSX attributes will receive automatic scope ID injection. This is crucial for understanding how the plugin works with different attribute types.

#### Default Behavior: `['className']`
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

#### Other Attributes vs className

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

#### Custom classAttrs Configuration

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
```

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

### PostCSS Plugin Configuration

**⚠️ Important:** This plugin is for internal loader use only. Users do not need to configure it. PostCSS plugin parameters (`scoped`, `global`, `id`, etc.) are used internally by the loader, and the plugin will automatically receive the correct parameters based on your import statements.

**Users do not need to perform any PostCSS configuration. All configuration is automatically handled by the webpack loader.**

### PostCSS Plugin Options (Internal Use Only)

**⚠️ Important:** These options are used internally by the loader and should NOT be configured by users.

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

### Scope ID Generation Rules

Understanding how scope IDs are generated and positioned in your CSS is crucial for effective styling.

#### 1. Default Behavior
By default, scope IDs are automatically added to the **last selector** in each CSS rule:

```scss
/* Input SCSS */
.button { color: red; }
.container .item { background: blue; }
.form input[type="text"] { border: 1px solid #ccc; }

/* Generated CSS */
.button.v-abc123 { color: red; }
.container .item.v-abc123 { background: blue; }
.form input[type="text"].v-abc123 { border: 1px solid #ccc; }
```

#### 2. Custom Position with :scope
Use `:scope` pseudo-class to control where the scope ID is placed:

**⚠️ Important:** `:scope` can be used in two ways with different meanings:

1. **Attached to selector**: `.container:scope` → `.container.v-abc123` (scope ID attached to the selector)
2. **Standalone selector**: `.container :scope` → `.container .v-abc123` (scope ID as a separate selector)

```scss
/* Input SCSS */
.container:scope .button { color: blue; }  /* ✅ Scope ID attached to .container */
.container :scope .button { color: blue; } /* ✅ Scope ID as separate selector */
:scope .header { font-size: 18px; }       /* ✅ Standalone scope selector */

/* Generated CSS */
.container.v-abc123 .button { color: blue; } /* Scope ID on .container */
.container .v-abc123 .button { color: blue; } /* Scope ID as separate element */
.v-abc123 .header { font-size: 18px; }       /* Scope ID as root */
```

#### 3. Global Styles with :global
Wrap styles in `:global` to prevent scoping:

```scss
/* Input SCSS */
:global .reset { margin: 0; padding: 0; }

/* Generated CSS */
.reset { margin: 0; padding: 0; }  /* No scope ID */
```

#### 4. Deep Selector with >>>
Use `>>>` for deep selectors:

```scss
/* Input SCSS */
.container >>> .deep-element { color: green; }
.wrapper >>> .nested .deep { background: yellow; }

/* Generated CSS */
.container.v-abc123 .deep-element { color: green; }
.wrapper.v-abc123 .nested .deep { background: yellow; }
```

### Custom Scope Function

```javascript
{
  scopeFn: (filePath, query, context) => {
    // Custom logic for file transformation
    return filePath + query;
  }
}
```

**Real-world Example - Converting SCSS to CSS:**
```javascript
{
  scopeFn: (filePath, query, context) => {
    // Convert .scss files to .css during build
    if (filePath.endsWith('.scss')) {
      return filePath.replace('.scss', '.css') + query;
    }
    return filePath + query;
  }
}
```

### Multiple Scope Configurations (Internal Use Only)

**⚠️ Important:** This is for reference only. The loader automatically handles multiple scopes based on your import statements.

```javascript
// This is how the loader internally processes multiple scopes
// DO NOT configure manually in your PostCSS config
[
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
]
```

**What happens internally:**
1. **Input CSS file** is processed multiple times
2. **First scope** creates the base scoped version
3. **Additional scopes** generate extra copies with different IDs
4. **Final output** contains all scoped versions in one file

**Use case example:**
- **Global scope** (`v-ewp-`): For shared component libraries
- **Component scope** (`v-component-123`): For individual component styles
- **Result**: One CSS file with styles that work in both global and component contexts

**How it works:**
- The loader automatically detects different import patterns (`?scoped`, `?global`)
- Creates appropriate scope configurations internally
- Users only need to use `?scoped` or `?global` in their import statements

**Multiple Scope Processing:**
When the PostCSS plugin receives an array of scope configurations, it processes the input CSS file multiple times:
1. **First scope**: Generates the first scoped version
2. **Additional scopes**: Creates additional copies with different scope IDs
3. **Result**: The output CSS file contains multiple scoped versions of the same styles

**Example Output:**
```css
/* Original CSS */
.button { color: red; }

/* Generated with multiple scopes */
.button.v-ewp- { color: red; }        /* First scope */
.button.v-component-123 { color: red; } /* Second scope */
.button.v-component-456 { color: red; } /* Third scope */
```

### Multiple Scope Configurations

```javascript
// PostCSS configuration with multiple scopes
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

### Webpack Loader with Source Maps

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

## How It Works

1. **Babel Plugin**: 
   - Detects style imports with query parameters (`?scoped`, `?global`)
   - Injects scope IDs into JSX elements' className attributes
   - Transforms className expressions for proper scoping

2. **PostCSS Plugin**:
   - Processes CSS selectors with scope isolation
   - Handles `:scope`, `>>>`, and `:global` selectors
   - Generates unique scope IDs for components
   - Applies different scoping strategies based on import type

3. **Webpack Loader**:
   - Integrates with webpack build process
   - Applies PostCSS transformations
   - Maintains source map support

### Scope ID Generation

The plugin generates scope IDs using a hash of the importing file's path and project name:

```javascript
// For ?scoped imports
scopeId = 'v-' + hash(importingFilePath + projectName)

// For ?global imports  
scopeId = 'v-' + hash(importingFilePath + projectName)
```

**Important Note:** Scope IDs are generated based on the importing file's path, not the imported file's path. This means:
- Component A importing `./shared/styles.scss?scoped` gets scope ID based on Component A's path
- Component B importing `./shared/styles.scss?scoped` gets scope ID based on Component B's path
- Result: Same shared file generates different scope IDs for different components

### CSS Transformation Strategies

**Component Scoping (`?scoped`):**
- Adds `.v-xxx` class selectors to CSS rules
- Creates tight component isolation
- Example: `.button` → `.button.v-abc123`

**Global Scoping (`?global`):**
- Adds `[class*=v-]` attribute selectors to CSS rules
- Allows styles to be shared across components
- Example: `.button` → `.button[class*=v-]`
- Maintains project-level isolation while enabling component sharing

## Examples

### CSS-in-JS Examples

**Input JSX with classnames:**
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

**Input JSX with clsx:**
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

### SCSS to CSS Transformation

```scss
/* Input SCSS */
.header {
  color: blue;
  
  &__title {
    font-size: 24px;
    font-weight: bold;
  }
  
  &__subtitle {
    color: #666;
    font-size: 16px;
  }
}
```

```css
/* Output CSS */
.header.v-abc123 {
  color: blue;
}

.header.v-abc123__title {
  font-size: 24px;
  font-weight: bold;
}

.header.v-abc123__subtitle {
  color: #666;
  font-size: 16px;
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

### Q: How do I handle third-party component styles?
**A:** There are two main approaches for styling third-party components:

1. **Modify outer element styles**: Provide a `className` prop to the component, then use that className to modify the outer element styles.

2. **Modify internal element styles**: Use the specified `className` with `:scope` pseudo-class to control scope ID positioning, then target internal element class names to modify their styles.

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

// Internal element styling using :scope
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

### Q: What happens when multiple component files import the same style file with ?scoped?
**A:** The plugin generates different scope IDs based on the importing file's path, not the imported file. In webpack builds, different query parameters are treated as different files, so the same style file will generate multiple copies with different scope IDs. This means each component gets its own scoped version of the shared styles.

### Q: What's the difference between :scope and :global in CSS?
**A:** 
- **`:scope`**: Represents the current component's scope, gets replaced with the component's scope ID
- **`:global`**: Prevents scoping for specific selectors, keeps them as-is without scope transformation

### Q: How does scopeAttrs work?
**A:** 
- **Default**: `true` - Automatically injects scope IDs into JSX elements' className attributes
- **When disabled**: Set to `false` to disable automatic scope injection (useful when you want manual control)

### Q: Should I include ?scoped or ?global in my actual file names?
**A:** No! The `?scoped` and `?global` are query parameters for the loader, not part of the filename. Use standard file names like `Button.scss` and add the parameters in your import statements: `import './Button.scss?scoped'`.

**Important Note:** By default, only JSX elements in files that import styles with the `?scoped` suffix will generate scope IDs. Even if JSX elements in a file don't need styling, if you want to generate scope IDs for them (or make global scope styles referenced via `?global` take effect), you can add an empty style file and reference it with the `?scoped` suffix.

### Q: Can I use this plugin without webpack?
**A:** Yes! While this plugin is designed to work with webpack, you can use the [build-react-esm-project](https://github.com/gxlmyacc/build-react-esm-project) build tool for non-webpack environments. It provides scope style support through gulp-based builds.

### Q: How does the plugin handle multiple scope configurations?
**A:** When multiple scope configurations are provided, the PostCSS plugin processes the input CSS file multiple times, generating a single output file that contains all scoped versions. This allows the same styles to work in different contexts (global, component-specific, etc.) without conflicts.

### Q: Do I need to configure the PostCSS plugin?
**A:** Yes, you need to add the PostCSS plugin to your `postcss.config.js`, but you don't need to configure its parameters. The plugin will automatically receive the correct parameters from the webpack loader based on your import statements.

### Q: What's the difference between className and other attributes in classAttrs?
**A:** The `className` attribute gets universal injection - it's added to ALL JSX elements (even those without a className), while other attributes (like `class` or `data-class`) only get scope ID injection if they already exist on the JSX element. This is why `className` is the default and recommended choice for comprehensive styling.

### Q: Why do I need to use :scope for nested element selectors?
**A:** Scope styles do not automatically inherit to child elements. When you write `.custom-modal .ant-modal-content`, only `.custom-modal` gets the scope ID, but `.ant-modal-content` remains unscoped. Using `:scope` ensures that nested selectors are properly scoped and can match the generated HTML structure.

### Q: What's the difference between scopeAll: false and scopeAll: true?
**A:** `scopeAll: false` (default) only generates scope IDs for JSX elements in files that import styles with `?scoped`, while `scopeAll: true` generates scope IDs for ALL JSX elements in the project, regardless of style file imports. Use `scopeAll: true` when you want consistent architecture or future-proofing for styling needs.

### Q: How are scope IDs positioned in CSS selectors?
**A:** By default, scope IDs are added to the last selector in each CSS rule. Use `:scope` to control the position, `:global` to prevent scoping, and `>>>` for deep selectors. For example, `.button` becomes `.button.v-abc123`, while `.container:scope .button` becomes `.container.v-abc123 .button`.

**⚠️ Important:** `:scope` can be used in two ways:
1. **Attached**: `.container:scope` → `.container.v-abc123` (scope ID attached to selector)
2. **Standalone**: `.container :scope` → `.container .v-abc123` (scope ID as separate selector)

Both are valid but produce different CSS output.

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

### 3. CSS Selectors
- Prefer `:scope` over `>>>` when possible
- Use `:global` sparingly for truly global styles
- Leverage CSS custom properties for theming

**Understanding :scope positioning:**
- **`.container:scope`**: Scope ID attached to the container (`.container.v-abc123`)
- **`.container :scope`**: Scope ID as a separate element (`.container .v-abc123`)
- **Choose based on your HTML structure and styling needs**

**Important Note about Scope Inheritance:**
- **Scope styles do NOT automatically inherit to child elements**
- **Use `:scope` to explicitly target nested elements**
- **Without `:scope`, child element selectors won't match**

**Scope ID Generation Rules in Style Files:**

1. **Default Behavior**: Scope IDs are automatically added to the last selector in each CSS rule
2. **Custom Position**: Use `:scope` pseudo-class or `>>>` to control where the scope ID is placed
3. **Global Styles**: Wrap styles in `:global` pseudo-class to prevent scoping

**Examples:**
```scss
/* Default: scope ID added to last selector */
.button { color: red; }
/* Output: .button.v-abc123 { color: red; } */

/* Custom position with :scope */
.container :scope .button { color: blue; }
/* Output: .container.v-abc123 .button { color: blue; } */

/* Global styles (no scoping) */
:global .reset { margin: 0; }
/* Output: .reset { margin: 0; } (no scope ID added) */
```

**Selector Examples:**
```scss
/* Default behavior - scope ID added to last selector */
.button { color: red; }
/* Output: .button.v-abc123 { color: red; } */

/* :scope - Component-level scoping (REQUIRED for nested elements) */
:scope .button { color: red; }
/* Output: .v-abc123 .button { color: red; } */

/* :scope with custom positioning - two different approaches */
.container:scope .button { color: blue; }
/* Output: .container.v-abc123 .button { color: blue; } */

.container :scope .button { color: blue; }
/* Output: .container .v-abc123 .button { color: blue; } */

/* :global - Prevent scoping */
:global .reset { margin: 0; }
/* Output: .reset { margin: 0; } (no scope added) */



/* >>> - Deep selector (use sparingly) */
.container >>> .deep { color: blue; }
/* Output: .container.v-abc123 .deep { color: blue; } */

/* WRONG - This won't work without :scope */
.custom-modal .ant-modal-content { padding: 24px; }
/* Output: .custom-modal.v-abc123 .ant-modal-content { padding: 24px; } */
/* But the selector won't match because .ant-modal-content is not scoped! */

/* CORRECT - Use :scope for nested elements */
.custom-modal {
  :scope {
    .ant-modal-content { padding: 24px; }
  }
}
/* Output: .custom-modal.v-abc123 .ant-modal-content { padding: 24px; } */
/* Now it works because :scope ensures proper scoping */
```

### 4. Performance Considerations
- Scope only the styles you need
- Avoid excessive use of `:global` selectors
- Use meaningful class names for better debugging

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



