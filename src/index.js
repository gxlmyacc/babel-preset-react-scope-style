const { declare } = require('@babel/helper-plugin-utils');
const syntaxJsx = require('@babel/plugin-syntax-jsx').default;
const path = require('path');
const { fileExists, isFunction } = require('./utils');
const options = require('./options');
const transformClass = require('./plugins/transform-class');
const injectScope = require('./plugins/inject-scope');

let pkg;
if (fileExists(path.join(process.cwd(), 'package.json'))) {
  pkg = require(path.join(process.cwd(), 'package.json'));
}

function pluginHook(plugin) {
  if (!isFunction(plugin)) return plugin;
  return function () {
    let ret = plugin.apply(this, arguments);
    if (!ret.inherits) ret.inherits = syntaxJsx;
    return ret;
  };
}

let loaded = false;

module.exports = declare((api, opts = {}) => {
  api.assertVersion(7);
  if (!opts) opts = {};
  if (!loaded) {
    loaded = true;

    Object.assign(options, opts);

    if (!options.pkg) {
      options.pkg = pkg;
    }
  }

  let plugins = [
  ];

  plugins.push(injectScope);
  plugins.push(transformClass);


  plugins = plugins.map(p => pluginHook(p));

  return {
    plugins
  };
});

