const postcss = require('postcss');
const { shouldSkipRule } = require('./selector-scope');

/**
 * 判断 selector 是否含显式作用域控制（:scope / :global，不含已废弃的 >>>）。
 * @param {string} selector - 选择器文本
 * @returns {boolean}
 */
function hasExplicitScopeControl(selector) {
  const s = selector.trim();
  if (s.includes(':scope')) return true;
  if (/^:global(?:\s|$)/.test(s) && !/^:global\s*\(/.test(s)) return true;
  if (/(?:^|\s):global(?:\s|$)/.test(s)) return true;
  return false;
}

/**
 * Rule 是否无直接嵌套子 rule（Rule 树叶子）。
 * @param {import('postcss').Rule} rule - PostCSS 规则节点
 * @returns {boolean}
 */
function isRuleTreeLeaf(rule) {
  let hasChildRule = false;
  rule.each((child) => {
    if (child.type === 'rule') hasChildRule = true;
  });
  return !hasChildRule;
}

/**
 * 是否为 global 嵌套包装块选择器（裸 :global、&:global 等，非 :global(...) 函数式）。
 * @param {string} selector - 选择器文本
 * @returns {boolean}
 */
function isGlobalNestingWrapperSelector(selector) {
  const s = selector.trim();
  return s === ':global' || s === '&:global' || s === '& :global';
}

/**
 * 是否为附着式 .prefix:global 的 global 嵌套包装 rule（含子 rule）。
 * @param {import('postcss').Rule} rule - PostCSS 规则节点
 * @returns {boolean}
 */
function isAttachedGlobalNestingWrapper(rule) {
  if (!rule.selector) return false;
  const s = rule.selector.trim();
  if (isGlobalNestingWrapperSelector(s)) return false;
  if (/^:global\s*\(/.test(s)) return false;
  if (!/^.+:global$/.test(s)) return false;
  let hasChildRule = false;
  rule.each((child) => {
    if (child.type === 'rule') hasChildRule = true;
  });
  return hasChildRule;
}

/**
 * 去掉附着式嵌套包装选择器末尾的 :global（.wrap:global → .wrap）。
 * @param {string} selector - 选择器文本
 * @returns {string}
 */
function stripAttachedGlobalFromSelector(selector) {
  return selector.trim().slice(0, -':global'.length);
}

/**
 * 是否为仅作 global 段容器的包装 rule（含裸 :global / &:global 且含子 rule）。
 * @param {import('postcss').Rule} rule - PostCSS 规则节点
 * @returns {boolean}
 */
function isBareGlobalWrapper(rule) {
  if (!rule.selector) return false;
  if (!isGlobalNestingWrapperSelector(rule.selector)) return false;
  let hasChildRule = false;
  rule.each((child) => {
    if (child.type === 'rule') hasChildRule = true;
  });
  return hasChildRule;
}

/**
 * 是否为仅作 :scope 段容器的包装 rule（selector 字面量为 :scope 且含子 rule）。
 * @param {import('postcss').Rule} rule - PostCSS 规则节点
 * @returns {boolean}
 */
function isBareScopeWrapper(rule) {
  if (!rule.selector) return false;
  if (rule.selector.trim() !== ':scope') return false;
  let hasChildRule = false;
  rule.each((child) => {
    if (child.type === 'rule') hasChildRule = true;
  });
  return hasChildRule;
}

/**
 * 当前 rule 是否位于 :global 包装块子树内（祖先含 selector 为 :global 的 rule）。
 * @param {import('postcss').Rule} rule - PostCSS 规则节点
 * @returns {boolean}
 */
/**
 * 选择器是否表示 global 嵌套段（含替换后的 & 占位、&:global、.x:global 等）。
 * @param {string} selector - 选择器文本
 * @returns {boolean}
 */
function isGlobalSegmentSelector(selector) {
  const s = selector.trim();
  if (s === '&' || s === ':global') return true;
  if (s.includes(':global') && !/^:global\s*\(/.test(s)) return true;
  return false;
}

/**
 * 当前 rule 是否位于 global 嵌套段子树内。
 * @param {import('postcss').Rule} rule - PostCSS 规则节点
 * @returns {boolean}
 */
function isInGlobalSubtree(rule) {
  let parent = rule.parent;
  while (parent) {
    if (parent.type === 'rule' && parent.selector) {
      const sel = parent.selector.trim();
      if (sel === ':scope' || (sel.includes(':scope') && !sel.includes(':global'))) {
        return false;
      }
      if (isGlobalSegmentSelector(sel)) return true;
    }
    parent = parent.parent;
  }
  return false;
}

/**
 * 选择器是否为附着式 :scope（&:scope、.x:scope），不含裸 :scope 包装块。
 * @param {string} selector - 选择器文本
 * @returns {boolean}
 */
function hasAttachedScopePseudo(selector) {
  const s = selector.trim();
  if (s === ':scope') return false;
  return s.includes(':scope');
}

/**
 * 该 rule 的选择器是否已在链上建立 :scope 锚点（含裸/附着 :scope，或已替换为 scope class）。
 * @param {string} selector - 选择器文本
 * @param {{ id?: string, isGlobal?: boolean }} [scopeOpts] - scope 参数
 * @returns {boolean}
 */
function isScopeAnchorSelector(selector, scopeOpts = {}) {
  const s = selector.trim();
  if (s === ':scope' || s.includes(':scope')) return true;
  const { id = '', isGlobal = false } = scopeOpts;
  if (!id) return false;
  if (isGlobal) {
    return s.includes(`[class*=${id}]`) || s.includes(`[class*="${id}"]`);
  }
  return s.includes(`.${id}`);
}

/**
 * 祖先链上是否已有 :scope 锚点；有则其后代叶子不再重复挂 scope。
 * @param {import('postcss').Rule} rule - 当前 rule
 * @param {{ id?: string, isGlobal?: boolean }} [scopeOpts] - 与 scopeSelector 一致的 scope 参数
 * @returns {boolean}
 */
function isUnderScopeAnchorAncestor(rule, scopeOpts = {}) {
  let parent = rule.parent;
  while (parent) {
    if (parent.type === 'rule' && parent.selector) {
      if (isScopeAnchorSelector(parent.selector, scopeOpts)) return true;
    }
    parent = parent.parent;
  }
  return false;
}

/**
 * 是否应对该 rule 调用 scopeSelector。
 * @param {import('postcss').Rule} rule - PostCSS 规则节点
 * @param {{ id?: string, isGlobal?: boolean }} [scopeOpts] - 当前 scope 上下文
 * @returns {boolean}
 */
function shouldApplyScope(rule, scopeOpts = {}) {
  if (!rule.selector || shouldSkipRule(rule)) return false;
  if (isBareGlobalWrapper(rule) || isBareScopeWrapper(rule)) return false;
  if (hasExplicitScopeControl(rule.selector)) return true;
  if (isInGlobalSubtree(rule)) return false;
  if (!isRuleTreeLeaf(rule)) return false;
  if (isUnderScopeAnchorAncestor(rule, scopeOpts)) return false;
  return true;
}

/**
 * 上提父 rule 下裸 :global 包装块的子节点。
 * @param {import('postcss').Rule} parentRule - 父 rule
 * @param {':global'} marker - 包装块选择器字面量
 * @returns {void}
 */
function unwrapBareMarkerWrapperUnder(parentRule, marker) {
  const toUnwrap = [];
  parentRule.each((child) => {
    if (child.type === 'rule' && child.selector && child.selector.trim() === marker) {
      toUnwrap.push(child);
    }
  });
  toUnwrap.forEach((child) => {
    const clones = [];
    child.each((grand) => {
      clones.push(grand.clone());
    });
    clones.forEach((node) => {
      parentRule.insertBefore(child, node);
    });
    child.remove();
  });
}

/**
 * 在 global 子树内去掉冗余的嵌套 :global 包装（上提子节点）。
 * @param {import('postcss').Rule} parentRule - 父 rule
 * @returns {void}
 */
function unwrapRedundantNestedGlobalUnder(parentRule) {
  unwrapBareMarkerWrapperUnder(parentRule, ':global');
}

/**
 * 递归处理全树的冗余嵌套 :global（scope 前：仅 global 子树内再嵌 :global）。
 * @param {import('postcss').Root} root - CSS 根
 * @returns {void}
 */
function unwrapAllRedundantNestedGlobal(root) {
  root.walkRules((rule) => {
    if (rule.selector && rule.selector.trim() === ':global') {
      unwrapRedundantNestedGlobalUnder(rule);
    }
    if (isInGlobalSubtree(rule)) {
      unwrapRedundantNestedGlobalUnder(rule);
    }
  });
}

/**
 * 是否已有 &:scope / :scope 子 rule 承载声明（避免重复包裹）。
 * @param {import('postcss').Rule} rule - 父 rule
 * @returns {boolean}
 */
function hasScopeDeclWrapperChild(rule) {
  let found = false;
  rule.each((child) => {
    if (child.type !== 'rule') return;
    const sel = child.selector.trim();
    if (sel !== ':scope' && sel !== '&:scope' && !/^&\s*:scope$/.test(sel)) return;
    let innerHasRule = false;
    child.each((n) => {
      if (n.type === 'rule') innerHasRule = true;
    });
    if (!innerHasRule && child.nodes.some((n) => n.type === 'decl')) found = true;
  });
  return found;
}

/**
 * 将非叶子 rule 上的声明迁入新建的 &:scope 子 rule。
 * @param {import('postcss').Rule} rule - 含 decls 与子 rule 的父 rule
 * @returns {void}
 */
function wrapDeclsInAmpersandScope(rule) {
  if (isRuleTreeLeaf(rule)) return;
  if (rule.selector && hasExplicitScopeControl(rule.selector)) return;
  if (hasScopeDeclWrapperChild(rule)) return;

  const decls = [];
  rule.each((child) => {
    if (child.type === 'decl') decls.push(child);
  });
  if (!decls.length) return;

  const scopeRule = postcss.rule({ selector: '&:scope' });
  decls.forEach((decl) => {
    scopeRule.append(decl.clone());
    decl.remove();
  });

  rule.each((child) => {
    if (child.type === 'rule') {
      rule.insertBefore(child, scopeRule);
      return false;
    }
  });
}

/**
 * 嵌套作用域 pre-pass：非叶子声明包入 &:scope（裸 :global/:scope 在 scope 后统一改为 &）。
 * @param {import('postcss').Root} root - CSS 根
 * @returns {void}
 */
function runNestingPrepass(root) {
  root.walkRules((rule) => {
    wrapDeclsInAmpersandScope(rule);
  });
}

/** scope 后改为 & 占位的裸 :scope 包装（:global 类包装见 isGlobalNestingWrapperSelector） */
const BARE_SCOPE_NESTING_MARKER = ':scope';

/**
 * 裸 :scope 包装块替换为带 scope 的 &（与 &:scope 展平一致）；:global 仍为无 scope 的 &。
 * @param {string} scopeId - 作用域 id
 * @param {boolean} isGlobal - 是否 global 模式
 * @returns {string}
 */
function bareScopeMarkerToAmpersand(scopeId, isGlobal) {
  if (isGlobal) {
    return `&[class*=${scopeId}]`;
  }
  return `&.${scopeId}`;
}

/**
 * scope 后将裸 :global / :scope 包装块改为 & 占位（:scope 占位须带 scope class）。
 * @param {import('postcss').Root} root - CSS 根
 * @param {{ id?: string, isGlobal?: boolean }} [scopeOpts] - 与 scopeSelector 一致的 scope 参数
 * @returns {void}
 */
function replaceBareNestingMarkersWithAmpersand(root, scopeOpts = {}) {
  const { id = '', isGlobal = false } = scopeOpts;
  root.walkRules((rule) => {
    if (!rule.selector) return;
    const marker = rule.selector.trim();
    if (isGlobalNestingWrapperSelector(marker)) {
      rule.selector = '&';
      return;
    }
    if (isAttachedGlobalNestingWrapper(rule)) {
      rule.selector = stripAttachedGlobalFromSelector(marker);
      return;
    }
    if (marker === BARE_SCOPE_NESTING_MARKER && id) {
      rule.selector = bareScopeMarkerToAmpersand(id, isGlobal);
    }
  });
}

module.exports = {
  hasExplicitScopeControl,
  hasAttachedScopePseudo,
  isRuleTreeLeaf,
  isGlobalNestingWrapperSelector,
  isAttachedGlobalNestingWrapper,
  stripAttachedGlobalFromSelector,
  isBareGlobalWrapper,
  isBareScopeWrapper,
  isGlobalSegmentSelector,
  isInGlobalSubtree,
  isScopeAnchorSelector,
  isUnderScopeAnchorAncestor,
  shouldApplyScope,
  unwrapRedundantNestedGlobalUnder,
  unwrapAllRedundantNestedGlobal,
  unwrapBareMarkerWrapperUnder,
  bareScopeMarkerToAmpersand,
  replaceBareNestingMarkersWithAmpersand,
  wrapDeclsInAmpersandScope,
  runNestingPrepass,
};
