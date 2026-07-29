/**
 * Turbopack 场景下建议使用的 PostCSS 插件表（from-query）。
 * Webpack 请继续用 loader，并用 `process.env.TURBOPACK` 分流，避免双重 scope。
 * @returns {{ plugins: Record<string, object> }}
 */
function createTurbopackPostcssConfig() {
  return require('../next').createTurbopackPostcssPlugins();
}

module.exports = createTurbopackPostcssConfig;
module.exports.createTurbopackPostcssConfig = createTurbopackPostcssConfig;
