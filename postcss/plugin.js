const selectorParser = require('postcss-selector-parser');
const { unescapeValue } = require('postcss-selector-parser/dist/selectors/attribute');
const { createScopeQuery, isFunction } = require('../src/utils');

const URL_PATTERNS = [
  /(url\(\s*['"]?)([^"')]+)(["']?\s*\))/g
];

function getNodePathFile(node) {
  return node.source && node.source.input && node.source.input.file;
}

function normalizeOpts(opts) {
  const calcOrder = opt => {
    if (!opt.scoped || !opt.id) {
      return -1;
    }
    return opt.global ? 0 : 1;
  };
  opts.sort((a, b) => calcOrder(a) - calcOrder(b));
  let map = {};
  let findGlobal = false;
  for (let i = opts.length - 1; i >= 0; i--) {
    let item = opts[i];
    if (map[item.id] || (item.global && findGlobal)) {
      opts.splice(i, 1);
      continue;
    }
    if (item.global) findGlobal = true;
    map[item.id] = true;
  }
}

function normalizeNodes(nodes) {
  nodes.sort((a, b) => (a.name === 'import' ? -1 : 1) - (b.name === 'import' ? -1 : 1));
  const map = {};
  for (let i = nodes.length - 1; i >= 0; i--) {
    let node = nodes[i];
    if (node.name === 'import') {
      if (node.params) {
        if (map[node.params]) {
          nodes.splice(i, 1);
          continue;
        }
        map[node.params] = true;
      }
    }
  }
}
/**
 * @typedef {{
 *   scoped?: boolean,
 *   global?: boolean,
 *   id?: string,
 * }} PluginOptions
 */

/**
 *
 * @param {PluginOptions|PluginOptions[]|((root: any) => (PluginOptions|PluginOptions[]))} pluginOptions
 * @returns
 */
const plugin = function (pluginOptions) {
  // pluginOptions = pluginOptions || [
  //   {
  //     scoped: true,
  //     global: true,
  //     id: 'v-ewp-'
  //   },
  //   {
  //     scoped: true,
  //     global: false,
  //     id: 'v-123456678'
  //   },
  //   {
  //     scoped: true,
  //     global: false,
  //     id: 'v-99999999'
  //   }
  // ];
  pluginOptions = pluginOptions || {};
  return function (root, helpers) {
    let opts = typeof pluginOptions === 'function'
      ? pluginOptions(root)
      : pluginOptions;
    if (!opts) {
      return;
    }
    if (!Array.isArray(opts)) opts = [opts];

    normalizeOpts(opts);

    const options = require('../src/options');

    let scopeTemplateList = [];


    opts.forEach((opt, i) => {
      let { scoped, id = '', global: isGlobal, globalSelector = '' } = opt;

      let scopeTemplate = scopeTemplateList[0];

      if (scopeTemplate) {
        scopeTemplateList.push({
          opt,
          result: scopeTemplate.result.replaceAll(scopeTemplate.opt.id, id)
        });
        return;
      }

      const { scopeRegx } = options;

      const scopeFn = options.scopeFn || (isFunction(options.scope) ? options.scope : null);
      const replacePattern = (node, key) => {
        const filename = getNodePathFile(node);
        const pattern = URL_PATTERNS.find(pattern => pattern.test(node[key]));
        if (!pattern) return;
        node[key] = node[key].replace(pattern, (matched, before, url, after) => {
          const [matched1, , scoped] = url.match(scopeRegx) || [];
          if (!matched1) return matched;

          if (!id || !['?scoped'].includes(scoped)) {
            if (scopeFn) {
              matched = `${before}${
                url.replace(scopeRegx, (match, p1) => scopeFn(p1, '', { filename, source: url, scopeId: '' }))
              }${after}`;
            }
            return matched;
          }
          const query = createScopeQuery(id, isGlobal);
          const newUrl = url.replace(scopeRegx, (match, p1) => {
            if (!scopeFn) return p1 + query;
            return scopeFn(p1, query, {
              filename,
              source: url,
              scopeId: id,
              global: isGlobal
            });
          });

          const result = node[key].replace(matched, `${before}${newUrl}${after}`);
          return result;
        });
      };

      root.walkAtRules('import', rule => replacePattern(rule, 'params'));

      if (!scoped || !id) return;

      root.each(function rewriteSelector(node) {
        if (!node.selector) {
          if (node.type === 'atrule' && node.name === 'media') {
            node.each(rewriteSelector);
          }
          return;
        }
        if (node.selector.startsWith(':global')) {
          node.selector = node.selector.replace(/:global/, globalSelector).replace(/:global/g, '').trim();
        } else if (node.selector.includes(':scope')) {
          node.selector = node.selector.replace(/:scope/, isGlobal
            ? `[class*=${id}]`
            : '.' + id).replace(/:scope/g, '');
        } else {
          node.selector = selectorParser(function (selectors) {
            selectors.each(function (selector) {
              if (!selector.nodes.length) return;

              if (isGlobal && selector.nodes.some(node => node.type === 'attribute' && node.value === id)) {
                return;
              }

              let idx = selector.nodes.findIndex(n => n.type === 'combinator' && n.value === '>>>');
              let lastNode;
              if (idx < 0) idx = selector.nodes.length - 1;
              else {
                selector.nodes.splice(idx, 1);
                lastNode = selector.nodes[idx];
                idx--;
              }
              for (; idx > -1; idx--) {
                let node = selector.nodes[idx];
                if (node.type !== 'pseudo' && node.type !== 'combinator') {
                  let afterSpace = '';
                  if (lastNode) {
                    if (lastNode.type === 'combinator' && lastNode.value !== ' ') afterSpace = ' ';
                    else if (lastNode.type === 'string' && lastNode.value !== ' ') afterSpace = ' ';
                    else if (lastNode.type !== 'pseudo' && lastNode.spaces.before === '') afterSpace = ' ';
                  }
                  let newNode;
                  if (isGlobal) {
                    let { quoteMark, unescaped: value } = unescapeValue(id);
                    newNode = selectorParser.attribute({
                      attribute: 'class',
                      value,
                      operator: '*=',
                      spaces: { after: afterSpace },
                      raws: { value: id },
                      quoteMark
                    });
                  } else {
                    newNode = selectorParser.className({ value: id, spaces: { after: afterSpace } });
                  }
                  const originNode = selector.nodes[idx];
                  if (originNode.type !== newNode.type || originNode.value !== newNode.value) {
                    selector.nodes.splice(idx + 1, 0, newNode);
                  }
                  break;
                }
                lastNode = node;
              }
            });
          }).processSync(node.selector.replace('> > >', '>>>'));
        }
      });

      if (opt.id && !opt.global) {
        scopeTemplateList.push({ opt, result: root.toString() });
      }
    });
    if (scopeTemplateList.length > 1 && helpers && helpers.parse) {
      const appendResult = scopeTemplateList.map((v, i) => (i ? v.result : '')).join('\n').trim();
      const nodes = helpers.parse('\n' + appendResult);
      root.nodes = root.nodes.concat(nodes.nodes);
      normalizeNodes(root.nodes);
    }
  };
};

plugin.id = 'postcss-scope-style-add-id';

module.exports = plugin;
