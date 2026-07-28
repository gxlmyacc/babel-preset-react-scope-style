const path = require('path');

/**
 * 将 alias 键按长度降序排列，优先匹配更长前缀（如 react-dom 先于 react）。
 * @param {Record<string, string>} aliasMap - esbuild alias 配置
 * @returns {Array<[string, string]>}
 */
function sortAliasEntries(aliasMap) {
  return Object.entries(aliasMap || {}).sort((a, b) => b[0].length - a[0].length);
}

/**
 * 按 esbuild alias 规则解析模块路径。
 * @param {string} request - import 请求路径
 * @param {Record<string, string>} aliasMap - alias 配置
 * @returns {string|null} 解析后的绝对路径，未命中返回 null
 */
function resolveAliasRequest(request, aliasMap) {
  if (!request || request.startsWith('.')) {
    return null;
  }
  const entries = sortAliasEntries(aliasMap);
  // eslint-disable-next-line no-restricted-syntax
  for (const [key, target] of entries) {
    if (request === key) {
      return target;
    }
    if (request.startsWith(`${key}/`)) {
      return path.join(target, request.slice(key.length + 1));
    }
  }
  return null;
}

/**
 * 库模式下用 onResolve 模拟 esbuild 原生 alias（非 bundle 时 esbuild 不支持 alias 选项）。
 * @param {Record<string, string>} aliasMap - alias 配置
 * @returns {import('esbuild').Plugin|null}
 */
function createEsbuildAliasPlugin(aliasMap) {
  if (!aliasMap || !Object.keys(aliasMap).length) {
    return null;
  }

  return {
    name: 'react-scope-style-esbuild-alias',
    setup(build) {
      build.onResolve({ filter: /.*/ }, (args) => {
        const resolved = resolveAliasRequest(args.path, aliasMap);
        if (!resolved) {
          return null;
        }
        return { path: path.resolve(resolved) };
      });
    },
  };
}

/**
 * 将样式中的 alias 路径（@import / url()）替换为相对路径。
 * @param {string} value - 声明值或 import 参数
 * @param {string} fromDir - 当前样式文件目录
 * @param {Record<string, string>} aliasMap - alias 配置
 * @returns {string}
 */
function replaceStyleAliasInValue(value, fromDir, aliasMap) {
  const entries = sortAliasEntries(aliasMap);
  let next = value;
  // eslint-disable-next-line no-restricted-syntax
  for (const [key, target] of entries) {
    const rel = path.relative(fromDir, path.resolve(target)).replace(/\\/g, '/');
    const relPrefix = rel.startsWith('.') ? rel : `./${rel}`;
    next = next.split(key).join(relPrefix);
  }
  return next;
}

/**
 * 基于 esbuild 原生 alias 配置生成 PostCSS 插件（用于库模式样式）。
 * @param {Record<string, string>} aliasMap - alias 配置
 * @param {string} [filePath] - 样式源文件路径
 * @returns {import('postcss').Plugin[]}
 */
function createPostcssAliasPluginsFromMap(aliasMap, filePath) {
  if (!aliasMap || !Object.keys(aliasMap).length || !filePath) {
    return [];
  }
  const fromDir = path.dirname(filePath);
  const plugin = {
    postcssPlugin: 'react-scope-style-alias-map',
    Once(root) {
      root.walkAtRules('import', (rule) => {
        if (rule.params) {
          rule.params = replaceStyleAliasInValue(rule.params, fromDir, aliasMap);
        }
      });
      root.walkDecls((decl) => {
        if (decl.value && decl.value.includes('url(')) {
          decl.value = replaceStyleAliasInValue(decl.value, fromDir, aliasMap);
        }
      });
    },
  };
  return [plugin];
}

module.exports = {
  sortAliasEntries,
  resolveAliasRequest,
  createEsbuildAliasPlugin,
  replaceStyleAliasInValue,
  createPostcssAliasPluginsFromMap,
};
