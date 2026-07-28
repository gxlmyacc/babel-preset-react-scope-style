const path = require('path');

const STYLE_TEST_RE = /\.(css|scss|sass|less)(\?|$)/i;
const CSS_LOADER_RE = /[\\/]css-loader[\\/]|css-loader/;
const SCOPE_LOADER_RE = /babel-preset-react-scope-style[\\/]loader/;
const PREPROCESSOR_LOADER_RE = /[\\/](sass-loader|less-loader|stylus-loader)[\\/]|(sass-loader|less-loader|stylus-loader)/;

/**
 * 解析 scope-style loader 的绝对路径。
 * @returns {string}
 */
function getScopeLoaderPath() {
  return path.join(__dirname, '../loader/index.js');
}

/**
 * 从 use 项中取出 loader 路径字符串。
 * @param {string|{ loader?: string }|Function} useItem - webpack use 项
 * @returns {string}
 */
function getLoaderName(useItem) {
  if (!useItem) return '';
  if (typeof useItem === 'string') return useItem;
  if (typeof useItem === 'function') return '';
  return useItem.loader || '';
}

/**
 * 将 rule.use / rule.loader 归一化为数组。
 * @param {import('webpack').RuleSetRule} rule - webpack 规则
 * @returns {Array<string|{ loader?: string, options?: object }>}
 */
function normalizeUses(rule) {
  if (Array.isArray(rule.use)) {
    return rule.use.slice();
  }
  if (rule.use) {
    return [rule.use];
  }
  if (rule.loader) {
    const item = { loader: rule.loader };
    if (rule.options) item.options = rule.options;
    return [item];
  }
  return [];
}

/**
 * 判断规则是否处理样式文件。
 * @param {import('webpack').RuleSetRule} rule - webpack 规则
 * @returns {boolean}
 */
function isStyleRule(rule) {
  if (rule.type && String(rule.type).includes('css')) {
    return true;
  }
  if (rule.test) {
    const tests = Array.isArray(rule.test) ? rule.test : [rule.test];
    if (tests.some((item) => STYLE_TEST_RE.test(String(item)))) {
      return true;
    }
  }
  const uses = normalizeUses(rule);
  return uses.some((item) => CSS_LOADER_RE.test(getLoaderName(item)));
}

/**
 * 计算 scope loader 插入位置：预处理器之前，否则 css-loader 之后。
 * @param {Array<string|{ loader?: string }>} uses - loader 列表
 * @returns {number} 插入下标；无法插入时返回 -1
 */
function resolveInsertIndex(uses) {
  const already = uses.some((item) => SCOPE_LOADER_RE.test(getLoaderName(item)));
  if (already) return -1;

  const preprocessorIdx = uses.findIndex((item) => (
    PREPROCESSOR_LOADER_RE.test(getLoaderName(item))
  ));
  if (preprocessorIdx !== -1) {
    return preprocessorIdx;
  }

  const cssIdx = uses.findIndex((item) => CSS_LOADER_RE.test(getLoaderName(item)));
  if (cssIdx !== -1) {
    return cssIdx + 1;
  }
  return -1;
}

/**
 * 向单条 webpack 规则注入 scope-style loader。
 * @param {import('webpack').RuleSetRule} rule - webpack 规则
 * @param {string} loaderPath - loader 绝对路径
 * @param {object} [loaderOptions] - loader options
 * @returns {void}
 */
function injectIntoRule(rule, loaderPath, loaderOptions) {
  if (!rule || typeof rule !== 'object') return;

  if (Array.isArray(rule.oneOf)) {
    rule.oneOf.forEach((child) => injectIntoRule(child, loaderPath, loaderOptions));
    return;
  }
  if (Array.isArray(rule.rules)) {
    rule.rules.forEach((child) => injectIntoRule(child, loaderPath, loaderOptions));
    return;
  }

  if (!isStyleRule(rule)) return;

  const uses = normalizeUses(rule);
  if (!uses.length) return;

  const insertAt = resolveInsertIndex(uses);
  if (insertAt < 0) return;

  uses.splice(insertAt, 0, {
    loader: loaderPath,
    options: loaderOptions || {},
  });

  // eslint-disable-next-line no-param-reassign
  rule.use = uses;
  // eslint-disable-next-line no-param-reassign
  delete rule.loader;
  // eslint-disable-next-line no-param-reassign
  delete rule.options;
}

/**
 * 遍历 webpack module.rules，向样式规则注入 scope loader。
 * @param {import('webpack').Configuration} config - webpack 配置
 * @param {object} [loaderOptions] - 传给 loader 的 options
 * @returns {import('webpack').Configuration} 原 config
 */
function injectScopeLoader(config, loaderOptions = {}) {
  const loaderPath = getScopeLoaderPath();
  if (!config.module) {
    // eslint-disable-next-line no-param-reassign
    config.module = {};
  }
  if (!config.module.rules) {
    // eslint-disable-next-line no-param-reassign
    config.module.rules = [];
  }
  config.module.rules.forEach((rule) => injectIntoRule(rule, loaderPath, loaderOptions));
  return config;
}

module.exports = {
  getScopeLoaderPath,
  getLoaderName,
  isStyleRule,
  normalizeUses,
  resolveInsertIndex,
  injectIntoRule,
  injectScopeLoader,
};
