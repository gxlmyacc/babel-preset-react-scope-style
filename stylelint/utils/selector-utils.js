const selectorParser = require('postcss-selector-parser');

/**
 * 选择器是否含 CSS Modules 形式的 :global(...)。
 * @param {string} selectorText - 选择器文本
 * @returns {boolean}
 */
function hasFunctionalGlobal(selectorText) {
  if (!selectorText || !selectorText.trim()) return false;
  if (/:global\s*\(/.test(selectorText)) return true;
  try {
    let found = false;
    selectorParser((selectors) => {
      selectors.walk((node) => {
        if (found) return;
        if (node.type === 'pseudo' && node.value === ':global' && node.nodes && node.nodes.length > 0) {
          found = true;
        }
      });
    }).processSync(selectorText);
    return found;
  } catch (err) {
    return /:global\s*\(/.test(selectorText);
  }
}

/**
 * 选择器是否含误写的 :scoped 伪类。
 * @param {string} selectorText - 选择器文本
 * @returns {boolean}
 */
function hasScopedPseudoTypo(selectorText) {
  if (!selectorText || !selectorText.trim()) return false;
  try {
    let found = false;
    selectorParser((selectors) => {
      selectors.walk((node) => {
        if (found) return;
        if (node.type === 'pseudo' && node.value === ':scoped') {
          found = true;
        }
      });
    }).processSync(selectorText);
    return found;
  } catch (err) {
    return /:scoped\b/.test(selectorText);
  }
}

module.exports = {
  hasFunctionalGlobal,
  hasScopedPseudoTypo,
};
