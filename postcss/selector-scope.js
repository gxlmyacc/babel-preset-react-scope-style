const selectorParser = require('postcss-selector-parser');
const { unescapeValue } = require('postcss-selector-parser/dist/selectors/attribute');

/**
 * 判断该 Rule 是否应跳过作用域注入（如 @keyframes 内的关键帧）。
 * @param {import('postcss').Rule} rule - PostCSS 规则节点
 * @returns {boolean}
 */
function shouldSkipRule(rule) {
  let parent = rule.parent;
  while (parent) {
    if (parent.type === 'atrule') {
      const name = parent.name;
      if (name === 'keyframes' || name === '-webkit-keyframes' || name === '-moz-keyframes') {
        return true;
      }
    }
    parent = parent.parent;
  }
  return false;
}

/**
 * 构建 global 模式下用于匹配 scope 前缀的 attribute 节点。
 * @param {string} id - 作用域 id
 * @param {object} [spaces] - 空格配置
 * @returns {import('postcss-selector-parser').Selector['nodes'][0]}
 */
function createGlobalScopeAttribute(id, spaces = {}) {
  const { quoteMark, unescaped: value } = unescapeValue(id);
  return selectorParser.attribute({
    attribute: 'class',
    value,
    operator: '*=',
    spaces,
    raws: { value: id },
    quoteMark,
  });
}

/**
 * 构建 scoped 模式下的 scope class 节点。
 * @param {string} id - 作用域 class 名（不含前导点）
 * @param {object} [spaces] - 空格配置
 * @returns {import('postcss-selector-parser').ClassName}
 */
function createScopedClassName(id, spaces = {}) {
  return selectorParser.className({ value: id, spaces });
}

/**
 * 选择器列表中是否已包含与当前模式一致的 scope 标记。
 * @param {import('postcss-selector-parser').Selector} selector - 单条复合选择器
 * @param {string} id - 作用域 id
 * @param {boolean} isGlobal - 是否为 global 模式
 * @returns {boolean}
 */
function selectorAlreadyScoped(selector, id, isGlobal) {
  return selector.nodes.some((node) => {
    if (isGlobal) {
      return node.type === 'attribute'
        && node.attribute === 'class'
        && node.operator === '*='
        && (node.value === id || node.raws.value === id);
    }
    return node.type === 'class' && node.value === id;
  });
}

/**
 * 在复合选择器上插入 scope（默认加在最后一个可附着节点后；伪类之前）。
 * @param {import('postcss-selector-parser').Selector} selector - 复合选择器
 * @param {string} id - 作用域 id
 * @param {boolean} isGlobal - 是否 global 模式
 * @returns {void}
 */
function appendScopeToSelector(selector, id, isGlobal) {
  if (!selector.nodes.length || selectorAlreadyScoped(selector, id, isGlobal)) {
    return;
  }

  let idx = selector.nodes.length - 1;
  let lastNode;

  for (; idx > -1; idx -= 1) {
    const node = selector.nodes[idx];
    if (node.type !== 'pseudo' && node.type !== 'combinator') {
      let afterSpace = '';
      if (lastNode) {
        if (lastNode.type === 'combinator' && lastNode.value !== ' ') afterSpace = ' ';
        else if (lastNode.type === 'string' && lastNode.value !== ' ') afterSpace = ' ';
        else if (lastNode.type !== 'pseudo' && lastNode.spaces.before === '') afterSpace = ' ';
      }
      const newNode = isGlobal
        ? createGlobalScopeAttribute(id, { after: afterSpace })
        : createScopedClassName(id, { after: afterSpace });
      const originNode = selector.nodes[idx];
      if (originNode.type !== newNode.type || originNode.value !== newNode.value) {
        selector.nodes.splice(idx + 1, 0, newNode);
      }
      break;
    }
    lastNode = node;
  }
}

/**
 * 中间 :scope / :global 前是否为分隔式（组合符与标记之间有空格，对应裸块 * 占位语义）。
 * @param {import('postcss-selector-parser').Selector['nodes']} nodes - 复合选择器节点
 * @param {number} markerIdx - 标记伪类下标
 * @returns {boolean}
 */
function isSpacedMiddlePseudo(nodes, markerIdx) {
  return nodes[markerIdx - 1]?.type === 'combinator';
}

/**
 * 构建 *.scopeId 或 *[class*=scopeId] 占位节点（与嵌套裸 :scope / :global 块一致）。
 * @param {string} id - 作用域 id
 * @param {boolean} isGlobal - 是否 global 模式
 * @returns {import('postcss-selector-parser').Selector['nodes']}
 */
function createStarScopeCompound(id, isGlobal) {
  if (isGlobal) {
    return [selectorParser.universal(), createGlobalScopeAttribute(id)];
  }
  return [selectorParser.universal(), createScopedClassName(id)];
}

/**
 * 将 :scope 伪类替换为 scope class 或 global attribute 选择器。
 * 分隔式（前有空格组合符）替换为 *.scopeId；附着式替换为 &.scopeId 同类 class 节点。
 * @param {import('postcss-selector-parser').Selector} selector - 复合选择器
 * @param {string} id - 作用域 id
 * @param {boolean} isGlobal - 是否 global 模式
 * @returns {boolean} 是否做过替换
 */
function replaceScopePseudo(selector, id, isGlobal) {
  let replaced = false;
  const scopeNodes = [];

  selector.walk((node) => {
    if (node.type === 'pseudo' && node.value === ':scope') {
      scopeNodes.push(node);
    }
  });

  scopeNodes.reverse().forEach((node) => {
    const parent = node.parent;
    const index = parent.nodes.indexOf(node);
    if (isSpacedMiddlePseudo(parent.nodes, index)) {
      parent.nodes.splice(index, 1, ...createStarScopeCompound(id, isGlobal));
    } else {
      const replacement = isGlobal ? createGlobalScopeAttribute(id) : createScopedClassName(id);
      parent.nodes.splice(index, 1, replacement);
    }
    replaced = true;
  });

  return replaced;
}

/**
 * 是否为「整条规则不作用域」的行首 :global（仅支持 `:global` 或 `:global `，不支持 `:global(...)`）。
 * @param {string} selector - 选择器文本
 * @returns {boolean}
 */
function isLeadingGlobalRule(selector) {
  return /^:global(?:\s+|$)/.test(selector.trim()) && !/^:global\s*\(/.test(selector.trim());
}

/**
 * 去掉行首 :global，得到不参与作用域的选择器（用于 `:global .reset` 等）。
 * @param {string} selector - 原始选择器
 * @param {string} [globalSelector=''] - 替换 `:global` 关键字的内容（一般为空）
 * @returns {string}
 */
function stripLeadingGlobal(selector, globalSelector = '') {
  return selector
    .trim()
    .replace(/^:global\s+/, '')
    .replace(/^:global$/, globalSelector)
    .replace(/^:global/, globalSelector)
    .trim();
}

/**
 * 去掉单条复合选择器行首的 :global 伪类（不含 :global(...)）。
 * @param {import('postcss-selector-parser').Selector} sel - 复合选择器
 * @param {string} [globalSelector=''] - 裸 :global 替换内容
 * @returns {void}
 */
function stripLeadingGlobalPseudoFromCompound(sel, globalSelector = '') {
  const first = sel.nodes[0];
  if (!first || first.type !== 'pseudo' || first.value !== ':global') return;
  if (/^:global\s*\(/.test(sel.toString())) return;

  if (sel.nodes.length === 1) {
    const replacement = globalSelector || '';
    sel.removeAll();
    if (replacement) {
      selectorParser((parsed) => {
        parsed.each((inner) => {
          inner.nodes.forEach((n) => {
            sel.append(n.clone());
          });
        });
      }).processSync(replacement);
    }
    return;
  }

  sel.nodes.shift();
  while (sel.nodes.length && sel.nodes[0].type === 'combinator') {
    sel.nodes.shift();
  }
}

/**
 * 去掉逗号选择器列表中每条复合选择器行首的 :global（SCSS 在 :global 块内会为每段重复前缀）。
 * @param {string} selector - 选择器文本
 * @param {string} [globalSelector=''] - 裸 :global 替换内容
 * @returns {string}
 */
function stripLeadingGlobalFromAllSelectors(selector, globalSelector = '') {
  const normalized = selector.trim();
  if (!normalized) return selector;
  if (normalized === ':global') return stripLeadingGlobal(normalized, globalSelector);

  return selectorParser((selectors) => {
    selectors.each((sel) => {
      stripLeadingGlobalPseudoFromCompound(sel, globalSelector);
    });
  }).processSync(normalized);
}

/**
 * 查找复合选择器中作为「嵌套分界」的 :global 伪类下标（精确匹配 `:global`，不含 `:global(...)`）。
 * @param {import('postcss-selector-parser').Selector} selector - 复合选择器
 * @returns {number} 下标，不存在为 -1
 */
function findMiddleGlobalIndex(selector) {
  return selector.nodes.findIndex(
    (n) => n.type === 'pseudo' && n.value === ':global'
  );
}

/**
 * 去掉节点列表末尾的组合符。
 * @param {import('postcss-selector-parser').Selector['nodes']} nodes - 选择器片段节点
 * @returns {import('postcss-selector-parser').Selector['nodes']}
 */
function trimTrailingCombinators(nodes) {
  const copy = [...nodes];
  while (copy.length && copy[copy.length - 1].type === 'combinator') {
    copy.pop();
  }
  return copy;
}

/**
 * 去掉节点列表开头的组合符。
 * @param {import('postcss-selector-parser').Selector['nodes']} nodes - 选择器片段节点
 * @returns {import('postcss-selector-parser').Selector['nodes']}
 */
function trimLeadingCombinators(nodes) {
  const copy = [...nodes];
  while (copy.length && copy[0].type === 'combinator') {
    copy.shift();
  }
  return copy;
}

/**
 * 合并已作用域的前缀与 :global 之后的后缀（中间仅保留一个空格组合符）。
 * @param {import('postcss-selector-parser').Selector['nodes']} beforeNodes - :global 之前（已加 scope）
 * @param {import('postcss-selector-parser').Selector['nodes']} afterNodes - :global 之后
 * @returns {import('postcss-selector-parser').Selector['nodes']}
 */
function mergeScopedBeforeAndGlobalAfter(beforeNodes, afterNodes) {
  const merged = [...beforeNodes];
  const rest = trimLeadingCombinators(afterNodes);
  if (!rest.length) return merged;
  if (merged.length && rest[0].type !== 'combinator') {
    merged.push(selectorParser.combinator({ value: ' ' }));
  }
  merged.push(...rest);
  return merged;
}

/**
 * 处理第一个中间 :global：仅对第一个 :global 之前的前缀加 scope，其后片段原样保留（不含 :global）。
 * @param {import('postcss-selector-parser').Selector} selector - 复合选择器
 * @param {string} id - 作用域 id
 * @param {boolean} isGlobal - 是否 global 模式
 * @returns {void}
 */
/**
 * 前缀片段是否含可挂 scope 的选择器节点（不含纯组合符）。
 * @param {import('postcss-selector-parser').Selector['nodes']} nodes - 节点列表
 * @returns {boolean}
 */
function hasScopeableSelectorNodes(nodes) {
  return nodes.some((n) => n.type !== 'combinator');
}

/**
 * 处理中间 :global：分隔式插入 *.scopeId；附着式在前缀挂 scope 后去掉 :global。
 * @param {import('postcss-selector-parser').Selector} selector - 复合选择器
 * @param {string} id - 作用域 id
 * @param {boolean} isGlobal - 是否 global 模式
 * @param {{ stripOnly?: boolean }} [options] - stripOnly 时仅去掉 :global（:scope 已定时后缀不挂 scope）
 * @returns {void}
 */
function processMiddleGlobalMarker(selector, id, isGlobal, { stripOnly = false } = {}) {
  const globalIdx = findMiddleGlobalIndex(selector);
  if (globalIdx <= 0) return;

  const beforeNodes = trimTrailingCombinators(selector.nodes.slice(0, globalIdx));
  const rest = trimLeadingCombinators(selector.nodes.slice(globalIdx + 1));
  const isSpaced = isSpacedMiddlePseudo(selector.nodes, globalIdx);

  if (stripOnly) {
    if (!rest.length) {
      selector.nodes = beforeNodes;
      return;
    }
    selector.nodes = mergeScopedBeforeAndGlobalAfter(beforeNodes, rest);
    return;
  }

  if (isSpaced) {
    if (!hasScopeableSelectorNodes(beforeNodes)) {
      if (!rest.length) return;
      selector.nodes = [selectorParser.combinator({ value: ' ' }), ...rest];
      return;
    }
    const starNodes = createStarScopeCompound(id, isGlobal);
    if (!rest.length) {
      const beforePart = selectorParser.selector({ value: '', nodes: beforeNodes });
      if (!replaceScopePseudo(beforePart, id, isGlobal)) {
        appendScopeToSelector(beforePart, id, isGlobal);
      }
      selector.nodes = beforePart.nodes;
      return;
    }
    selector.nodes = mergeScopedBeforeAndGlobalAfter(beforeNodes, [
      ...starNodes,
      selectorParser.combinator({ value: ' ' }),
      ...rest,
    ]);
    return;
  }

  if (!beforeNodes.length) return;

  const beforePart = selectorParser.selector({ value: '', nodes: beforeNodes });
  if (!replaceScopePseudo(beforePart, id, isGlobal)) {
    appendScopeToSelector(beforePart, id, isGlobal);
  }

  if (!rest.length) {
    selector.nodes = beforePart.nodes;
    return;
  }

  selector.nodes = mergeScopedBeforeAndGlobalAfter(beforePart.nodes, rest);
}

/**
 * 处理第一个中间 :global（分隔式 *.scopeId，附着式前缀挂 scope）。
 * @param {import('postcss-selector-parser').Selector} selector - 复合选择器
 * @param {string} id - 作用域 id
 * @param {boolean} isGlobal - 是否 global 模式
 * @returns {void}
 */
function scopeSelectorBeforeMiddleGlobal(selector, id, isGlobal) {
  processMiddleGlobalMarker(selector, id, isGlobal, { stripOnly: false });
}

/**
 * 处理后续中间 :global，或 stripOnly 模式下仅剥离 :global 标记。
 * @param {import('postcss-selector-parser').Selector} selector - 复合选择器
 * @param {{ stripOnly?: boolean, id?: string, isGlobal?: boolean }} [options] - 处理选项
 * @returns {void}
 */
function replaceMiddleGlobalWithStar(selector, options = {}) {
  const { stripOnly = true, id = '', isGlobal = false } = options;
  processMiddleGlobalMarker(selector, id, isGlobal, { stripOnly });
}

/** @deprecated 使用 replaceMiddleGlobalWithStar */
function stripMiddleGlobalPseudo(selector) {
  replaceMiddleGlobalWithStar(selector);
}

/**
 * 对单条复合选择器施加作用域（:scope 优先；否则处理中间 :global 或默认末尾追加）。
 * @param {import('postcss-selector-parser').Selector} selector - 复合选择器
 * @param {{ id: string, isGlobal: boolean }} options - 作用域选项
 * @returns {void}
 */
function scopeCompoundSelector(selector, options) {
  const { id, isGlobal } = options;
  const hasScope = selector.nodes.some((n) => n.type === 'pseudo' && n.value === ':scope');

  if (hasScope) {
    replaceScopePseudo(selector, id, isGlobal);
    while (findMiddleGlobalIndex(selector) > 0) {
      replaceMiddleGlobalWithStar(selector, { stripOnly: true });
    }
    return;
  }

  if (findMiddleGlobalIndex(selector) > 0) {
    const globalIdx = findMiddleGlobalIndex(selector);
    const beforeNodes = trimTrailingCombinators(selector.nodes.slice(0, globalIdx));
    const rest = trimLeadingCombinators(selector.nodes.slice(globalIdx + 1));
    if (!hasScopeableSelectorNodes(beforeNodes) && rest.length) {
      selector.nodes = [selectorParser.combinator({ value: ' ' }), ...rest];
    } else {
      scopeSelectorBeforeMiddleGlobal(selector, id, isGlobal);
    }
    while (findMiddleGlobalIndex(selector) > 0) {
      replaceMiddleGlobalWithStar(selector, { stripOnly: false, id, isGlobal });
    }
    return;
  }

  appendScopeToSelector(selector, id, isGlobal);
}

/**
 * 去掉选择器中的 :global 标记（行首、中间、附着式 .x:global），不追加 scope。
 * 用于 :global 嵌套子树内 Sass 展平后的扁平规则（如 .card:global .title）。
 * @param {string} selector - 选择器文本
 * @param {string} [globalSelector=''] - 行首裸 :global 的替换内容
 * @returns {string}
 */
function stripGlobalMarkersFromSelector(selector, globalSelector = '') {
  const normalized = selector.trim();
  if (!normalized) return selector;

  if (isLeadingGlobalRule(normalized)) {
    return stripLeadingGlobalFromAllSelectors(normalized, globalSelector);
  }

  return selectorParser((selectors) => {
    selectors.each((sel) => {
      while (findMiddleGlobalIndex(sel) > 0) {
        stripMiddleGlobalMarkerOnly(sel);
      }
    });
  }).processSync(normalized);
}

/**
 * 去掉中间 :global（不插入 *），仅用于已在 * 占位 global 子树内的扁平选择器清理。
 * @param {import('postcss-selector-parser').Selector} selector - 复合选择器
 * @returns {void}
 */
function stripMiddleGlobalMarkerOnly(selector) {
  const globalIdx = findMiddleGlobalIndex(selector);
  if (globalIdx <= 0) return;

  const beforeNodes = trimTrailingCombinators(selector.nodes.slice(0, globalIdx));
  const afterNodes = selector.nodes.slice(globalIdx + 1);
  selector.nodes = mergeScopedBeforeAndGlobalAfter(beforeNodes, afterNodes);
}

/**
 * 对单条 CSS 选择器字符串施加作用域（含 :scope、:global）。
 * @param {string} selector - 选择器文本
 * @param {{ id: string, isGlobal: boolean, globalSelector?: string }} options - 作用域选项
 * @returns {string}
 */
function scopeSelector(selector, options) {
  const { id, isGlobal, globalSelector = '' } = options;
  const normalized = selector.trim();
  if (!normalized) return selector;

  if (isLeadingGlobalRule(normalized)) {
    return stripLeadingGlobalFromAllSelectors(normalized, globalSelector);
  }

  return selectorParser((selectors) => {
    selectors.each((sel) => {
      scopeCompoundSelector(sel, { id, isGlobal });
    });
  }).processSync(normalized);
}

module.exports = {
  shouldSkipRule,
  scopeSelector,
  stripGlobalMarkersFromSelector,
  isLeadingGlobalRule,
  stripLeadingGlobal,
  stripLeadingGlobalFromAllSelectors,
  /** @internal 供单测覆盖内部分支 */
  appendScopeToSelector,
  selectorAlreadyScoped,
  replaceMiddleGlobalWithStar,
  stripMiddleGlobalPseudo,
  scopeSelectorBeforeMiddleGlobal,
};
