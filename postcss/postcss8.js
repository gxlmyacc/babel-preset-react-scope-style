const plugin = require('./plugin');

module.exports = opts => {
  const _plugin = plugin(opts);
  return Object.assign(
    () => ({
      postcssPlugin: plugin.id,
      Once(root, helpers) {
        return _plugin(root, helpers);
      }
    }),
    { postcss: true }
  );
};
