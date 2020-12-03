const postcss = require('postcss');
const selectorParser = require('postcss-selector-parser');

module.exports = postcss.plugin('scope-style-add-id', function (opts) {
  // opts = opts || {
  //   scoped: true,
  //   // global: true,
  //   id: 'v-ewp-xxxxx'
  // };
  opts = opts || {};
  return function (root) {
    let scoped; let id; let isGlobal; let globalSelector = '';
    if (typeof opts === 'function') {
      let _opts = opts(root);
      scoped = _opts.scoped;
      id = _opts.id;
      isGlobal = _opts.global;
      globalSelector = _opts.globalSelector || '';
    } else {
      scoped = opts.scoped;
      id = opts.id;
      isGlobal = opts.global;
      globalSelector = opts.globalSelector || '';
    }
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
                let newNode = isGlobal
                  ? selectorParser.attribute({ attribute: 'class', value: id, operator: '*=', spaces: { after: afterSpace } })
                  : selectorParser.className({ value: id, spaces: { after: afterSpace } });
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
});
