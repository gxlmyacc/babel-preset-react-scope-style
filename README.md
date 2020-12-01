# babel-preset-react-scope-style

a babel plugin that scope style for style files in react component

## installtion

```bash
  npm install --save-dev babel-preset-react-scope-style
  // or 
  yarn add -D babel-preset-react-scope-style
```

## config

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



