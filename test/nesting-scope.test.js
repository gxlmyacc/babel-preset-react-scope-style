const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const postcss = require('postcss');
const {
  hasExplicitScopeControl,
  hasAttachedScopePseudo,
  isRuleTreeLeaf,
  isBareGlobalWrapper,
  isBareScopeWrapper,
  isAttachedGlobalNestingWrapper,
  isBareGlobalNestingSelector,
  isSpacedGlobalNestingSelector,
  isStarPlaceholderGlobalNestingSelector,
  isAmpersandGlobalNestingSelector,
  isBareScopeNestingSelector,
  isSpacedScopeNestingSelector,
  isStarPlaceholderScopeNestingSelector,
  isAmpersandScopeNestingSelector,
  isInGlobalSubtree,
  isScopeAnchorSelector,
  isUnderScopeAnchorAncestor,
  shouldApplyScope,
  unwrapRedundantNestedGlobalUnder,
  unwrapAllRedundantNestedGlobal,
  unwrapRootBareGlobalWrappers,
  unwrapAllConsecutiveGlobalWrappers,
  bareScopeMarkerToStar,
  ampersandScopeMarkerWithScope,
  replaceBareNestingMarkersWithAmpersand,
  replaceNestingSegmentMarker,
  wrapDeclsInAmpersandScope,
  runNestingPrepass,
  isEffectivelyEmptyRule,
  removeEffectivelyEmptyRules,
} = require('../postcss/nesting-scope');

describe('nesting-scope 单元', () => {
  it('hasExplicitScopeControl：:scope、:global 与否定分支', () => {
    assert.equal(hasExplicitScopeControl('.btn:scope'), true);
    assert.equal(hasExplicitScopeControl(':global .reset'), true);
    assert.equal(hasExplicitScopeControl('.wrap :global .ext'), true);
    assert.equal(hasExplicitScopeControl('.card:global .title'), true);
    assert.equal(hasExplicitScopeControl('.wrap:global'), false);
    assert.equal(hasExplicitScopeControl('.plain'), false);
    assert.equal(hasExplicitScopeControl(':global(.btn)'), false);
  });

  it('global、scope 嵌套选择器分类（裸 / 分隔 / &:）', () => {
    assert.equal(isBareGlobalNestingSelector(':global'), true);
    assert.equal(isBareGlobalNestingSelector('&:global'), false);
    assert.equal(isSpacedGlobalNestingSelector('& :global'), true);
    assert.equal(isAmpersandGlobalNestingSelector('&:global'), true);
    assert.equal(isAmpersandGlobalNestingSelector('& :global'), false);
    assert.equal(isStarPlaceholderGlobalNestingSelector(':global'), true);
    assert.equal(isStarPlaceholderGlobalNestingSelector('& :global'), true);
    assert.equal(isBareScopeNestingSelector(':scope'), true);
    assert.equal(isSpacedScopeNestingSelector('& :scope'), true);
    assert.equal(isAmpersandScopeNestingSelector('&:scope'), true);
    assert.equal(isAmpersandScopeNestingSelector('& :scope'), false);
  });

  it('replaceNestingSegmentMarker：裸 global / scope 统一占位（*.scope / &.scope）', () => {
    const scopeOpts = { id: 'v-nest', isGlobal: false };
    const globalBare = postcss.rule({ selector: ':global' });
    const scopeBare = postcss.rule({ selector: ':scope' });
    const globalAmp = postcss.rule({ selector: '&:global' });
    const scopeAmp = postcss.rule({ selector: '&:scope' });

    assert.equal(replaceNestingSegmentMarker(globalBare, 'global', scopeOpts), true);
    assert.equal(globalBare.selector, '*.v-nest');
    assert.equal(replaceNestingSegmentMarker(scopeBare, 'scope', scopeOpts), true);
    assert.equal(scopeBare.selector, '*.v-nest');
    assert.equal(replaceNestingSegmentMarker(globalAmp, 'global', scopeOpts), true);
    assert.equal(globalAmp.selector, '&.v-nest');
    assert.equal(replaceNestingSegmentMarker(scopeAmp, 'scope', scopeOpts), true);
    assert.equal(scopeAmp.selector, '&.v-nest');
  });

  it('isBareGlobalWrapper / isBareScopeWrapper：无 selector 或无子 rule', () => {
    const globalWrap = postcss.rule({ selector: ':global' });
    globalWrap.append(postcss.rule({ selector: '.x' }));
    assert.equal(isBareGlobalWrapper(globalWrap), true);

    globalWrap.selector = '';
    assert.equal(isBareGlobalWrapper(globalWrap), false);

    const emptyGlobal = postcss.rule({ selector: ':global' });
    emptyGlobal.append(postcss.decl({ prop: 'margin', value: '0' }));
    assert.equal(isBareGlobalWrapper(emptyGlobal), false);

    const scopeWrap = postcss.rule({ selector: ':scope' });
    scopeWrap.append(postcss.rule({ selector: '.inner' }));
    assert.equal(isBareScopeWrapper(scopeWrap), true);

    scopeWrap.selector = '';
    assert.equal(isBareScopeWrapper(scopeWrap), false);

    const emptyScope = postcss.rule({ selector: ':scope' });
    emptyScope.append(postcss.decl({ prop: 'color', value: 'red' }));
    assert.equal(isBareScopeWrapper(emptyScope), false);
  });

  it('shouldApplyScope：裸包装、无 selector、显式 :global 规则', () => {
    const scopeWrap = postcss.parse(':scope { .in {} }').first;
    assert.equal(shouldApplyScope(scopeWrap), false);

    const globalWrap = postcss.parse(':global { .ext {} }').first;
    assert.equal(shouldApplyScope(globalWrap), false);

    const leadingGlobal = postcss.parse(':global .reset {}').first;
    assert.equal(shouldApplyScope(leadingGlobal), true);

    const bare = postcss.rule();
    bare.selector = undefined;
    assert.equal(shouldApplyScope(bare), false);
  });

  it('hasAttachedScopePseudo：裸 :scope 为 false，附着式为 true', () => {
    assert.equal(hasAttachedScopePseudo(':scope'), false);
    assert.equal(hasAttachedScopePseudo('&:scope'), true);
    assert.equal(hasAttachedScopePseudo('.wrap:scope'), true);
    assert.equal(hasAttachedScopePseudo('.plain'), false);
  });

  it('isScopeAnchorSelector：*.scope 与 &.scope 锚点', () => {
    const opts = { id: 'v-g', isGlobal: true };
    assert.equal(isScopeAnchorSelector('.x[class*=v-g]', opts), true);
    assert.equal(isScopeAnchorSelector('*[class*=v-g]', opts), true);
    assert.equal(isScopeAnchorSelector('*.v-local', { id: 'v-local', isGlobal: false }), true);
    assert.equal(isScopeAnchorSelector('[class*=v-g]', opts), true);
    assert.equal(isScopeAnchorSelector('.v-local', { id: 'v-local', isGlobal: false }), true);
    assert.equal(isScopeAnchorSelector('&.v-nest', { id: 'v-nest', isGlobal: false }), true);
    assert.equal(isScopeAnchorSelector('*', { id: 'v-nest', isGlobal: false }), false);
  });

  it('bareScopeMarkerToStar / ampersandScopeMarkerWithScope', () => {
    assert.equal(bareScopeMarkerToStar('v-g', true), '*[class*=v-g]');
    assert.equal(bareScopeMarkerToStar('v-local', false), '*.v-local');
    assert.equal(ampersandScopeMarkerWithScope('v-local', false), '&.v-local');
  });

  it('isUnderScopeAnchorAncestor：链上任意 :scope 锚点后代不再挂 scope', () => {
    const opts = { id: 'v-nest', isGlobal: false };
    assert.equal(isScopeAnchorSelector('&:scope', opts), true);
    assert.equal(isScopeAnchorSelector(':scope', opts), true);
    assert.equal(isScopeAnchorSelector('.wrap:scope', opts), true);
    assert.equal(isScopeAnchorSelector('&.v-nest', opts), true);
    assert.equal(isScopeAnchorSelector('.card', opts), false);

    const direct = postcss.parse('.card { &:scope { .inner {} } }');
    const inner = direct.first.nodes[0].nodes[0];
    assert.equal(isUnderScopeAnchorAncestor(inner, opts), true);
    assert.equal(shouldApplyScope(inner, opts), false);

    const nested = postcss.parse('.card { &:scope { .mid { .deep {} } } }');
    const deep = nested.first.nodes[0].nodes[0].nodes[0];
    assert.equal(isUnderScopeAnchorAncestor(deep, opts), true);
    assert.equal(shouldApplyScope(deep, opts), false);

    const bareScope = postcss.parse('.card { :scope { .in {} } }');
    const inBare = bareScope.first.nodes[0].nodes[0];
    assert.equal(isUnderScopeAnchorAncestor(inBare, opts), true);
    assert.equal(shouldApplyScope(inBare, opts), false);

    const sibling = postcss.parse('.card { &:scope { color: red; } .title {} }');
    const title = sibling.first.nodes[1];
    assert.equal(isUnderScopeAnchorAncestor(title, opts), false);
    assert.equal(shouldApplyScope(title, opts), true);
  });

  it('isInGlobalSubtree：:global 包装与 :scope 祖先打断', () => {
    const nested = postcss.parse('.card { .title {} }');
    const title = nested.first.nodes[0];
    assert.equal(isInGlobalSubtree(title), false);

    const globalWrap = postcss.parse('.card { :global { .ext {} } }');
    const ext = globalWrap.first.nodes[0].nodes[0];
    assert.equal(isInGlobalSubtree(ext), true);

    const mixed = postcss.parse('.card { :global { :scope { .scoped {} } } }');
    const scoped = mixed.first.nodes[0].nodes[0].nodes[0];
    assert.equal(isInGlobalSubtree(scoped), false);
  });

  it('hasScopeDeclWrapperChild：已有 scope 子 rule 时不重复包声明', () => {
    const withAmpersand = postcss.parse(
      '.card { &:scope { color: red; } .title { margin: 0; } }'
    );
    const before = withAmpersand.toString();
    runNestingPrepass(withAmpersand);
    assert.equal(withAmpersand.toString(), before);

    const withBareScope = postcss.parse(
      '.card { :scope { color: blue; } .title { padding: 0; } }'
    );
    const beforeBare = withBareScope.toString();
    runNestingPrepass(withBareScope);
    assert.equal(withBareScope.toString(), beforeBare);

    const withSpaced = postcss.parse(
      '.card { & :scope { color: green; } .title { border: 0; } }'
    );
    const beforeSpaced = withSpaced.toString();
    runNestingPrepass(withSpaced);
    assert.equal(withSpaced.toString(), beforeSpaced);
  });

  it('wrapDeclsInAmpersandScope：非叶子声明迁入 &:scope', () => {
    const root = postcss.parse('.card { color: cyan; .title { margin: 0; } }');
    wrapDeclsInAmpersandScope(root.first);
    const card = root.first;
    const scopeChild = card.nodes.find(
      (n) => n.type === 'rule' && n.selector === '&:scope'
    );
    assert.ok(scopeChild);
    assert.equal(scopeChild.nodes[0].prop, 'color');
    assert.equal(scopeChild.nodes[0].value, 'cyan');
  });

  it('unwrapRedundantNestedGlobalUnder 与 unwrapAllRedundantNestedGlobal', () => {
    const root = postcss.parse('.card { :global { :global { .reset { color: red; } } } }');
    const card = root.first;
    const outerGlobal = card.nodes.find((n) => n.type === 'rule' && n.selector.trim() === ':global');
    unwrapRedundantNestedGlobalUnder(outerGlobal);
    assert.equal(outerGlobal.nodes.length, 1);
    assert.equal(outerGlobal.nodes[0].selector, '.reset');

    const root2 = postcss.parse('.a { :global { :global { .y {} } } }');
    unwrapAllRedundantNestedGlobal(root2);
    assert.equal(root2.toString(), '.a { :global { :global { .y {} } } }');
  });

  it('isAttachedGlobalNestingWrapper：否定分支与附着式包装', () => {
    const bareGlobal = postcss.rule({ selector: ':global' });
    bareGlobal.append(postcss.rule({ selector: '.x' }));
    assert.equal(isAttachedGlobalNestingWrapper(bareGlobal), false);

    const fnGlobal = postcss.rule({ selector: ':global(.x)' });
    fnGlobal.append(postcss.rule({ selector: '.y' }));
    assert.equal(isAttachedGlobalNestingWrapper(fnGlobal), false);

    const noSelector = postcss.rule();
    noSelector.selector = undefined;
    assert.equal(isAttachedGlobalNestingWrapper(noSelector), false);

    const attached = postcss.parse('.card { .wrap:global { .ext {} } }').first.nodes[0];
    assert.equal(isAttachedGlobalNestingWrapper(attached), true);

    const declOnly = postcss.rule({ selector: '.wrap:global' });
    declOnly.append(postcss.decl({ prop: 'color', value: 'red' }));
    assert.equal(isAttachedGlobalNestingWrapper(declOnly), false);
  });

  it('replaceBareNestingMarkersWithAmpersand：无 selector 的 rule 跳过', () => {
    const root = postcss.root();
    const bare = postcss.rule();
    bare.selector = undefined;
    root.append(bare);
    replaceBareNestingMarkersWithAmpersand(root, { id: 'v-skip' });
    assert.equal(root.nodes.length, 1);
    assert.equal(root.nodes[0].selector, undefined);
  });

  it('replaceBareNestingMarkersWithAmpersand：附着式 .wrap:global 去掉 :global', () => {
    const root = postcss.parse('.card { .wrap:global { .ext { color: red; } } }');
    replaceBareNestingMarkersWithAmpersand(root, { id: 'v-nest' });
    assert.equal(
      root.toString(),
      '.card { .wrap { .ext { color: red; } } }'
    );
  });

  it('unwrapRootBareGlobalWrappers：根级 :global 上提子规则，不保留占位', () => {
    const root = postcss.parse(`
:global {
  html, body { margin: 0; }
  #root { height: 100%; }
}
.shared { color: red; }
`);
    unwrapRootBareGlobalWrappers(root);
    assert.equal(
      root.toString().replace(/\s+/g, ' ').trim(),
      'html, body { margin: 0; } #root { height: 100%; } .shared { color: red; }'
    );
  });

  it('replaceBareNestingMarkersWithAmpersand：根级裸 :global 保持不改为占位', () => {
    const rootOnly = postcss.parse(':global { .reset { margin: 0; } }');
    replaceBareNestingMarkersWithAmpersand(rootOnly);
    assert.equal(rootOnly.toString(), ':global { .reset { margin: 0; } }');
  });

  it('replaceBareNestingMarkersWithAmpersand：裸 :global→*.id、裸 :scope→*.id、&:global/:scope→&.id', () => {
    const globalRoot = postcss.parse('.card { :global { .ext { color: red; } } }');
    replaceBareNestingMarkersWithAmpersand(globalRoot, { id: 'v-nest' });
    assert.equal(
      globalRoot.toString(),
      '.card { *.v-nest { .ext { color: red; } } }'
    );

    const nestedGlobal = postcss.parse(
      ':global { :global { .reset { color: red; } } }'
    );
    unwrapAllConsecutiveGlobalWrappers(nestedGlobal);
    unwrapRootBareGlobalWrappers(nestedGlobal);
    replaceBareNestingMarkersWithAmpersand(nestedGlobal);
    assert.equal(nestedGlobal.toString().trim(), '.reset { color: red; }');

    const scopeRoot = postcss.parse('.card { :scope { .inner { margin: 0; } } }');
    replaceBareNestingMarkersWithAmpersand(scopeRoot, { id: 'v-nest' });
    assert.equal(
      scopeRoot.toString(),
      '.card { *.v-nest { .inner { margin: 0; } } }'
    );

    const ampersandScope = postcss.parse('.card { &:scope { .inner { padding: 0; } } }');
    replaceBareNestingMarkersWithAmpersand(ampersandScope, { id: 'v-nest' });
    assert.equal(
      ampersandScope.toString(),
      '.card { &.v-nest { .inner { padding: 0; } } }'
    );

    const ampersandGlobal = postcss.parse('.card { &:global { .ext { color: blue; } } }');
    replaceBareNestingMarkersWithAmpersand(ampersandGlobal, { id: 'v-nest' });
    assert.equal(
      ampersandGlobal.toString(),
      '.card { &.v-nest { .ext { color: blue; } } }'
    );

    const spacedGlobal = postcss.parse('.card { & :global { .ext { color: green; } } }');
    replaceBareNestingMarkersWithAmpersand(spacedGlobal, { id: 'v-nest' });
    assert.equal(
      spacedGlobal.toString(),
      '.card { *.v-nest { .ext { color: green; } } }'
    );

    const globalScopeRoot = postcss.parse('.card { :scope { .inner { padding: 0; } } }');
    replaceBareNestingMarkersWithAmpersand(globalScopeRoot, { id: 'v-g', isGlobal: true });
    assert.equal(
      globalScopeRoot.toString(),
      '.card { *[class*=v-g] { .inner { padding: 0; } } }'
    );
  });

  it('runNestingPrepass 不合并去掉内层裸 :global', () => {
    const root = postcss.parse('.card { :global { :global { .reset {} } } }');
    runNestingPrepass(root);
    assert.equal(root.toString(), '.card { :global { :global { .reset {} } } }');
  });

  it('isEffectivelyEmptyRule：仅删含注释的占位块，保留纯空规则', () => {
    const commentOnly = postcss.parse('.wrap { /* placeholder */ }').first;
    const bareEmpty = postcss.parse('.z { }').first;
    assert.equal(isEffectivelyEmptyRule(commentOnly), true);
    assert.equal(isEffectivelyEmptyRule(bareEmpty), false);

    const root = postcss.parse('.keep { } .drop { /* x */ }');
    removeEffectivelyEmptyRules(root);
    assert.equal(root.toString(), '.keep { }');
  });

  it('isRuleTreeLeaf：仅 @media 子节点视为叶子', () => {
    const root = postcss.parse(
      '@media (min-width: 1px) { .card { color: red; } }'
    );
    const card = root.first.nodes[0];
    assert.equal(isRuleTreeLeaf(card), true);
  });
});
