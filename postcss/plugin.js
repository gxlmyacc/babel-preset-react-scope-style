const selectorParser = require('postcss-selector-parser');
const { unescapeValue } = require('postcss-selector-parser/dist/selectors/attribute');
const { createScopeQuery, isFunction } = require('../src/utils');

const URL_PATTERNS = [
  /(url\(\s*['"]?)([^"')]+)(["']?\s*\))/g
];

function getNodePathFile(node) {
  return node.source && node.source.input && node.source.input.file;
}

const plugin = function (opts) {
  // opts = opts || {
  //   scoped: true,
  //   global: true,
  //   id: 'v-ewp-'
  // };
  opts = opts || {};
  return function (root) {
    let scoped; let id; let isGlobal; let globalSelector = '';
    if (typeof opts === 'function') {
      let _opts = opts(root);
      scoped = _opts.scoped;
      id = _opts.id || '';
      isGlobal = _opts.global;
      globalSelector = _opts.globalSelector || '';
    } else {
      scoped = opts.scoped;
      id = opts.id || '';
      isGlobal = opts.global;
      globalSelector = opts.globalSelector || '';
    }
    const options = require('../src/options');
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
        node.selector = node.selector.replace(/:global/g, globalSelector).trim();
      } else if (node.selector.includes(':scope')) {
        node.selector = node.selector.replace(/:scope/g, isGlobal
          ? `[class*=${id}]`
          : '.' + id);
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
                selector.nodes.splice(idx + 1, 0, newNode);
                break;
              }
              lastNode = node;
            }
          });
        }).processSync(node.selector.replace('> > >', '>>>'));
      }
    });
  };
};

plugin.id = 'postcss-scope-style-add-id';

module.exports = plugin;
