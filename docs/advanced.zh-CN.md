# 高级功能


### 自定义作用域函数

```javascript
{
  scopeFn: (filePath, query, context) => {
    // 文件转换的自定义逻辑
    return filePath + query;
  }
}
```

**实际应用示例 - 将SCSS转换为CSS：**
```javascript
{
  scopeFn: (filePath, query, context) => {
    // 在构建过程中将.scss文件转换为.css
    if (filePath.endsWith('.scss')) {
      return filePath.replace('.scss', '.css') + query;
    }
    return filePath + query;
  }
}
```

### 多作用域配置（仅内部使用）

**⚠️ 重要：** 仅供参考。loader会根据您的导入语句自动处理多个作用域。

```javascript
// 这是loader内部处理多个作用域的方式
// 请勿在PostCSS配置中手动配置
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

**内部处理过程：**
1. **输入CSS文件**被多次处理
2. **第一个作用域**创建基础作用域版本
3. **额外作用域**生成具有不同ID的额外副本
4. **最终输出**在一个文件中包含所有作用域版本

**使用场景示例：**
- **全局作用域**（`v-ewp-`）：用于共享组件库
- **组件作用域**（`v-component-123`）：用于单个组件样式
- **结果**：一个CSS文件包含在全局和组件上下文中都能工作的样式

**工作原理：**
- loader自动检测不同的导入模式（`?scoped`、`?global`）
- 内部创建适当的作用域配置
- 用户只需要在导入语句中使用`?scoped`或`?global`


**示例输出：**
```css
/* 原始CSS */
.button { color: red; }

/* 使用多个作用域生成 */
.button.v-ewp- { color: red; }        /* 第一个作用域 */
.button.v-component-123 { color: red; } /* 第二个作用域 */
.button.v-component-456 { color: red; } /* 第三个作用域 */
```

### 多作用域配置

```javascript
// 带多个作用域的PostCSS配置
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

## 工作原理

1. **Babel插件**: 
   - 检测带查询参数的样式导入（`?scoped`、`?global`）
   - 向JSX元素的className属性注入作用域ID
   - 转换className表达式以实现正确的作用域化

2. **PostCSS插件**:
   - 处理带作用域隔离的CSS选择器
   - 处理 `:scope`、`:global` 与原生 CSS 嵌套
   - 为组件生成唯一的作用域ID
   - 根据导入类型应用不同的作用域策略

3. **Webpack Loader**:
   - 与webpack构建流程集成
   - 应用PostCSS转换
   - 维护源码映射支持

### 作用域ID生成

插件使用引用文件的路径和项目名称的哈希值生成作用域ID：

```javascript
// 对于 ?scoped 导入
scopeId = scopePrefix + hash(importingFilePath + projectName)
// 默认：scopePrefix = 'v-'，生成如：v-abc123

// 对于 ?global 导入  
scopeId = scopePrefix + hash(importingFilePath + projectName)
// 默认：scopePrefix = 'v-'，生成如：v-abc123
```

**重要说明：** 作用域ID基于引用文件的路径生成，而不是被引用文件的路径。这意味着：
- 组件A导入`./shared/styles.scss?scoped`获得基于组件A路径的作用域ID
- 组件B导入`./shared/styles.scss?scoped`获得基于组件B路径的作用域ID
- 结果：相同的共享文件为不同组件生成不同的作用域ID

### CSS转换策略

**组件作用域（`?scoped`）：**
- 向CSS规则添加`.{scopePrefix}xxx`类选择器（默认：`.v-xxx`）
- 创建紧密的组件隔离
- 示例：`.button` → `.button.v-abc123`（默认前缀）

**全局作用域（`?global`）：**
- 向CSS规则添加`[class*={scopePrefix}]`属性选择器（默认：`[class*=v-]`）
- 允许样式在组件间共享
- 示例：`.button` → `.button[class*=v-]`（默认前缀）
- 在启用组件共享的同时保持项目级隔离
