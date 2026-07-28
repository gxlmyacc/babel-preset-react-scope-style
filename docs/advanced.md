# Advanced features

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
