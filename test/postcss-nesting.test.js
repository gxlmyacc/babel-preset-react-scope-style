const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { runPostcssScope } = require('./helpers');
const {
  shouldApplyScope,
  isRuleTreeLeaf,
  isInGlobalSubtree,
} = require('../postcss/nesting-scope');

const scopeOpts = { scoped: true, id: 'v-nest' };

describe('原生 CSS 嵌套作用域', () => {
  it('嵌套 .card { .title {} } 仅叶子挂 scope', async () => {
    const css = await runPostcssScope(
      `.card { color: red; }
.card { .title { font-size: 14px; } }
.card { &:hover { opacity: 0.9; } }`,
      scopeOpts
    );
    assert.equal(
      css,
      `.card.v-nest { color: red; }
.card { .title.v-nest { font-size: 14px; } }
.card { &.v-nest:hover { opacity: 0.9; } }`
    );
  });

  it('扁平 .card .title 与嵌套展开语义一致', async () => {
    const flat = await runPostcssScope('.card .title { color: blue; }', scopeOpts);
    const nested = await runPostcssScope('.card { .title { color: blue; } }', scopeOpts);

    assert.equal(flat, '.card .title.v-nest { color: blue; }');
    assert.equal(nested, '.card { .title.v-nest { color: blue; } }');
  });

  it('非叶子 block 含声明时自动包入 &:scope', async () => {
    const css = await runPostcssScope(
      '.card { color: cyan; .title { margin: 0; } }',
      scopeOpts
    );
    assert.equal(
      css,
      '.card { &.v-nest { color: cyan; } .title.v-nest { margin: 0; } }'
    );
  });

  it('根级 :global 包装块展平为顶层规则且无 & 占位', async () => {
    const css = await runPostcssScope(
      `:global {
  html, body { margin: 0; height: 100%; }
  #root { height: 100%; }
}
.util { color: red; }`,
      scopeOpts
    );
    assert.equal(
      css.replace(/\s+/g, ' ').trim(),
      'html, body { margin: 0; height: 100%; } #root { height: 100%; } .util.v-nest { color: red; }'
    );
  });

  it('Sass 展平后各行首 :global 去掉且移除仅注释的占位块', async () => {
    const css = await runPostcssScope(
      `:global {
  /* Sass 仅保留注释的占位块 */
}
:global *,
:global *::before,
:global *::after { box-sizing: border-box; }
:global html,
:global body { margin: 0; height: 100%; }
:global #root { height: 100%; }`,
      scopeOpts
    );
    const norm = (s) => s.replace(/\s+/g, ' ').replace(/,\s*/g, ', ').trim();
    assert.equal(
      norm(css),
      '*, *::before, *::after { box-sizing: border-box; } html, body { margin: 0; height: 100%; } #root { height: 100%; }'
    );
    assert.equal(css.includes(':global'), false);
    assert.equal(css.includes('/* Sass'), false);
  });

  it(':global 块内子选择器不挂 scope', async () => {
    const css = await runPostcssScope(
      '.card { :global { .ext { color: red; } } .local { color: blue; } }',
      scopeOpts
    );
    assert.equal(
      css,
      '.card { *.v-nest { .ext { color: red; } } .local.v-nest { color: blue; } }'
    );
  });

  it('嵌套 :global 与展平后平坦链作用域一致', async () => {
    const nested = await runPostcssScope(
      '.card { :global { .ext { color: red; } } .local { color: blue; } }',
      scopeOpts
    );
    const flatLocal = await runPostcssScope('.card .local { color: blue; }', scopeOpts);

    assert.equal(nested, '.card { *.v-nest { .ext { color: red; } } .local.v-nest { color: blue; } }');
    assert.equal(flatLocal, '.card .local.v-nest { color: blue; }');
  });

  it('根级连续 :global 展平为顶层规则（无 * 占位）', async () => {
    const css = await runPostcssScope(
      ':global { :global { .reset { color: red; } } }',
      scopeOpts
    );
    assert.equal(css, '.reset { color: red; }');
  });

  it(':global 内 &:global 连续嵌套展平', async () => {
    const css = await runPostcssScope(
      ':global { &:global { html, body { margin: 0; } } }',
      scopeOpts
    );
    assert.equal(css, 'html, body { margin: 0; }');
  });

  it('非 global 父级下连续 :global 保留多层 *.scope 占位', async () => {
    const css = await runPostcssScope(
      '.card { :global { :global { .reset { color: red; } } } }',
      scopeOpts
    );
    assert.equal(css, '.card { *.v-nest { *.v-nest { .reset { color: red; } } } }');
  });

  it('非 global 父级下三层 :global 保留三层 *.scope 占位', async () => {
    const css = await runPostcssScope(
      '.a { :global { :global { :global { .deep { color: red; } } } } }',
      scopeOpts
    );
    assert.equal(css, '.a { *.v-nest { *.v-nest { *.v-nest { .deep { color: red; } } } } }');
  });

  it(':global 内裸 :scope 子块改为 *.scope', async () => {
    const css = await runPostcssScope(
      '.card { :global { :scope { .scoped { color: red; } } } }',
      scopeOpts
    );
    assert.equal(css, '.card { *.v-nest { *.v-nest { .scoped { color: red; } } } }');
  });

  it('&:global 嵌套块改为 &.scope 占位，子规则不挂 scope', async () => {
    const css = await runPostcssScope(
      '.card { &:global { .ext { color: red; } .local { color: blue; } } }',
      scopeOpts
    );
    assert.equal(
      css,
      '.card { &.v-nest { .ext { color: red; } .local { color: blue; } } }'
    );
  });

  it('附着式 .wrap:global 嵌套块去掉 :global，子规则不挂 scope', async () => {
    const css = await runPostcssScope(
      '.card { .wrap:global { .ext { color: red; } } }',
      scopeOpts
    );
    assert.equal(
      css,
      '.card { .wrap { .ext { color: red; } } }'
    );
  });

  it('扁平 .card:global .title 附着式（& 语义）仅前缀挂 scope', async () => {
    const css = await runPostcssScope(
      '.card:global .title { color: red; }',
      scopeOpts
    );
    assert.equal(css, '.card.v-nest .title { color: red; }');
  });

  it('扁平附着 .card:global 与分隔 .card :global 结果不同', async () => {
    const attached = await runPostcssScope(
      '.card:global .title { color: red; }',
      scopeOpts
    );
    const spaced = await runPostcssScope(
      '.card :global .title { color: red; }',
      scopeOpts
    );
    assert.equal(attached, '.card.v-nest .title { color: red; }');
    assert.equal(spaced, '.card *.v-nest .title { color: red; }');
    assert.notEqual(attached, spaced);
  });

  it('扁平 .card:global .title 含子 rule 时仍处理父选择器', async () => {
    const css = await runPostcssScope(
      '.card:global .title { color: red; .sub { margin: 0; } }',
      scopeOpts
    );
    assert.equal(
      css,
      '.card.v-nest .title { color: red; .sub { margin: 0; } }'
    );
  });

  it('Sass 展平 &:global .ext 为 .wrapper-box:global .ext（& 语义，无 *）', async () => {
    const css = await runPostcssScope(
      `.wrapper-box {
  padding: 12px;
  border-radius: 8px;
}
.wrapper-box:global .external-widget {
  padding: 8px;
  color: #cf222e;
}`,
      scopeOpts
    );
    assert.equal(
      css,
      `.wrapper-box.v-nest {
  padding: 12px;
  border-radius: 8px;
}
.wrapper-box.v-nest .external-widget {
  padding: 8px;
  color: #cf222e;
}`
    );
  });

  it('Sass 展平 .wrapper-box :global .ext 后移除仅注释的空规则', async () => {
    const css = await runPostcssScope(
      `.wrapper-box {
  padding: 12px;
  border-radius: 8px;
}
.wrapper-box {
  /* 中间 :global — scope 加在 .wrapper-box 上 */
}
.wrapper-box :global .external-widget {
  padding: 8px;
  color: #cf222e;
}`,
      scopeOpts
    );
    assert.equal(css.includes('/* 中间 :global'), false);
    assert.match(css, /\.wrapper-box\.v-nest\s*\{[^}]*padding:\s*12px/);
    assert.equal(
      css,
      `.wrapper-box.v-nest {
  padding: 12px;
  border-radius: 8px;
}
.wrapper-box *.v-nest .external-widget {
  padding: 8px;
  color: #cf222e;
}`
    );
  });

  describe('扁平中间 :global 与 &:global 嵌套对比', () => {
    it('对比：扁平 .card :global .title vs &:global 嵌套', async () => {
      const flat = await runPostcssScope(
        '.card :global .title { color: red; }',
        scopeOpts
      );
      const ampersand = await runPostcssScope(
        '.card { &:global { .title { color: red; } } }',
        scopeOpts
      );
      assert.equal(flat, '.card *.v-nest .title { color: red; }');
      assert.equal(ampersand, '.card { &.v-nest { .title { color: red; } } }');
      assert.notEqual(flat, ampersand);
    });

    it('对比：扁平 .card :global .title vs 嵌套裸 :global 块', async () => {
      const flat = await runPostcssScope(
        '.card :global .title { color: red; }',
        scopeOpts
      );
      const nestedBare = await runPostcssScope(
        '.card { :global { .title { color: red; } } }',
        scopeOpts
      );
      assert.equal(flat, '.card *.v-nest .title { color: red; }');
      assert.equal(nestedBare, '.card { *.v-nest { .title { color: red; } } }');
      assert.notEqual(flat, nestedBare);
    });

    it('对比：扁平附着 .card:global vs 分隔 :global vs &:global 块', async () => {
      const attached = await runPostcssScope(
        '.card:global .title { color: red; }',
        scopeOpts
      );
      const spaced = await runPostcssScope(
        '.card :global .title { color: red; }',
        scopeOpts
      );
      const ampersand = await runPostcssScope(
        '.card { &:global { .title { color: red; } } }',
        scopeOpts
      );
      assert.equal(attached, '.card.v-nest .title { color: red; }');
      assert.equal(spaced, '.card *.v-nest .title { color: red; }');
      assert.equal(ampersand, '.card { &.v-nest { .title { color: red; } } }');
      assert.notEqual(spaced, ampersand);
    });

    it('对比：Sass &:global 展平 .wrapper-box:global vs 分隔 :global', async () => {
      const attached = await runPostcssScope(
        '.wrapper-box:global .external-widget { padding: 8px; color: #cf222e; }',
        scopeOpts
      );
      const spaced = await runPostcssScope(
        '.wrapper-box :global .external-widget { padding: 8px; color: #cf222e; }',
        scopeOpts
      );
      assert.equal(
        attached,
        '.wrapper-box.v-nest .external-widget { padding: 8px; color: #cf222e; }'
      );
      assert.equal(
        spaced,
        '.wrapper-box *.v-nest .external-widget { padding: 8px; color: #cf222e; }'
      );
    });

    it('对比：扁平含子 rule 的 .card :global .title vs &:global', async () => {
      const flat = await runPostcssScope(
        '.card :global .title { color: red; .sub { margin: 0; } }',
        scopeOpts
      );
      const ampersand = await runPostcssScope(
        '.card { &:global { .title { color: red; .sub { margin: 0; } } } }',
        scopeOpts
      );
      assert.equal(
        flat,
        '.card *.v-nest .title { color: red; .sub { margin: 0; } }'
      );
      assert.equal(
        ampersand,
        '.card { &.v-nest { .title { &.v-nest { color: red; } .sub { margin: 0; } } } }'
      );
      assert.notEqual(flat, ampersand);
    });

    it('对比：Sass 展平 .wrapper-box :global .ext vs &:global 块', async () => {
      const flat = await runPostcssScope(
        `.wrapper-box {
  padding: 12px;
  border-radius: 8px;
}
.wrapper-box :global .external-widget {
  padding: 8px;
  color: #cf222e;
}`,
        scopeOpts
      );
      const ampersand = await runPostcssScope(
        `.wrapper-box {
  padding: 12px;
  border-radius: 8px;
  &:global {
    .external-widget {
      padding: 8px;
      color: #cf222e;
    }
  }
}`,
        scopeOpts
      );
      assert.equal(
        flat,
        `.wrapper-box.v-nest {
  padding: 12px;
  border-radius: 8px;
}
.wrapper-box *.v-nest .external-widget {
  padding: 8px;
  color: #cf222e;
}`
      );
      assert.equal(
        ampersand,
        `.wrapper-box {
  &.v-nest {
  padding: 12px;
  border-radius: 8px;
  }
  &.v-nest {
    .external-widget {
      padding: 8px;
      color: #cf222e;
    }
  }
}`
      );
      assert.notEqual(flat, ampersand);
    });

    it('对比：Sass 展平 vs 嵌套裸 :global 块', async () => {
      const flat = await runPostcssScope(
        `.wrapper-box { padding: 12px; border-radius: 8px; }
.wrapper-box :global .external-widget { padding: 8px; color: #cf222e; }`,
        scopeOpts
      );
      const nestedBare = await runPostcssScope(
        `.wrapper-box {
  padding: 12px;
  border-radius: 8px;
  :global {
    .external-widget {
      padding: 8px;
      color: #cf222e;
    }
  }
}`,
        scopeOpts
      );
      assert.equal(
        flat,
        `.wrapper-box.v-nest { padding: 12px; border-radius: 8px; }
.wrapper-box *.v-nest .external-widget { padding: 8px; color: #cf222e; }`
      );
      assert.equal(
        nestedBare,
        `.wrapper-box {
  &.v-nest {
  padding: 12px;
  border-radius: 8px;
  }
  *.v-nest {
    .external-widget {
      padding: 8px;
      color: #cf222e;
    }
  }
}`
      );
      assert.notEqual(flat, nestedBare);
    });

    it('对比：扁平多段 :global vs 嵌套 &:global', async () => {
      const flat = await runPostcssScope(
        '.outer :global .mid :global .inner { color: red; }',
        scopeOpts
      );
      const ampersand = await runPostcssScope(
        '.outer { &:global { .mid { &:global { .inner { color: red; } } } } }',
        scopeOpts
      );
      assert.equal(flat, '.outer *.v-nest .mid *.v-nest .inner { color: red; }');
      assert.equal(
        ampersand,
        '.outer { &.v-nest { .mid { &.v-nest { .inner { color: red; } } } } }'
      );
      assert.notEqual(flat, ampersand);
    });
  });

  it(':global 块内扁平 .card:global .title 去掉附着 :global', async () => {
    const css = await runPostcssScope(
      '.card { :global { .card:global .title { color: red; } } }',
      scopeOpts
    );
    assert.equal(
      css,
      '.card { *.v-nest { .card .title { color: red; } } }'
    );
  });

  it('&:scope 显式块替换为 &.v-nest', async () => {
    const css = await runPostcssScope(
      '.card { &:scope { color: cyan; .inner { margin: 0; } } }',
      scopeOpts
    );
    assert.equal(
      css,
      '.card { &.v-nest { color: cyan; .inner { margin: 0; } } }'
    );
  });

  it('附着式 .wrap:scope 嵌套块', async () => {
    const css = await runPostcssScope(
      '.card { .wrap:scope { .inner { margin: 0; } } }',
      scopeOpts
    );
    assert.equal(
      css,
      '.card { .wrap.v-nest { .inner { margin: 0; } } }'
    );
  });

  it('透传 className：嵌套 .skin-a:scope { .child-card__body } 块', async () => {
    const css = await runPostcssScope(
      '.skin-a:scope { .child-card__body { border-left: 4px solid #0969da; } }',
      scopeOpts
    );
    assert.equal(
      css,
      '.skin-a.v-nest { .child-card__body { border-left: 4px solid #0969da; } }'
    );
  });

  it('透传 className：嵌套 .skin-a { &:scope .child-card__body } 单行选择器', async () => {
    const css = await runPostcssScope(
      '.skin-a { &:scope .child-card__body { padding: 12px; } }',
      scopeOpts
    );
    assert.equal(
      css,
      '.skin-a { &.v-nest .child-card__body { padding: 12px; } }'
    );
  });

  it('透传 className：扁平 .skin-a:scope 与嵌套 &:scope 展开后等价', async () => {
    const flat = await runPostcssScope(
      '.skin-a:scope .child-card__body { padding: 12px; }',
      scopeOpts
    );
    const nestedBlock = await runPostcssScope(
      '.skin-a { &:scope { .child-card__body { padding: 12px; } } }',
      scopeOpts
    );
    const nestedInline = await runPostcssScope(
      '.skin-a { &:scope .child-card__body { padding: 12px; } }',
      scopeOpts
    );
    assert.equal(flat, '.skin-a.v-nest .child-card__body { padding: 12px; }');
    assert.equal(
      nestedBlock,
      '.skin-a { &.v-nest { .child-card__body { padding: 12px; } } }'
    );
    assert.equal(
      nestedInline,
      '.skin-a { &.v-nest .child-card__body { padding: 12px; } }'
    );
  });

  it('透传 className：默认嵌套仅叶子挂 scope，无法把 scope 锚在透传 class', async () => {
    const css = await runPostcssScope(
      '.skin-a { .child-card__body { padding: 12px; } }',
      scopeOpts
    );
    assert.equal(
      css,
      '.skin-a { .child-card__body.v-nest { padding: 12px; } }'
    );
  });

  it('&:global 内再嵌套裸 :global：保留 &.scope 与 *.scope 占位', async () => {
    const css = await runPostcssScope(
      '.card { &:global { :global { .ext { color: red; } } } }',
      scopeOpts
    );
    assert.equal(css, '.card { &.v-nest { *.v-nest { .ext { color: red; } } } }');
  });

  it('&:scope 锚点下多层嵌套叶子不再挂 scope', async () => {
    const css = await runPostcssScope(
      '.card { &:scope { .middle { .deep { border: 0; } } } }',
      scopeOpts
    );
    assert.equal(
      css,
      '.card { &.v-nest { .middle { .deep { border: 0; } } } }'
    );
  });

  it('&:scope 块内 :global 与嵌套 :scope', async () => {
    const css = await runPostcssScope(
      `.card {
  &:scope {
    color: cyan;
    .inner { margin: 0; }
    :global { .ext { padding: 0; } }
    :scope { .deep { border: 0; } }
  }
}`,
      scopeOpts
    );
    assert.equal(
      css,
      `.card {
  &.v-nest {
    color: cyan;
    .inner { margin: 0; }
    *.v-nest { .ext { padding: 0; } }
    *.v-nest { .deep { border: 0; } }
  }
}`
    );
  });

  describe('裸包装 vs &: 包装占位对比', () => {
    it('对比：:global / &:global 块内 .ext 不挂 scope，块外 .local 挂 scope', async () => {
      const bare = await runPostcssScope(
        '.card { :global { .ext { color: red; } } .local { color: blue; } }',
        scopeOpts
      );
      const ampersand = await runPostcssScope(
        '.card { &:global { .ext { color: red; } } .local { color: blue; } }',
        scopeOpts
      );
      assert.equal(
        bare,
        '.card { *.v-nest { .ext { color: red; } } .local.v-nest { color: blue; } }'
      );
      assert.equal(
        ampersand,
        '.card { &.v-nest { .ext { color: red; } } .local.v-nest { color: blue; } }'
      );
    });

    it('对比：.card 下连续 global 裸 *.scope 双层 vs &:global &.scope 双层', async () => {
      const bare = await runPostcssScope(
        '.card { :global { :global { .reset { color: red; } } } }',
        scopeOpts
      );
      const ampersand = await runPostcssScope(
        '.card { &:global { &:global { .reset { color: red; } } } }',
        scopeOpts
      );
      assert.equal(bare, '.card { *.v-nest { *.v-nest { .reset { color: red; } } } }');
      assert.equal(ampersand, '.card { &.v-nest { &.v-nest { .reset { color: red; } } } }');
    });

    it('对比：根级连续 global 完全展平', async () => {
      const bare = await runPostcssScope(
        ':global { :global { .reset { color: red; } } }',
        scopeOpts
      );
      const ampersand = await runPostcssScope(
        ':global { &:global { .reset { color: red; } } }',
        scopeOpts
      );
      assert.equal(bare, '.reset { color: red; }');
      assert.equal(ampersand, '.reset { color: red; }');
    });

    it('对比：:global / &:global 内裸 :scope 子块为 *.scope', async () => {
      const bare = await runPostcssScope(
        '.card { :global { :scope { .scoped { color: red; } } } }',
        scopeOpts
      );
      const ampersand = await runPostcssScope(
        '.card { &:global { :scope { .scoped { color: red; } } } }',
        scopeOpts
      );
      assert.equal(bare, '.card { *.v-nest { *.v-nest { .scoped { color: red; } } } }');
      assert.equal(ampersand, '.card { &.v-nest { *.v-nest { .scoped { color: red; } } } }');
    });

    it('对比：:scope / &:scope 单层包装块占位', async () => {
      const bare = await runPostcssScope(
        '.card { :scope { .inner { margin: 0; } } }',
        scopeOpts
      );
      const ampersand = await runPostcssScope(
        '.card { &:scope { .inner { margin: 0; } } }',
        scopeOpts
      );
      assert.equal(bare, '.card { *.v-nest { .inner { margin: 0; } } }');
      assert.equal(ampersand, '.card { &.v-nest { .inner { margin: 0; } } }');
    });

    it('对比：多层 :scope 裸 *.scope vs &:scope &.scope', async () => {
      const bare = await runPostcssScope(
        '.card { :scope { :scope { .deep { border: 0; } } } }',
        scopeOpts
      );
      const ampersand = await runPostcssScope(
        '.card { &:scope { &:scope { .deep { border: 0; } } } }',
        scopeOpts
      );
      assert.equal(bare, '.card { *.v-nest { *.v-nest { .deep { border: 0; } } } }');
      assert.equal(ampersand, '.card { &.v-nest { &.v-nest { .deep { border: 0; } } } }');
    });

    it('对比：:scope / &:scope 块含声明与子 rule（&:scope 锚在父选择器）', async () => {
      const bare = await runPostcssScope(
        '.card { :scope { color: cyan; .inner { margin: 0; } } }',
        scopeOpts
      );
      const ampersand = await runPostcssScope(
        '.card { &:scope { color: cyan; .inner { margin: 0; } } }',
        scopeOpts
      );
      assert.equal(
        bare,
        '.card { *.v-nest { color: cyan; .inner { margin: 0; } } }'
      );
      assert.equal(
        ampersand,
        '.card { &.v-nest { color: cyan; .inner { margin: 0; } } }'
      );
    });

    it('对比：&:global 内再嵌裸 :global（外层 &.scope、内层 *.scope）', async () => {
      const bare = await runPostcssScope(
        '.card { :global { :global { .ext { color: red; } } } }',
        scopeOpts
      );
      const mixed = await runPostcssScope(
        '.card { &:global { :global { .ext { color: red; } } } }',
        scopeOpts
      );
      assert.equal(bare, '.card { *.v-nest { *.v-nest { .ext { color: red; } } } }');
      assert.equal(mixed, '.card { &.v-nest { *.v-nest { .ext { color: red; } } } }');
    });

    it('对比：&:scope 块内裸 :global 与裸 :scope（*.scope）', async () => {
      const bare = await runPostcssScope(
        `.card {
  :scope {
    color: cyan;
    .inner { margin: 0; }
    :global { .ext { padding: 0; } }
    :scope { .deep { border: 0; } }
  }
}`,
        scopeOpts
      );
      const ampersand = await runPostcssScope(
        `.card {
  &:scope {
    color: cyan;
    .inner { margin: 0; }
    :global { .ext { padding: 0; } }
    :scope { .deep { border: 0; } }
  }
}`,
        scopeOpts
      );
      const bareExpected = `.card {
  *.v-nest {
    color: cyan;
    .inner { margin: 0; }
    *.v-nest { .ext { padding: 0; } }
    *.v-nest { .deep { border: 0; } }
  }
}`;
      const ampersandExpected = `.card {
  &.v-nest {
    color: cyan;
    .inner { margin: 0; }
    *.v-nest { .ext { padding: 0; } }
    *.v-nest { .deep { border: 0; } }
  }
}`;
      assert.equal(bare, bareExpected);
      assert.equal(ampersand, ampersandExpected);
    });
  });

  it('@media 内嵌套 rule 仅叶子 scope', async () => {
    const css = await runPostcssScope(
      '@media (min-width: 768px) { .card { .title { color: red; } } }',
      scopeOpts
    );
    assert.equal(
      css,
      '@media (min-width: 768px) { .card { .title.v-nest { color: red; } } }'
    );
  });

  it('shouldApplyScope：非叶子不 scope，global 子树叶子不 scope', () => {
    const postcss = require('postcss');
    const root = postcss.parse('.a { .b { color: red; } }');
    const outer = root.first;
    const inner = outer.nodes.find((n) => n.type === 'rule');
    assert.equal(isRuleTreeLeaf(outer), false);
    assert.equal(isRuleTreeLeaf(inner), true);
    assert.equal(shouldApplyScope(outer), false);
    assert.equal(shouldApplyScope(inner), true);

    const globalRoot = postcss.parse('.card { :global { .ext {} } }');
    const card = globalRoot.first;
    const globalWrap = card.nodes.find((n) => n.type === 'rule');
    const ext = globalWrap.nodes.find((n) => n.type === 'rule');
    assert.equal(isInGlobalSubtree(ext), true);
    assert.equal(shouldApplyScope(ext), false);
  });
});
