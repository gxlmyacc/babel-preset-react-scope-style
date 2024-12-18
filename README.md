# babel-preset-react-scope-style

A babel plugin that scope style for style files in react component

[![NPM version](https://img.shields.io/npm/v/babel-preset-react-scope-style.svg?style=flat)](https://npmjs.com/package/babel-preset-react-scope-style)
[![NPM downloads](https://img.shields.io/npm/dm/babel-preset-react-scope-style.svg?style=flat)](https://npmjs.com/package/babel-preset-react-scope-style)

## [中文说明](https://github.com/gxlmyacc/babel-preset-react-scope-style/blob/main/README_CN.md)

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

### Supported Options

#### scopeRegx

- Type: RegExp

- Default: /(\.(?:le|sc|sa|c)ss)(\?[a-z]+)?$/
- Description: A regular expression used to match style files that need to be processed. By default, it matches .less, .scss, .sass, and .css files and supports query parameters (e.g., ?scoped).

#### scope
- Type: Boolean

- Default: true

- Description: Whether to enable scoped styling. If set to false, scoped styles will not be generated.

#### scopeFn

- Type: (ext: string, query: string, options: { filename, source, scopeId, global, pkg }) => string

- Default: null

- Description: A custom function to modify the suffix and query parameters of imported style files.

#### scopePrefix

- Type: String
- Default: ''
- Description: The prefix for the generated scope hash string. For example, if set to 'v-', the generated hash string will look like v-xxxxxxxx.

#### scopeAttrs

- Type: Boolean
- Default: true
- Description: Whether to add scope attributes (e.g., data-v-xxxxxxxx) to the generated HTML elements. This helps with debugging and style overriding.

#### scopeAll

- Type: Boolean
- Default: false
- Description: Whether to generate scoped styles for all style files, not just those with the ?scoped query parameter.

#### scopeVersion

- Type: Boolean
- Default: false
- Description: Whether to include a version number in the generated scope hash string. This helps distinguish styles between different versions.

#### pkg

- Type: Object
- Default: null
- Description: A package information object, typically read from package.json. It provides additional information for generating the scope hash string.

#### classAttrs
- Type: Array<String>
- Default: ['className']
- Description: The class attribute names used in the generated scoped styles. By default, the plugin processes the className attribute.

### Example Configuration

```js
module.exports = {
  presets: [
    [
      'babel-preset-react-scope-style', 
      {
        scopeRegx: /(\.(?:le|sc|sa|c)ss)(\?scoped)?$/,
        scope: true,
        // Change the suffix of imported .scss/.less files to .css
        scopeFn: (filename, pkgName) => '.css',
        scopePrefix: 'v-',
        scopeAttrs: true,
        scopeAll: false,
        scopeVersion: true,
        pkg: require('./package.json'),
        classAttrs: ['className', 'dropdownClassName']
      }
    ]
  ]
};
```

## Usage


If a js/jsx file imports a style file with the ?scoped suffix, it means that scoped styles are enabled for that file. For example:

```es6
// test.js
import React from 'react';

import './test.scss?scoped';

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


During the build process, a hash string `v-xxxxxxxx` is automatically generated based on the project name (`package.json -> name`) and file path, and applied to all `className` attributes in the JSX. For example:

```es6
// test.js
import React from 'react';
import { Button } from 'antd';

import './test.scss?scoped';

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
### Recommendation

It is recommended that the `scoped style` file name and the corresponding JS file name maintain a 'one-to-one' relationship. That is, if the JS file name is` test.js `, the style file name is` test.scss `。

## Customize the hash generation location 

By default, the hash string is generated for the last selector in the style file. If you want to customize the hash generation location, you can use the `:scope` pseudo-class or `>>>`. For example, if the style file is as follows:


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
The resulting style file will be:

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

## Partial Styles Without Generating Hash

In some usage scenarios, if you do not want to generate a hash scope for some styles, you can use the `:global` pseudo-class. For example, if the style file is as follows:

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

The generated style file will be:

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

## Global Styles

A project generally contains some global style files that usually contain settings or utility style classes affecting the entire project. In cross-project integration, these global styles can easily lead to conflicts between projects. `?global-style` is designed to minimize this issue.

### Usage

1. Modify `babel.config.js`:

```js
...
[
  'babel-preset-react-scope-style', 
  { 
    scopeNamespace: 'demo' // configure the scope style namespace, such as `demo`
  }
],
...
```

In the above configuration, `scopeNamespace` is set to demo. The generated hash string will now be `v-demo-xxxxxxxx` instead of `v-xxxxxxxx`.

2. Add `?global` to the `import` statement that references the global style:

```js
// index.js
import '~/assets/styles/global.css?global';

....
```

Assume the `global.css` file looks like this:

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

The final generated style file will look like this:

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



