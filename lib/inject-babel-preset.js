const path = require('path');
const fs = require('fs');
const {
  getLoaderName,
  normalizeUses,
} = require('./inject-scope-loader');
const { getScopePresetPath, loadScopePreset } = require('./resolve-preset');

const BABEL_LOADER_RE = /[\\/]babel-loader[\\/]|babel-loader/;
const SCOPE_PRESET_RE = /babel-preset-react-scope-style/;

/**
 * 从 presets 项中取出 preset 名称或路径字符串。
 * @param {unknown} item - Babel preset 项
 * @returns {string}
 */
function getPresetName(item) {
  if (!item) return '';
  if (typeof item === 'string') return item;
  if (Array.isArray(item)) {
    const first = item[0];
    if (typeof first === 'string') return first;
    if (typeof first === 'function' && first.name) return first.name;
    return '';
  }
  if (typeof item === 'function' && item.name) return item.name;
  return '';
}

/**
 * 判断 presets 列表是否已包含本包 preset。
 * @param {unknown} presets - Babel presets
 * @returns {boolean}
 */
function hasScopePreset(presets) {
  if (!Array.isArray(presets)) return false;
  const presetPath = getScopePresetPath();
  return presets.some((item) => {
    const name = getPresetName(item);
    if (name && (SCOPE_PRESET_RE.test(name) || path.resolve(name) === presetPath)) {
      return true;
    }
    const target = Array.isArray(item) ? item[0] : item;
    const preset = loadScopePreset();
    return target === preset || target === preset.default;
  });
}

/**
 * 尝试加载 babel 配置文件并检测是否已含本 preset。
 * @param {string} configFile - 配置文件绝对路径
 * @returns {boolean} 已包含时返回 true；无法判断时返回 false
 */
function configFileHasScopePreset(configFile) {
  if (!configFile || !fs.existsSync(configFile)) return false;
  try {
    // eslint-disable-next-line import/no-dynamic-require, global-require
    const loaded = require(configFile);
    const config = loaded && loaded.default ? loaded.default : loaded;
    return hasScopePreset(config && config.presets);
  } catch {
    return false;
  }
}

/**
 * 在项目根目录查找 babel.config.* / .babelrc* 是否已配置本 preset。
 * @param {string} [context] - 项目根目录
 * @returns {boolean}
 */
function projectBabelHasScopePreset(context) {
  if (!context) return false;
  const candidates = [
    'babel.config.js',
    'babel.config.cjs',
    'babel.config.mjs',
    'babel.config.json',
    '.babelrc',
    '.babelrc.js',
    '.babelrc.cjs',
    '.babelrc.json',
  ];
  return candidates.some((name) => {
    const file = path.join(context, name);
    if (!fs.existsSync(file)) return false;
    if (name.endsWith('.json') || name === '.babelrc') {
      try {
        const raw = fs.readFileSync(file, 'utf8');
        const json = JSON.parse(raw);
        return hasScopePreset(json.presets);
      } catch {
        return SCOPE_PRESET_RE.test(fs.readFileSync(file, 'utf8'));
      }
    }
    return configFileHasScopePreset(file);
  });
}

/**
 * 向单个 babel-loader use 项注入 preset（已存在则跳过）。
 * @param {string|{ loader?: string, options?: object }} useItem - use 项
 * @param {object} presetOptions - 传给 preset 的选项
 * @param {string} [context] - 项目根目录（用于探测 babel.config）
 * @returns {string|{ loader?: string, options?: object }}
 */
function injectPresetIntoBabelUseItem(useItem, presetOptions, context) {
  const loaderName = getLoaderName(useItem);
  if (!BABEL_LOADER_RE.test(loaderName)) {
    return useItem;
  }

  const item = typeof useItem === 'string'
    ? { loader: useItem, options: {} }
    : { ...useItem, options: { ...(useItem.options || {}) } };

  const { options } = item;

  if (hasScopePreset(options.presets)) {
    return item;
  }

  if (options.configFile) {
    const configFile = path.isAbsolute(options.configFile)
      ? options.configFile
      : path.resolve(context || process.cwd(), options.configFile);
    if (configFileHasScopePreset(configFile)) {
      return item;
    }
  } else if (options.babelrc !== false && projectBabelHasScopePreset(context)) {
    // 默认会读项目 babel 配置；若其中已有本 preset 则跳过，避免重复转换
    return item;
  }

  const presetEntry = Object.keys(presetOptions || {}).length
    ? [getScopePresetPath(), presetOptions]
    : getScopePresetPath();

  options.presets = [...(options.presets || []), presetEntry];
  item.options = options;
  return item;
}

/**
 * 向规则中的 babel-loader 注入本 preset。
 * @param {import('webpack').RuleSetRule} rule - webpack 规则
 * @param {object} presetOptions - preset 选项
 * @param {string} [context] - 项目根目录
 * @returns {void}
 */
function injectBabelIntoRule(rule, presetOptions, context) {
  if (!rule || typeof rule !== 'object') return;

  if (Array.isArray(rule.oneOf)) {
    rule.oneOf.forEach((child) => injectBabelIntoRule(child, presetOptions, context));
    return;
  }
  if (Array.isArray(rule.rules)) {
    rule.rules.forEach((child) => injectBabelIntoRule(child, presetOptions, context));
    return;
  }

  const uses = normalizeUses(rule);
  if (!uses.length) return;

  const nextUses = uses.map((item) => injectPresetIntoBabelUseItem(item, presetOptions, context));
  const changed = nextUses.some((item, idx) => item !== uses[idx]);
  if (!changed) return;

  // eslint-disable-next-line no-param-reassign
  rule.use = nextUses;
  // eslint-disable-next-line no-param-reassign
  delete rule.loader;
  // eslint-disable-next-line no-param-reassign
  delete rule.options;
}

/**
 * 遍历 webpack 配置，向 babel-loader 注入本 Babel preset。
 * @param {import('webpack').Configuration} config - webpack 配置
 * @param {boolean|object} [babel=true] - false 关闭；true 用空选项；对象为 ScopeStyleOptions
 * @returns {import('webpack').Configuration}
 */
function injectBabelPreset(config, babel = true) {
  if (babel === false) return config;

  const presetOptions = babel === true || babel == null ? {} : babel;
  const context = config.context || process.cwd();

  if (!config.module) {
    // eslint-disable-next-line no-param-reassign
    config.module = {};
  }
  if (!config.module.rules) {
    // eslint-disable-next-line no-param-reassign
    config.module.rules = [];
  }

  config.module.rules.forEach((rule) => injectBabelIntoRule(rule, presetOptions, context));
  return config;
}

module.exports = {
  getScopePresetPath,
  getPresetName,
  hasScopePreset,
  configFileHasScopePreset,
  projectBabelHasScopePreset,
  injectPresetIntoBabelUseItem,
  injectBabelIntoRule,
  injectBabelPreset,
};
