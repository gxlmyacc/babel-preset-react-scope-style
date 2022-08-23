# babel-preset-react-scope-style

一个为React组件支持局部(scope)作用域的babel插件

# 安装

```bash
  npm install --save-dev babel-preset-react-scope-style
  // 或者
  yarn add -D babel-preset-react-scope-style
```


## 配置

babel.config.js:

```js
module.exports = {
  presets: [
    ...
    ['babel-preset-react-scope-style']
  ],
  plugins: [
   ...
  ]
};
```

webpack.config.js:

```js
{
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          'css-loader',
          'babel-preset-react-scope-style/loader',
          ...
        ]
      },
      {
        test: /\.scss$/,
        use: [
          'css-loader',
          'babel-preset-react-scope-style/loader',
          ...
        ]
      },
      {
        test: /\.less$/,
        use: [
          'css-loader',
          'babel-preset-react-scope-style/loader',
          ...
        ]
      }
    ]
  }
}
```

## 使用方法

如果一个js/jsx文件中引用的某个样式文件名后面添加`?scoped`，则会认为该文件启用了`scoped样式`。如下：
```es6
// test.js
import React from 'react';

import 'test.scss?scoped';

class Test extends React.Component {

  renderSome() {
    return <div>
      <button>按钮</button>
    </div>
  }

  render() {
    return <div className="a">
      <a className="b">link</a>
      { this.renderSome() }
    </div>
  }
}
```

```scss
// test.scss

.a {
  color: red;
}

.a .b {
  color: green;
}

```


在打包过程中会自动为该文件生成一个由项目名(`package.json -> name`)和文件路径生成的hash字符串`v-xxxxxxxx`，并应用到该文件的所有JSX的`className`上。如下：

```es6
// test.js
import React from 'react';
import { Button } from 'antd';

import 'test.scss?scoped';

class Test extends React.Component {

  renderSome() {
    return <div className="v-xxxxxxxx">
      <Button className="v-xxxxxxxx">按钮</Button>
    </div>
  }

  render() {
    return <div className="v-xxxxxxxx a">
      <a className="v-xxxxxxxx b">link</a>
    </div>
  }
}
```

```scss
// test.scss

.a.v-xxxxxxxx {
  color: red;
}

.a .b.v-xxxxxxxx {
  color: green;
}

```

### 建议

  建议`scoped样式`文件名与对应的js文件名保持`一对一`的关系。即如果js文件名是`test.js`，则样式文件名为`test.scss`。

## 自定义样式中hash生成位置

在样式文件中，默认会将hash字符串生成到最后一个选择器上。如果想自定义hash生成位置，可以通过`:scope`伪类或者`>>>`。比如，如果样式文件如下：

```scss
// test.scss

.a {
  color: red;
}

.a:scope .b {
  color: green;
}

.a >>> .c {
  color: blue;
}

```
则生成的样式文件如下：
```scss
// test.scss

.a.v-xxxxxxxx {
  color: red;
}

.a.v-xxxxxxxx .b {
  color: green;
}

.a.v-xxxxxxxx .c {
  color: blue;
}

```

## 部分样式不生成hash

在一些使用场景中，如果不想给部分样式生成hash作用域，则可以使用`:global`伪类。比如，如果样式文件如下：


```scss
// test.scss

.a {
  color: red;
}

.a:scope .b {
  color: green;
}

:global {
  .a {
    background: blue;
  }
}

```
则生成的样式文件如下：
```scss
// test.scss

.a.v-xxxxxxxx {
  color: red;
}

.a.v-xxxxxxxx .b {
  color: green;
}

.a {
  background: blue;
}

```

## ?global样式

一个项目中一般都包含一些全局的样式文件，该文件一般会包含一些影响全局的设置或工具样式类。在跨项目集成时，这些全局样式很容易导致项目间的相互污染。`?global样式`就是为了尽量解决这个问题出现的。

### 使用方法

1. 修改babel.config.js：

```js
...
[
  'babel-preset-react-scope-style/preset', 
  { 
    scopeNamespace: 'demo' // 配置scope样式的命名空间，如demo
  }
],
...
```
在上面的配置中，`scopeNamespace`配置成了`demo`。 这时生成的的hash字符串就不再是`v-xxxxxxx`这样的了，而是变成了`v-demo-xxxxxxxx`。

2. 在引用全局样式的`import`语句后面添加`?global`

```js
// index.js
import '~/assets/styles/global.css?global';

....
```
假设`global.css`文件是这样的

```css
.something-class * {
  box-sizing: border-box;
}
  
.something-class.fl {
  float: left;
}
  
.something-class .fr {
  float: right;
}

.something-class .fr:scope .dd {
  color: red;
}
```

则，最后生成的样式文件是这样的：

```css
.something-class *[class*=v-demo-] {
    box-sizing: border-box;
  }
  
  
.something-class.fl[class*=v-demo-] {
  float: left;
}
  
.something-class .fr[class*=v-demo-] {
  float: right;
}

.something-class .fr[class*=v-demo-] .dd {
  color: red;
}
```

如此，即可避免一部分全局样式的污染问题。
