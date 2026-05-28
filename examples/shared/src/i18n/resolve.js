import en from './locales/en';
import zh from './locales/zh';

const catalogs = { en, zh };

/**
 * 按路径解析文案；路径不存在时回退到英文。
 * @param {string} locale - 语言代码
 * @param {string} path - 点分路径，如 demos.scoped-basic.title
 * @returns {string} 文案
 */
export function resolveMessage(locale, path) {
  const keys = path.split('.');
  let node = catalogs[locale] || catalogs.en;
  for (let i = 0; i < keys.length; i += 1) {
    if (node == null || typeof node !== 'object') {
      node = undefined;
      break;
    }
    node = node[keys[i]];
  }
  if (node === undefined && locale !== 'en') {
    return resolveMessage('en', path);
  }
  if (typeof node === 'string') return node;
  return path;
}

export { catalogs };
