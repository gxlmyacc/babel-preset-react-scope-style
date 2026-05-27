const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const postcss = require('postcss');
const {
  hasExplicitScopeControl,
  isRuleTreeLeaf,
  isBareGlobalWrapper,
  isBareScopeWrapper,
  isInGlobalSubtree,
  isScopeAnchorSelector,
  isUnderScopeAnchorAncestor,
  shouldApplyScope,
  unwrapRedundantNestedGlobalUnder,
  unwrapAllRedundantNestedGlobal,
  replaceBareNestingMarkersWithAmpersand,
  wrapDeclsInAmpersandScope,
  runNestingPrepass,
} = require('../postcss/nesting-scope');

describe('nesting-scope 单元', () => {
  it('hasExplicitScopeControl：:scope、:global 与否定分支', () => {
    assert.equal(hasExplicitScopeControl('.btn:scope'), true);
    assert.equal(hasExplicitScopeControl(':global .reset'), true);
    assert.equal(hasExplicitScopeControl('.wrap :global .ext'), true);
    assert.equal(hasExplicitScopeControl('.plain'), false);
    assert.equal(hasExplicitScopeControl(':global(.btn)'), false);
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

  it('isInGlobalSubtree：无 global 祖先、:scope 祖先打断', () => {
    const nested = postcss.parse('.card { .title {} }');
    const title = nested.first.nodes[0];
    assert.equal(isInGlobalSubtree(title), false);

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
    assert.equal(root2.toString(), '.a { :global { .y {} } }');
  });

  it('replaceBareNestingMarkersWithAmpersand：附着式 .wrap:global 去掉 :global', () => {
    const root = postcss.parse('.card { .wrap:global { .ext { color: red; } } }');
    replaceBareNestingMarkersWithAmpersand(root, { id: 'v-nest' });
    assert.equal(
      root.toString(),
      '.card { .wrap { .ext { color: red; } } }'
    );
  });

  it('replaceBareNestingMarkersWithAmpersand：裸 :global / :scope 改为 & 占位', () => {
    const globalRoot = postcss.parse('.card { :global { .ext { color: red; } } }');
    replaceBareNestingMarkersWithAmpersand(globalRoot);
    assert.equal(
      globalRoot.toString(),
      '.card { & { .ext { color: red; } } }'
    );

    const nestedGlobal = postcss.parse(
      '.card { :global { :global { .reset { color: red; } } } }'
    );
    replaceBareNestingMarkersWithAmpersand(nestedGlobal);
    assert.equal(
      nestedGlobal.toString(),
      '.card { & { & { .reset { color: red; } } } }'
    );

    const scopeRoot = postcss.parse('.card { :scope { .inner { margin: 0; } } }');
    replaceBareNestingMarkersWithAmpersand(scopeRoot, { id: 'v-nest' });
    assert.equal(
      scopeRoot.toString(),
      '.card { &.v-nest { .inner { margin: 0; } } }'
    );
  });

  it('runNestingPrepass 不合并去掉内层裸 :global', () => {
    const root = postcss.parse('.card { :global { :global { .reset {} } } }');
    runNestingPrepass(root);
    assert.equal(root.toString(), '.card { :global { :global { .reset {} } } }');
  });

  it('isRuleTreeLeaf：仅 @media 子节点视为叶子', () => {
    const root = postcss.parse(
      '@media (min-width: 1px) { .card { color: red; } }'
    );
    const card = root.first.nodes[0];
    assert.equal(isRuleTreeLeaf(card), true);
  });
});
