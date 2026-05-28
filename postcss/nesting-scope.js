const postcss = require('postcss');
const { shouldSkipRule, stripLeadingGlobalFromAllSelectors } = require('./selector-scope');

/**
 * 判断 selector 是否含显式作用域控制（:scope / :global，不含已废弃的 >>>）。
 * @param {string} selector - 选择器文本
 * @returns {boolean}
 */
function hasExplicitScopeControl(selector) {
  const s = selector.trim();
  if (s.includes(':scope')) return true;
  if (!s.includes(':global') || /:global\s*\(/.test(s)) return false;
  // 嵌套包装 .wrap:global { } 由 isAttachedGlobalNestingWrapper 处理，不在此走 scopeSelector
  if (/^.+:global$/.test(s)) return false;
  return true;
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
 * 嵌套段标记类型：global 与 scope 在非根包装块上结构平行（裸 / 分隔 / &:），占位不同。
 * @typedef {'global' | 'scope'} NestingMarkerKind
 */

/** 裸嵌套段选择器字面量 */
const NESTING_BARE_MARKER = {
  global: ':global',
  scope: ':scope',
};

/** &: 附着嵌套段选择器字面量 */
const NESTING_AMPERSAND_MARKER = {
  global: '&:global',
  scope: '&:scope',
};

/**
 * 是否为裸嵌套段包装（:global / :scope，非 &: 形式）。
 * @param {string} selector - 选择器文本
 * @param {NestingMarkerKind} kind - 段类型
 * @returns {boolean}
 */
function isBareNestingSelector(selector, kind) {
  return selector.trim() === NESTING_BARE_MARKER[kind];
}

/**
 * 是否为 & :marker 分隔式嵌套包装（占位同裸段，用 * / *.scope）。
 * @param {string} selector - 选择器文本
 * @param {NestingMarkerKind} kind - 段类型
 * @returns {boolean}
 */
function isSpacedNestingSelector(selector, kind) {
  const s = selector.trim();
  if (kind === 'global') return s === '& :global';
  return s === '& :scope' || /^&\s+:scope$/.test(s);
}

/**
 * 是否为 &:marker 嵌套包装（占位用 & / &.scope）。
 * @param {string} selector - 选择器文本
 * @param {NestingMarkerKind} kind - 段类型
 * @returns {boolean}
 */
function isAmpersandNestingSelector(selector, kind) {
  return selector.trim() === NESTING_AMPERSAND_MARKER[kind];
}

/**
 * 是否为 * 占位族嵌套包装（裸段与 & :marker 分隔式）。
 * @param {string} selector - 选择器文本
 * @param {NestingMarkerKind} kind - 段类型
 * @returns {boolean}
 */
function isStarPlaceholderNestingSelector(selector, kind) {
  return isBareNestingSelector(selector, kind) || isSpacedNestingSelector(selector, kind);
}

/** @param {string} selector @returns {boolean} */
function isBareGlobalNestingSelector(selector) {
  return isBareNestingSelector(selector, 'global');
}

/** @param {string} selector @returns {boolean} */
function isSpacedGlobalNestingSelector(selector) {
  return isSpacedNestingSelector(selector, 'global');
}

/** @param {string} selector @returns {boolean} */
function isAmpersandGlobalNestingSelector(selector) {
  return isAmpersandNestingSelector(selector, 'global');
}

/** @param {string} selector @returns {boolean} */
function isStarPlaceholderGlobalNestingSelector(selector) {
  return isStarPlaceholderNestingSelector(selector, 'global');
}

/** @param {string} selector @returns {boolean} */
function isBareScopeNestingSelector(selector) {
  return isBareNestingSelector(selector, 'scope');
}

/** @param {string} selector @returns {boolean} */
function isSpacedScopeNestingSelector(selector) {
  return isSpacedNestingSelector(selector, 'scope');
}

/** @param {string} selector @returns {boolean} */
function isAmpersandScopeNestingSelector(selector) {
  return isAmpersandNestingSelector(selector, 'scope');
}

/** @param {string} selector @returns {boolean} */
function isStarPlaceholderScopeNestingSelector(selector) {
  return isStarPlaceholderNestingSelector(selector, 'scope');
}

/**
 * 是否为 global 嵌套包装块选择器（非 :global(...) 函数式）。
 * @param {string} selector - 选择器文本
 * @returns {boolean}
 */
function isGlobalNestingWrapperSelector(selector) {
  return isStarPlaceholderGlobalNestingSelector(selector)
    || isAmpersandGlobalNestingSelector(selector);
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
 * 是否为嵌套段包装 rule（含子 rule）：global 含 :global / &:global / & :global；scope 仅裸 :scope。
 * @param {import('postcss').Rule} rule - PostCSS 规则节点
 * @param {NestingMarkerKind} kind - 段类型
 * @returns {boolean}
 */
function isNestingSegmentWrapper(rule, kind) {
  if (!rule.selector) return false;
  const marker = rule.selector.trim();
  const matchesWrapper = kind === 'global'
    ? isGlobalNestingWrapperSelector(marker)
    : marker === NESTING_BARE_MARKER.scope;
  if (!matchesWrapper) return false;
  let hasChildRule = false;
  rule.each((child) => {
    if (child.type === 'rule') hasChildRule = true;
  });
  return hasChildRule;
}

/**
 * 是否为仅作 global 段容器的包装 rule（含 :global / &:global 等且含子 rule）。
 * @param {import('postcss').Rule} rule - PostCSS 规则节点
 * @returns {boolean}
 */
function isBareGlobalWrapper(rule) {
  return isNestingSegmentWrapper(rule, 'global');
}

/**
 * 是否为仅作 :scope 段容器的包装 rule（selector 字面量为 :scope 且含子 rule）。
 * @param {import('postcss').Rule} rule - PostCSS 规则节点
 * @returns {boolean}
 */
function isBareScopeWrapper(rule) {
  return isNestingSegmentWrapper(rule, 'scope');
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
  if (s === ':global') return true;
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
  if (isBareGlobalNestingSelector(rule.selector)) {
    let hasChildRule = false;
    rule.each((child) => {
      if (child.type === 'rule') hasChildRule = true;
    });
    if (!hasChildRule) return false;
  }
  if (isInGlobalSubtree(rule)) return false;
  if (hasExplicitScopeControl(rule.selector)) return true;
  if (!isRuleTreeLeaf(rule)) return false;
  if (isUnderScopeAnchorAncestor(rule, scopeOpts)) return false;
  return true;
}

/**
 * 规则是否无声明与子 rule、且仅含注释（Sass 展平 :global 时留下的占位块）。
 * 纯空块 `{ }` 不视为可删，避免误伤测试与合法空规则。
 * @param {import('postcss').Rule} rule - PostCSS 规则节点
 * @returns {boolean}
 */
function isEffectivelyEmptyRule(rule) {
  let hasDecl = false;
  let hasChildRule = false;
  let hasComment = false;
  rule.each((child) => {
    if (child.type === 'decl') hasDecl = true;
    if (child.type === 'rule') hasChildRule = true;
    if (child.type === 'comment') hasComment = true;
  });
  return !hasDecl && !hasChildRule && hasComment;
}

/**
 * 移除仅含注释、无声明且无子 rule 的空规则（如 Sass 为 :global 子选择器生成的占位块）。
 * @param {import('postcss').Root} root - CSS 根
 * @returns {void}
 */
function removeEffectivelyEmptyRules(root) {
  const toRemove = [];
  root.walkRules((rule) => {
    if (!rule.selector || !isEffectivelyEmptyRule(rule)) return;
    toRemove.push(rule);
  });
  toRemove.forEach((rule) => {
    rule.remove();
  });
}

/**
 * 移除 Sass 展开后仅含注释/声明、无子 rule 的裸 :global 占位块。
 * @param {import('postcss').Root} root - CSS 根
 * @returns {void}
 */
function removeEmptyGlobalMarkerRules(root) {
  const toRemove = [];
  root.walkRules((rule) => {
    if (!rule.parent || rule.parent.type !== 'root') return;
    if (!rule.selector || !isBareGlobalNestingSelector(rule.selector)) return;
    let hasChildRule = false;
    rule.each((child) => {
      if (child.type === 'rule') hasChildRule = true;
    });
    if (!hasChildRule) toRemove.push(rule);
  });
  toRemove.forEach((rule) => {
    rule.remove();
  });
}

/**
 * 上提 CSS 根下裸 :global 包装块的子节点（根级不能改为 & 占位，须展平为顶层规则）。
 * @param {import('postcss').Root} root - CSS 根
 * @returns {void}
 */
function unwrapRootBareGlobalWrappers(root) {
  let changed = true;
  while (changed) {
    changed = false;
    const toUnwrap = [];
    root.each((child) => {
      if (child.type !== 'rule' || !child.selector) return;
      if (!isGlobalNestingWrapperWithChildRules(child)) return;
      toUnwrap.push(child);
    });
    toUnwrap.forEach((wrapper) => {
      const clones = [];
      wrapper.each((grand) => {
        clones.push(grand.clone());
      });
      clones.forEach((node) => {
        if (node.type === 'rule' && node.selector) {
          const sel = node.selector.trim();
          if (!isGlobalNestingWrapperSelector(sel)) {
            node.selector = stripLeadingGlobalFromAllSelectors(node.selector);
          }
        }
        root.insertBefore(wrapper, node);
      });
      wrapper.remove();
      changed = true;
    });
  }
}

/**
 * rule 是否含至少一个子 rule。
 * @param {import('postcss').Rule} rule - PostCSS 规则节点
 * @returns {boolean}
 */
function ruleHasChildRule(rule) {
  let hasChildRule = false;
  rule.each((child) => {
    if (child.type === 'rule') hasChildRule = true;
  });
  return hasChildRule;
}

/**
 * 是否为带嵌套子 rule 的 global 包装块（:global / &:global / & :global）。
 * @param {import('postcss').Rule} rule - PostCSS 规则节点
 * @returns {boolean}
 */
function isGlobalNestingWrapperWithChildRules(rule) {
  if (!rule.selector) return false;
  if (!isGlobalNestingWrapperSelector(rule.selector.trim())) return false;
  return ruleHasChildRule(rule);
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
 * 父级亦为 global 包装时，上提子级 global 包装内的 rule（连续 :global 合并去掉）。
 * @param {import('postcss').Rule} parentRule - 父级 global 包装 rule
 * @returns {void}
 */
function unwrapNestedGlobalWrappersUnder(parentRule) {
  if (!parentRule.selector || parentRule.type !== 'rule') return;
  if (!isGlobalNestingWrapperSelector(parentRule.selector.trim())) return;

  let changed = true;
  while (changed) {
    changed = false;
    const toUnwrap = [];
    parentRule.each((child) => {
      if (isGlobalNestingWrapperWithChildRules(child)) {
        toUnwrap.push(child);
      }
    });
    toUnwrap.forEach((child) => {
      const clones = [];
      child.each((grand) => {
        clones.push(grand.clone());
      });
      clones.forEach((node) => {
        if (node.type === 'rule' && node.selector) {
          const sel = node.selector.trim();
          if (!isGlobalNestingWrapperSelector(sel)) {
            node.selector = stripLeadingGlobalFromAllSelectors(node.selector);
          }
        }
        parentRule.insertBefore(child, node);
      });
      child.remove();
      changed = true;
    });
  }
}

/**
 * 递归展平连续嵌套的 global 包装（已废弃：仅根级裸 :global 由上提处理，与 :scope 一致不合并）。
 * @param {import('postcss').Root} root - CSS 根
 * @returns {void}
 */
function unwrapAllConsecutiveGlobalWrappers(root) {
  void root;
}

/**
 * 在 global 子树内去掉冗余的嵌套 :global 包装（上提子节点）。
 * @param {import('postcss').Rule} parentRule - 父 rule
 * @returns {void}
 */
function unwrapRedundantNestedGlobalUnder(parentRule) {
  unwrapNestedGlobalWrappersUnder(parentRule);
}

/**
 * 递归处理全树的冗余嵌套 :global（已废弃：非根级与 :scope 一致，不合并连续包装）。
 * @param {import('postcss').Root} root - CSS 根
 * @returns {void}
 */
function unwrapAllRedundantNestedGlobal(root) {
  void root;
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
 * 嵌套作用域 pre-pass：非叶子声明包入 &:scope（裸 :global/:scope 在 scope 后统一改为 * / &.scope）。
 * @param {import('postcss').Root} root - CSS 根
 * @returns {void}
 */
function runNestingPrepass(root) {
  root.walkRules((rule) => {
    wrapDeclsInAmpersandScope(rule);
  });
}

/**
 * &:scope / &:global 包装块替换为带 scope 的 &。
 * @param {string} scopeId - 作用域 id
 * @param {boolean} isGlobal - 是否 global 模式
 * @returns {string}
 */
function ampersandScopeMarkerWithScope(scopeId, isGlobal) {
  if (isGlobal) {
    return `&[class*=${scopeId}]`;
  }
  return `&.${scopeId}`;
}

/**
 * 裸 :scope / :global 嵌套占位：*.scopeId 或 *[class*=scopeId]。
 * @param {string} scopeId - 作用域 id
 * @param {boolean} isGlobal - 是否 global 模式
 * @returns {string}
 */
function bareScopeMarkerToStar(scopeId, isGlobal) {
  if (isGlobal) {
    return `*[class*=${scopeId}]`;
  }
  return `*.${scopeId}`;
}

/** 裸嵌套段占位与 :scope 统一为 *.scopeId（global / scope 仅段内是否挂 scope 不同） */
function replaceNestingSegmentMarker(rule, kind, scopeOpts = {}) {
  const marker = rule.selector.trim();
  const { id = '', isGlobal = false } = scopeOpts;

  if (isStarPlaceholderNestingSelector(marker, kind)) {
    if (kind === 'global' && rule.parent && rule.parent.type === 'root') return false;
    if (!id) return false;
    rule.selector = bareScopeMarkerToStar(id, isGlobal);
    return true;
  }

  if (isAmpersandNestingSelector(marker, kind)) {
    if (!id) return false;
    rule.selector = ampersandScopeMarkerWithScope(id, isGlobal);
    return true;
  }

  return false;
}

/**
 * scope 后替换嵌套包装占位：根级裸 :global 由上提处理；裸 / &: 段 → * / &.scope。
 * @param {import('postcss').Root} root - CSS 根
 * @param {{ id?: string, isGlobal?: boolean }} [scopeOpts] - 与 scopeSelector 一致的 scope 参数
 * @returns {void}
 */
function replaceBareNestingMarkersWithAmpersand(root, scopeOpts = {}) {
  root.walkRules((rule) => {
    if (!rule.selector) return;
    if (replaceNestingSegmentMarker(rule, 'global', scopeOpts)) return;
    if (isAttachedGlobalNestingWrapper(rule)) {
      rule.selector = stripAttachedGlobalFromSelector(rule.selector.trim());
      return;
    }
    replaceNestingSegmentMarker(rule, 'scope', scopeOpts);
  });
}

module.exports = {
  hasExplicitScopeControl,
  hasAttachedScopePseudo,
  isRuleTreeLeaf,
  isBareNestingSelector,
  isSpacedNestingSelector,
  isAmpersandNestingSelector,
  isStarPlaceholderNestingSelector,
  replaceNestingSegmentMarker,
  isNestingSegmentWrapper,
  isBareGlobalNestingSelector,
  isSpacedGlobalNestingSelector,
  isStarPlaceholderGlobalNestingSelector,
  isAmpersandGlobalNestingSelector,
  isBareScopeNestingSelector,
  isSpacedScopeNestingSelector,
  isStarPlaceholderScopeNestingSelector,
  isAmpersandScopeNestingSelector,
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
  unwrapRootBareGlobalWrappers,
  unwrapAllConsecutiveGlobalWrappers,
  unwrapNestedGlobalWrappersUnder,
  isGlobalNestingWrapperWithChildRules,
  removeEmptyGlobalMarkerRules,
  isEffectivelyEmptyRule,
  removeEffectivelyEmptyRules,
  bareScopeMarkerToStar,
  ampersandScopeMarkerWithScope,
  replaceBareNestingMarkersWithAmpersand,
  wrapDeclsInAmpersandScope,
  runNestingPrepass,
};
