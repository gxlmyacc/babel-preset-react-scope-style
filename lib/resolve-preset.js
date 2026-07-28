const path = require('path');

/**
 * 解析本包 Babel preset 的唯一运行时入口（统一走 `src`）。
 * 无入参。
 * @returns {string} preset 入口绝对路径
 */
function getScopePresetPath() {
  return path.join(__dirname, '../src/index.js');
}

/**
 * 加载本包 Babel preset 模块。
 * 无入参。
 * @returns {Function} Babel preset 工厂函数
 */
function loadScopePreset() {
  // eslint-disable-next-line import/no-dynamic-require, global-require
  return require(getScopePresetPath());
}

module.exports = {
  getScopePresetPath,
  loadScopePreset,
};
