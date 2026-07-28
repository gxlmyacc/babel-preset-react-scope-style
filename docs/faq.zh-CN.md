# 常见问题与最佳实践

### Q: 为什么要使用作用域样式？
**A:** 作用域样式可以防止组件之间的CSS冲突，使您的React应用更易维护，减少意外样式覆盖的可能性。

### Q: 作用域ID生成是如何工作的？
**A:** 插件基于文件路径和package.json中的项目名称生成唯一的哈希值，确保在构建过程中ID的一致性。

### Q: 可以与CSS-in-JS库一起使用吗？
**A:** 是的！插件可以与classnames、clsx等动态类名工具库无缝配合。它会自动将作用域ID注入到最终的className值中，确保所有动态类都被正确作用域化。

**示例：**
```jsx
// 输入
className={classNames('btn', variant && `btn-${variant}`)}

// 输出  
className={classNames('btn', variant && `btn-${variant}`) + ' v-abc123'}
```

### Q: ?scoped 和 ?global 有什么区别？
**A:** 
- `?scoped`：创建组件特定的作用域，使用`.{scopePrefix}xxx`类选择器（默认：`.v-xxx`）
- `?global`：创建全局作用域，使用`[class*={scopePrefix}]`属性选择器（默认：`[class*=v-]`），用于组件间共享样式

两者都创建作用域样式，但`?global`允许样式在组件间共享，同时保持项目级隔离。

**实际效果示例：**
- `?scoped`：`.button` → `.button.v-abc123`
- `?global`：`.button` → `.button[class*=v-]`

### Q: 样式文件里 `@import` 的 `?scoped` 和 JS 里的 `?scoped` 一样吗？为什么不支持 `?global`？
**A:** **不一样。** 在 **CSS/SCSS/Less 样式文件** 的 `@import url(...)` 中，本库**只识别并改写 `?scoped` 这一种后缀**（例如 `@import url("./partial.scss?scoped");`）。这里的 `?scoped` 表示：**沿用当前正在被处理的这份样式文件的作用域**，而不是在样式侧再生成一套新的 JS hash 作用域 id。

| 当前样式文件在构建侧的作用域（由 JS `import` 的 `?scoped` / `?global` 决定） | `@import` 里写 `?scoped` 时，等价于 |
| --- | --- |
| 组件作用域（JS `?scoped`，类选择器 `.v-xxx`） | 子文件也按**同一组件**作用域处理 |
| 全局共享作用域（JS `?global`，`[class*=v-]`） | 子文件按**同一全局**作用域处理 |

构建时会把子文件路径改写为带 `scope-style&scoped=true&id=...`（若父文件为 global 则还会带 `&global=true`）的 URL，与 JS 侧改写 import 的规则一致。

**为什么不支持在 `@import` 里写 `?global`？**

1. **作用域模式应由「谁引用了这份 CSS」决定**：组件级还是项目级共享，已经在 **JS** 里通过 `import './x.scss?scoped'` 或 `import './x.scss?global'` 定好了；PostCSS 处理父样式时会把 `scoped` / `global` / `id` 一并传入，子 `@import` 只需一个标记说明「跟着父文件走」即可。
2. **样式文件无法单独生成 JS 侧的 scope id**：hash 来自引用该样式的组件文件路径；嵌套样式不能像在 JS 里那样再声明「我要 global 还是 scoped」，只能**复用父文件已有的 id 与模式**。
3. **避免语义冲突**：若在 `@import` 里再允许 `?global`，容易与 JS 的 `?global`、以及 CSS 选择器里的 `:global` 伪类混淆；实现上也会对无 `?scoped` 的 URL（含 `?global` 或裸路径）保持原样，不注入 `scope-style`。

若子文件需要「整条规则不参与作用域」，请在**该子文件的选择器**中使用行首 `:global`（见上文 `:global` 说明），而不是在 `@import` URL 上写 `?global`。

### Q: 如何处理第三方组件样式？
**A:** 有两种主要方法来处理第三方组件样式：

1. **修改外层元素样式**：为组件提供`className`属性，然后通过该className来修改外层元素样式。

2. **修改内部元素样式**：在透传的 `className` / `wrapClassName` 上使用**附着式** `:scope`（如 `.custom-modal:scope .ant-modal-content`），再通过子节点选择器命中组件内部 DOM。

**示例：**
```jsx
// 带有自定义className的组件
<AntdButton className="custom-button">点击我</AntdButton>
```

```scss
// 外层元素样式
.custom-button {
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

// 内部元素：:scope 写在父选择器上（勿用裸 :scope 包装块）
.custom-button:scope {
  .ant-btn-inner {
    font-weight: 600;
  }

  .ant-btn-icon {
    margin-right: 8px;
  }
}
```

### Q: 多个组件文件引用同一个样式文件并添加?scoped后缀后会怎么处理？
**A:** 插件基于引用文件的路径生成不同的作用域ID，而不是被引用的文件。在webpack构建过程中，不同的查询参数会被识别成不同的文件，因此相同的样式文件会因为不同的引用生成多个副本，只是不同的副本中的作用域ID不同。这意味着每个组件都会获得共享样式的独立作用域版本。

### Q: CSS中:scope和:global有什么区别？
**A:** 
- **`:scope`**：控制 scope id 的插入位置（替换为 `.v-xxx` 或 `[class*=v-]`）
- **`:global`**：不是 CSS Modules 的 `:global(...)`。**行首** `:global` 表示整条规则不作用域化；**中间** `:global`（嵌套展开）表示仅 **`:global` 之前** 的选择器加 scope，后面片段保持全局

### Q: scopeAttrs是如何工作的？
**A:** 
- **默认值**：`true` - 自动向JSX元素的className属性注入作用域ID
- **禁用时**：设置为`false`以禁用自动作用域注入（当您想要手动控制时很有用）

### Q: 我应该在实际文件名中包含?scoped或?global吗？
**A:** 不应该！`?scoped`和`?global`是loader的查询参数，不是文件名的一部分。使用标准文件名如`Button.scss`，并在导入语句中添加参数：`import './Button.scss?scoped'`。

**重要说明：** 默认情况下，仅存在`?scoped`后缀的文件中的jsx的className才会生成作用域id。即使某个文件中的jsx不需要配置样式，但如果你希望也为它们生成作用域id（或者让通过`?global`引用的全局作用域样式生效），你可以添加个空白的样式文件然后通过`?scoped`后缀进行引用。

### Q: 我可以在没有webpack的情况下使用此插件吗？
**A:** 可以。请使用 **[Vite 插件](./integrations.zh-CN.md#vite)**（`babel-preset-react-scope-style/vite`）、**[esbuild 插件](./integrations.zh-CN.md#esbuild)**（`babel-preset-react-scope-style/esbuild`）、**[Next.js 集成](./integrations.zh-CN.md#nextjs)**（`babel-preset-react-scope-style/next`）、**[Rspack loader](./integrations.zh-CN.md#rspack)**（与 Webpack 相同），或 **[独立 PostCSS](./integrations.zh-CN.md#纯-postcss独立使用)**。也可使用 [build-react-esm-project](https://github.com/gxlmyacc/build-react-esm-project) 做基于 Gulp 的 React ESM 构建。

### Q: 插件如何处理多个作用域配置？
**A:** 当提供多个作用域配置时，PostCSS插件会多次处理输入的CSS文件，生成一个包含所有作用域版本的单一输出文件。这允许相同的样式在不同的上下文中工作（全局、组件特定等），而不会产生冲突。

### Q: 我需要配置PostCSS插件吗？
**A:** **Webpack / Vite / esbuild：** 无需手动配置 PostCSS，loader 或插件会自动处理。**独立 PostCSS：** 需要在 `postcss.config.js` 中添加 `babel-preset-react-scope-style/postcss`，并自行设置 `scoped`、`global`、`id`（见 [纯 PostCSS](./integrations.zh-CN.md#纯-postcss独立使用)）。

### Q: className和classAttrs中其他属性有什么区别？
**A:** `className`属性获得全局注入 - 它被添加到所有JSX元素中（即使那些没有className的元素），而其他属性（如`class`或`data-class`）只有在JSX元素上已经存在时才会获得作用域ID注入。这就是为什么`className`是全面样式的默认且推荐选择。

### Q: 为什么嵌套元素选择器需要使用 :scope？
**A:** 默认只在选择器链**最后一节**挂 scope。写 `.custom-modal .ant-modal-content` 时，scope 会落在 `.ant-modal-content` 上，而第三方内部节点往往**没有**你注入的 scope class，导致匹配失败。应使用 **`.custom-modal:scope .ant-modal-content`**（或 `&:scope`），把 scope 锚在透传的容器 class 上。避免裸 `:scope { }` 或 `.custom-modal :scope .child`——它们会多出一层独立 `.v-xxx` 节点，通常与真实 DOM 不符。

### Q: scopeAll: false和scopeAll: true有什么区别？
**A:** `scopeAll: false`（默认）只为导入带有`?scoped`样式的文件中的JSX元素生成作用域ID，而`scopeAll: true`为项目中的所有JSX元素生成作用域ID，无论是否导入样式文件。当您想要一致的架构或为样式需求做未来准备时，使用`scopeAll: true`。

### Q: 作用域ID在CSS选择器中是如何定位的？
**A:** 默认在每条规则选择器链的**最后一节**添加作用域 ID（伪类之前，如 `.button.v-abc123:hover`）。使用 `:scope` 控制位置，`:global` 标记全局片段。例如 `.button` → `.button.v-abc123`，`.container:scope .button` → `.container.v-abc123 .button`。

**⚠️ 重要：** 请优先使用 **附着式** `.container:scope` / `&:scope`（→ `.container.v-abc123`）。`.container :scope` 等裸写法虽可编译，但会插入独立 `.v-abc123` 节点，多数场景下样式不生效。

### Q: 原生 CSS 嵌套如何作用域化？
**A:** 与扁平规则一致：仅 **Rule 树叶子** 默认挂 scope，展开后平坦链最后一节带 scope（如 `.card { .title {} }` → `.card .title.v-abc123`）。同一 block 既有声明又有子选择器时，声明会自动包入 `&:scope`。`:global` 段内普通类名不挂 scope；`:global` 内 `:scope` 子块仍 scope。每个 JSX 元素仍有同一 `v-xxx`，selector 须在最后一节绑定本文件 scope 以免误伤其他文件的子组件。

## 最佳实践

### 1. 文件命名约定
保持组件文件和样式文件名称一致：
```
Button/
├── Button.jsx
├── Button.scss
└── Button.test.js
```

**对于共享样式：**
```
shared/
├── mixins.scss         # 共享SCSS混入（导入时使用?scoped）
└── common.scss         # 全局共享样式（导入时使用?global）
```

**文件名与导入参数的区别：**
- **文件名**：使用标准扩展名（`.scss`、`.sass`、`.less`）
- **导入参数**：添加`?scoped`或`?global`来控制作用域行为
- **示例**：`Button.scss`（文件）+ `import './Button.scss?scoped'`（导入）

### 2. 样式组织
- 使用`?scoped`用于组件特定样式和SCSS工具
- 使用`?global`用于组件间共享样式（布局、主题、重置）
- 按作用域组织导入：组件样式优先，然后共享样式
- **共享文件**：多个组件导入相同的文件并添加`?scoped`将基于其导入路径获得不同的作用域ID

### 3. 第三方UI库集成
- **Ant Design**：配置`classAttrs`以包含自定义类名属性
- **常见属性**：`overlayClassName`、`wrapClassName`、`dropdownClassName`、`popupClassName`
- **配置示例**：`classAttrs: ['className', 'overlayClassName', 'wrapClassName', 'dropdownClassName']`
- **优势**：应用于第三方组件的自定义样式将被正确作用域化

### 3. CSS选择器
- 嵌套样式优先用原生嵌套或已展平的扁平 selector；需要块级声明时用 `&:scope`
- 谨慎使用 `:global`，仅用于真正的全局片段
- 利用CSS自定义属性进行主题设置

**理解 :scope 写法（推荐顺序）：**
1. **`.container:scope .child`** — 扁平、透传 className 最常用
2. **`.container { &:scope .child {} }`** 或 **`.container:scope { .child {} }`** — 嵌套 SCSS
3. **避免** `.container :scope .child`、`:scope .child`、`.container { :scope { .child {} } }` — 多一层节点，易失效

**关于嵌套子元素：**
- scope **不会**自动作用到「仅写在祖先选择器上」的子节点规则
- 需要把 scope **锚在**带 className 的那一层（`:scope` 写在父选择器后）
- 仅写 `.parent .child` 时 scope 往往在 `.child` 上，第三方内部 class 常匹配不到


### 4. 性能考虑
- 仅对需要的样式进行作用域化
- 避免过度使用`:global`选择器
- 使用有意义的类名以便更好地调试


## 故障排除

### 常见问题

**1. 样式没有被作用域化**
- 检查导入语句是否包含`?scoped`
- 验证Babel配置是否正确
- 确保PostCSS插件配置正确

**2. 作用域ID在每次构建时都改变**
- 检查`scopeVersion`是否设置为`false`
- 确保`pkg`选项配置正确
- 验证文件路径是否一致

**3. CSS没有被处理**
- 检查PostCSS配置
- 验证webpack loader配置
- 确保文件扩展名匹配`scopeRegx`

**4. 全局样式被作用域化**
- 在导入语句中使用`?global`
- 在CSS中使用`:global`选择器
- 检查PostCSS插件配置

### 调试模式

在业务项目构建时设置 `DEBUG` 环境变量，例如：

```bash
DEBUG=babel-preset-react-scope-style npm run build
# 或使用本仓库 webpack 示例：
cd examples/webpack && DEBUG=babel-preset-react-scope-style npm run build
```
