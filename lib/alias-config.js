const path = require('path');
const { runPostcssPlugins } = require('./run-postcss-plugins');
const { createPostcssAliasPluginsFromMap } = require('../esbuild/lib-alias-plugin');

/**
 * 是否启用 alias-config 集成（目标项目需自行安装对应 npm 包）。
 * @param {boolean|object} [aliasConfig] - false 时禁用
 * @returns {boolean}
 */
function isAliasConfigEnabled(aliasConfig) {
  return aliasConfig !== false;
}

/**
 * 归一化 babel-plugin-alias-config / postcss-alias-config 选项。
 * @param {boolean|object} [aliasConfig] - 配置项
 * @returns {object}
 */
function normalizeAliasConfig(aliasConfig) {
  if (aliasConfig === true || aliasConfig === undefined) {
    return { findConfig: true };
  }
  if (!aliasConfig || typeof aliasConfig !== 'object') {
    return { findConfig: true };
  }
  return { findConfig: true, ...aliasConfig };
}

/**
 * 从候选目录解析可选 npm 包。
 * @param {string} moduleName - 包名或子路径
 * @param {string[]} searchDirs - 查找起点目录列表
 * @returns {*|null}
 */
function resolveOptionalPackage(moduleName, searchDirs) {
  // eslint-disable-next-line no-restricted-syntax
  for (const dir of searchDirs) {
    if (!dir) continue;
    try {
      return require(require.resolve(moduleName, { paths: [dir] }));
    } catch {
      // 继续尝试下一个目录
    }
  }
  return null;
}

/**
 * 收集 alias 插件的模块查找目录。
 * @param {string} rootDir - 项目根目录
 * @param {string} [fileDir] - 当前文件所在目录
 * @returns {string[]}
 */
function collectAliasSearchDirs(rootDir, fileDir) {
  const dirs = [];
  if (fileDir) dirs.push(fileDir);
  if (rootDir) dirs.push(rootDir);
  if (process.cwd()) dirs.push(process.cwd());
  return [...new Set(dirs)];
}

/**
 * 创建 babel-plugin-alias-config 插件项（未安装时返回空数组）。
 * @param {string} rootDir - 项目根目录
 * @param {boolean|object} [aliasConfig] - alias 配置
 * @returns {Array<[Function, object]>} Babel plugins 元组列表
 */
function createBabelAliasPlugins(rootDir, aliasConfig) {
  if (!isAliasConfigEnabled(aliasConfig)) {
    return [];
  }
  const plugin = resolveOptionalPackage('babel-plugin-alias-config', collectAliasSearchDirs(rootDir));
  if (!plugin) {
    return [];
  }
  const factory = plugin.default || plugin;
  return [[factory, normalizeAliasConfig(aliasConfig)]];
}

/**
 * 创建 postcss-alias-config 插件实例（未安装时返回空数组）。
 * @param {string} rootDir - 项目根目录
 * @param {string} [filePath] - 样式源文件路径
 * @param {boolean|object} [aliasConfig] - alias 配置
 * @returns {import('postcss').Plugin[]} PostCSS 插件列表
 */
function createPostcssAliasPlugins(rootDir, filePath, aliasConfig) {
  if (!isAliasConfigEnabled(aliasConfig)) {
    return [];
  }
  const searchDirs = collectAliasSearchDirs(rootDir, filePath ? path.dirname(filePath) : undefined);
  let factory = resolveOptionalPackage('postcss-alias-config/lib/postcss8', searchDirs);
  if (!factory) {
    factory = resolveOptionalPackage('postcss-alias-config', searchDirs);
  }
  if (!factory) {
    return [];
  }
  const createPlugin = factory.default || factory;
  return [createPlugin(normalizeAliasConfig(aliasConfig))];
}

/**
 * 组装含可选 alias 插件的 Babel transformSync 选项。
 * @param {object} params - 参数
 * @param {string} params.filename - 源文件路径
 * @param {Function} params.preset - babel-preset-react-scope-style
 * @param {object} params.babelOptions - preset 选项
 * @param {string} params.rootDir - 项目根目录
 * @param {boolean|object} [params.aliasConfig] - alias 配置
 * @param {boolean} [params.sourceMaps] - 是否生成 sourcemap
 * @returns {import('@babel/core').TransformOptions}
 */
function buildBabelTransformOptions({
  filename,
  preset,
  babelOptions,
  rootDir,
  aliasConfig,
  sourceMaps,
}) {
  const plugins = createBabelAliasPlugins(rootDir, aliasConfig);
  return {
    filename,
    plugins: plugins.length ? plugins : undefined,
    presets: [[preset, babelOptions]],
    babelrc: false,
    configFile: false,
    sourceMaps,
  };
}

/**
 * 对样式内容先执行 postcss-alias-config，再按需执行 scope 转换。
 * @param {string} content - CSS 文本（可为 sass 编译结果）
 * @param {object} params - 参数
 * @param {string} [params.query] - scope-style query
 * @param {string} params.rootDir - 项目根目录
 * @param {string} params.filePath - 样式源文件路径
 * @param {boolean|object} [params.aliasConfig] - alias 配置
 * @param {{ list: Array<{ scopeId: string, global: boolean }> }} [params.scopedItem] - 库模式 StyleScoped 项
 * @param {typeof import('./process-scope-css').processScopeStyleCss} params.processScopeStyleCss - scope 处理函数
 * @returns {Promise<string>}
 */
async function processStyleCss(content, {
  query,
  rootDir,
  filePath,
  aliasConfig,
  aliasMap,
  scopedItem,
  processScopeStyleCss,
}) {
  const aliasPlugins = [
    ...createPostcssAliasPluginsFromMap(aliasMap, filePath),
    ...createPostcssAliasPlugins(rootDir, filePath, aliasConfig),
  ];
  let css = content;
  if (aliasPlugins.length) {
    css = await runPostcssPlugins(css, aliasPlugins, { from: filePath });
  }

  if (scopedItem && scopedItem.list.length) {
    let output = css;
    // eslint-disable-next-line no-restricted-syntax
    for (const item of scopedItem.list) {
      const scopeQuery = item.global
        ? `?scope-style&scoped=true&global=true&id=${item.scopeId}`
        : `?scope-style&scoped=true&id=${item.scopeId}`;
      output = await processScopeStyleCss(output, scopeQuery);
    }
    scopedItem.handled = true;
    return output;
  }

  if (query) {
    return processScopeStyleCss(css, query);
  }

  return css;
}

module.exports = {
  isAliasConfigEnabled,
  normalizeAliasConfig,
  resolveOptionalPackage,
  collectAliasSearchDirs,
  createBabelAliasPlugins,
  createPostcssAliasPlugins,
  buildBabelTransformOptions,
  processStyleCss,
};
