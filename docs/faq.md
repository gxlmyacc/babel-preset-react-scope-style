# FAQ & best practices

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
**A:** Yes. Use the **[Vite plugin](./integrations.md#vite)** (`babel-preset-react-scope-style/vite`), **[esbuild plugin](./integrations.md#esbuild)** (`babel-preset-react-scope-style/esbuild`), **[Next.js helper](./integrations.md#nextjs)** (`babel-preset-react-scope-style/next`), **[Rspack loader](./integrations.md#rspack)** (same as Webpack), or **[standalone PostCSS](./integrations.md#pure-postcss-standalone)**. You can also use [build-react-esm-project](https://github.com/gxlmyacc/build-react-esm-project) for Gulp-based React ESM builds.

### Q: How does the plugin handle multiple scope configurations?
**A:** When multiple scope configurations are provided, the PostCSS plugin processes the input CSS file multiple times, generating a single output file that contains all scoped versions. This allows the same styles to work in different contexts (global, component-specific, etc.) without conflicts.

### Q: Do I need to configure the PostCSS plugin?
**A:** **Webpack / Vite / esbuild:** No manual PostCSS setup — the loader or plugin applies scoping automatically. **Standalone PostCSS:** Yes — add `babel-preset-react-scope-style/postcss` to `postcss.config.js` and set `scoped`, `global`, and `id` yourself (see [Pure PostCSS](./integrations.md#pure-postcss-standalone)).

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

Enable debug logging by setting the `DEBUG` environment variable in your app build, for example:

```bash
DEBUG=babel-preset-react-scope-style npm run build
# or, for the webpack example:
cd examples/webpack && DEBUG=babel-preset-react-scope-style npm run build
```
