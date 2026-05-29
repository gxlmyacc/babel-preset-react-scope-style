const postcss = require('postcss');

/**
 * 依次执行 PostCSS 插件链。
 * @param {string} content - 原始 CSS 文本
 * @param {import('postcss').AcceptedPlugin[]} plugins - PostCSS 插件列表
 * @param {object} [options] - process 选项
 * @param {string} [options.from] - 源文件路径（供 url / alias 解析）
 * @returns {Promise<string>} 处理后的 CSS
 */
async function runPostcssPlugins(content, plugins, options = {}) {
  if (!plugins.length) {
    return content;
  }
  const result = await postcss(plugins).process(content, {
    from: options.from,
  });
  return result.css;
}

module.exports = {
  runPostcssPlugins,
};
