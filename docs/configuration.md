# Configuration

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

PostCSS parameters (`scoped`, `global`, `id`, etc.) are normally derived from your `?scoped` / `?global` imports after Babel rewriting. See [Pure PostCSS](./integrations.md#pure-postcss-standalone) when you are not using the loader or Vite plugin.

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
