# babel-preset-react-scope-style

A babel plugin that scope style for style files in react component

## Installtion

```bash
  npm install --save-dev babel-preset-react-scope-style
  // or 
  yarn add -D babel-preset-react-scope-style
```

## Config

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

## Usage


if one js/jsx import a css/scss/less with `?scoped` suffix，this means that you have enabled the `scoped style` for this file：
```es6
// test.js
import React from 'react';

import 'test.scss?scoped';

class Test extends React.Component {

  renderSome() {
    return <div>
      <button>button</button>
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


When build, plugin will generate a hash string`v-xxxxxxxx`,that based on file name and(`package.json -> name`)，and it will be applied to all `className`：

```es6
// test.js
import React from 'react';
import { Button } from 'dpl-react';

import 'test.scss?scoped';

class Test extends React.Component {

  renderSome() {
    return <div className="v-xxxxxxxx">
      <Button className="v-xxxxxxxx">button1</Button>
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
### Recommend

It is recommended that the 'scoped style' file name and the corresponding JS file name maintain a 'one-to-one' relationship. That is, if the JS file name is` test.js `, the style file name is` test.scss `。

## Customize the hash generation location 

In the style file, the hash string is generated to the last selector by default. If you want to customize the hash generation location, you can use the `:scope` pseudo class or `>>`. For example, if the style file is as follows：

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
then resulting style file is as follows：

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

## Partial styles that do not generate hash

In some usage scenarios, if you don't want to generate hash scope for some styles, you can use the `:global` pseudo class. For example, if the style file is as follows：

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

then generated style file is as follows：

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

## ?global-style

A project generally contains some global style files, which usually contain some settings or tool style classes that affect the global. In cross project integration, these global styles can easily lead to mutual pollution among projects. `?global-style` is to solve this problem as much as possible.

### usage

1. change the babel.config.js：

```js
...
[
  'babel-preset-react-scope-style', 
  { 
    inject: { 
      scopeNamespace: 'demo' // configure the scope style namespace, such as `demo`
    } 
  }
],
...
```

In the above configuration, the `scopeNamespace` is configured to `demo`'. Then hash string generated at this time is no longer `v-xxxxxxx`, but it becomes `v-demo-xxxxxxxx`.

2. Add `?global` after the `import` statement that refers to the global style:

```js
// index.js
import '~/assets/styles/global.css?global';

....
```

Hypothesis `global.css` file looks like this

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

Then, the final generated style file looks like this：

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



