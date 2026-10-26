const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const postcss = require('postcss');
const scopeStyle = require('../postcss');
const { runPostcssScope, transformWithPreset, resetScopeOptions } = require('./helpers');

const unscoped = { scoped: true, injectScope: false };

/**
 * 取输出中的选择器，关键帧保持原样以便同时验证跳过行为。
 * @param {string} css 输出 CSS。
 * @returns {string[]} 选择器列表。
 */
function selectors(css) {
  const values = [];
  postcss.parse(css).walkRules((rule) => values.push(...rule.selectors));
  return values;
}

describe('PostCSS 无注入模式和自定义选择器', () => {
  it('默认和显式开启时保持现有的 local/global 输出', async () => {
    await Promise.all([false, true].map(async (global) => {
      const opts = { scoped: true, id: 'v-test', global };
      const css = '.a:scope > .b, .c:hover { color: red; }';
      assert.equal(await runPostcssScope(css, { ...opts, injectScope: true }), await runPostcssScope(css, opts));
      assert.equal(await runPostcssScope('.a { color: red; }', { ...opts, injectScope: false }), '.a { color: red; }');
    }));
  });

  it('关闭注入后无需 id；附着式、独立 scope 和组合符均产生有效选择器', async () => {
    const css = await runPostcssScope(`
      .table:scope > .cell, :scope > .child, .table :scope .cell,
      &:scope, :scope:hover, :scope::before, :scope { color: red; }
    `, unscoped);
    assert.deepEqual(selectors(css), [
      '.table > .cell', '* > .child', '.table * .cell', '&', ':hover', '::before', '*',
    ]);
    assert.doesNotMatch(css, /:scope|\[class\*=\]/);
  });

  it('关闭注入后处理 leading、attached、spaced 和连续 global 标记', async () => {
    const css = await runPostcssScope(`
      :global .reset, :global .root:scope { color: red; }
      .plain, :global .mixed:scope { margin: 0; }
      .card:global .child { color: blue; }
      .card :global .ext :global .inner { color: green; }
      .card:scope :global .last { color: black; }
    `, unscoped);
    assert.deepEqual(selectors(css), [
      '.reset', '.root', '.plain', '.mixed', '.card .child', '.card * .ext * .inner', '.card .last',
    ]);
  });

  it('保留函数伪类和属性字符串；清理其中实际的 scope 伪类', async () => {
    const css = await runPostcssScope('.a:is(:scope, .b), .a:not(:scope), [data-label=":scope,:global"]:scope { color: red; }', unscoped);
    assert.deepEqual(selectors(css), ['.a:is(*, .b)', '.a:not(*)', '[data-label=":scope,:global"]']);
  });

  it('原生嵌套保留 * 与 & 的层级占位，global 子树中也不遗留 scope', async () => {
    const css = await runPostcssScope(`
      :global { .reset { margin: 0; } }
      .card {
        color: red;
        :scope { .local { color: blue; } }
        :global { .ext:scope { color: green; } }
        &:scope { opacity: 1; }
        &:global { opacity: 0.5; }
        & :scope { display: block; }
        & :global { display: flex; }
      }
    `, unscoped);
    assert.doesNotMatch(css, /:scope|:global|v-test/);
    assert.deepEqual(selectors(css), ['.reset', '.card', '*', '.local', '*', '.ext', '&', '&', '*', '*']);
  });

  it('媒体规则转换标记，普通和带前缀的关键帧都保持原样', async () => {
    const seen = [];
    const css = await runPostcssScope(`
      @media (min-width: 1px) { .a:scope { animation: fade 1s; } }
      @keyframes fade { from { opacity: 0; } 50%, to { opacity: 1; } }
      @-webkit-keyframes fade { from { opacity: 0; } to { opacity: 1; } }
    `, { ...unscoped, transformSelector: (selector) => { seen.push(selector); return `.snapshot ${selector}`; } });
    assert.deepEqual(seen, ['.a']);
    assert.deepEqual(selectors(css), ['.snapshot .a', 'from', '50%', 'to', 'from', 'to']);
    assert.match(css, /animation: fade 1s/);
  });

  it('无注入模式移除 import 的 scoped 后缀，不传播 hash，保留普通 import', async () => {
    const input = '@import url("./child.css?scoped"); @import url("./plain.css?global"); .a:scope { color: red; }';
    const css = await runPostcssScope(input, { ...unscoped, id: 'v-unused' });
    assert.equal(css, '@import url("./child.css"); @import url("./plain.css?global"); .a { color: red; }');
    assert.equal(await runPostcssScope(input, { scoped: false }), input);
  });


  it('自定义 import 改写函数在无注入模式接收空 query 和空 id', async () => {
    const seen = [];
    resetScopeOptions({
      scopeFn(filename, query, meta) {
        seen.push({ filename, query, scopeId: meta.scopeId });
        return `${filename}?custom`;
      },
    });
    try {
      const css = await runPostcssScope('@import url("./child.scss?scoped"); .cell {}', unscoped);
      assert.equal(css, '@import url("./child.scss?custom"); .cell {}');
      assert.deepEqual(seen, [{ filename: '.scss', query: '', scopeId: '' }]);
    } finally {
      resetScopeOptions();
    }
  });

  it('逐条回调逗号选择器，保留函数和属性中的逗号，提供原始文件路径', async () => {
    const seen = [];
    const result = await postcss([scopeStyle({
      ...unscoped,
      transformSelector(selector, { filename }) {
        seen.push({ selector, filename });
        return `.summary ${selector}`;
      },
    })]).process('.a:scope:is(.b, .c), [data-x="a,b"] { color: red; }', { from: '/src/TableSummaryCell.scss' });
    assert.deepEqual(seen.map((item) => item.selector), ['.a:is(.b, .c)', '[data-x="a,b"]']);
    seen.forEach(({ filename }) => assert.match(filename.replace(/\\/g, '/'), /\/src\/TableSummaryCell\.scss$/));
    assert.deepEqual(selectors(result.css), ['.summary .a:is(.b, .c)', '.summary [data-x="a,b"]']);
  });

  it('回调可区分同一个 AST 中不同规则的源文件', async () => {
    const root = postcss.root();
    root.append(postcss.parse('.cell:scope { padding: 8px; }', { from: '/src/TableBodyCell.scss' }).nodes);
    root.append(postcss.parse('.cell:scope { padding: 12px; }', { from: '/src/TableSummaryCell.scss' }).nodes);
    const result = await postcss([scopeStyle({
      ...unscoped,
      transformSelector(selector, { filename }) {
        return `${filename.endsWith('TableBodyCell.scss') ? '.body' : '.summary'} ${selector}`;
      },
    })]).process(root, { from: undefined });
    assert.deepEqual(selectors(result.css), ['.body .cell', '.summary .cell']);
  });

  it('无源文件时回调 filename 为空，原生嵌套按相对选择器逐条回调', async () => {
    const seen = [];
    await runPostcssScope('.card { &:scope { color: red; } .cell { padding: 8px; } }', {
      ...unscoped,
      transformSelector(selector, context) {
        seen.push([selector, context.filename]);
        return selector;
      },
    });
    assert.deepEqual(seen, [['.card', ''], ['&', ''], ['.cell', '']]);
  });

  it('默认注入模式下回调接收包含 hash 的结果和 global 选择器', async () => {
    const css = await runPostcssScope('.a:scope { color: red; } :global .reset { margin: 0; }', {
      scoped: true,
      id: 'v-hook',
      transformSelector: (selector) => `.host ${selector}`,
    });
    assert.deepEqual(selectors(css), ['.host .a.v-hook', '.host .reset']);
  });

  it('from-query 推导上下文时保留新配置及回调', async () => {
    const result = await postcss([scopeStyle({
      injectScope: false,
      transformSelector(selector, { filename }) {
        assert.ok(filename.endsWith('a.css'));
        return `.host ${selector}`;
      },
    })]).process('.a:scope { color: red; }', {
      from: '/src/a.css?scope-style&scoped=true&id=v-query',
    });
    assert.deepEqual(selectors(result.css), ['.host .a']);
  });

  it('动态配置、多个 scope 及同 id 的不同注入模式可以同时处理', async () => {
    const css = await runPostcssScope('.a:scope { color: red; }', () => [
      { scoped: true, id: 'v-one', transformSelector: (selector) => `.one ${selector}` },
      { scoped: true, id: 'v-one', injectScope: false, transformSelector: (selector) => `.snapshot ${selector}` },
      { scoped: true, id: 'v-two', transformSelector: (selector) => `.two ${selector}` },
    ]);
    assert.deepEqual(new Set(selectors(css)), new Set(['.one .a.v-one', '.snapshot .a', '.two .a.v-two']));
  });

  it('重复处理无回调的无注入样式结果稳定，传入 id 也不会泄漏到输出', async () => {
    const once = await runPostcssScope('.a:scope > .b { color: red; }', { ...unscoped, id: 'v-hidden' });
    assert.equal(await runPostcssScope(once, unscoped), once);
    assert.doesNotMatch(once, /v-hidden/);
  });

  it('回调异常直接报告，空或非字符串返回值产生可定位的错误', async () => {
    const error = new Error('custom selector failed');
    await assert.rejects(runPostcssScope('.a {}', {
      ...unscoped, transformSelector: () => { throw error; },
    }), (actual) => actual === error);
    await Promise.all(['', ' ', undefined, null, 1].map(async (value) => {
      await assert.rejects(
        runPostcssScope(
          '.a {}',
          { ...unscoped, transformSelector: () => value }
        ),
        /transformSelector must return/
      );
    }));
  });


  it('统一前缀限制普通、global 和媒体规则，跳过关键帧且保留声明', async () => {
    const css = await runPostcssScope(`
      .table:scope, .cell { color: red; }
      :global .external { margin: 0; }
      @media (min-width: 1px) { .header { padding: 8px; } }
      @supports (display: flex) { .body { display: flex; } }
      @keyframes fade { from { opacity: 0; } to { opacity: 1; } }
    `, { ...unscoped, selectorPrefix: '.history-snapshot' });
    assert.deepEqual(selectors(css), [
      '.history-snapshot .table', '.history-snapshot .cell', '.history-snapshot .external',
      '.history-snapshot .header', '.history-snapshot .body', 'from', 'to',
    ]);
    assert.match(css, /color: red/);
    assert.match(css, /padding: 8px/);
  });

  it('原生嵌套只给最外层加前缀，含声明的 global 根包装也受容器限制', async () => {
    const css = await runPostcssScope(`
      .table { color: red; .cell { padding: 8px; } @media (min-width: 1px) { &:scope { opacity: 1; } } }
      :global { .reset { margin: 0; } }
    `, { ...unscoped, selectorPrefix: '.history-snapshot' });
    assert.deepEqual(selectors(css), ['.history-snapshot .table', '&', '.cell', '&', '.history-snapshot .reset']);
    assert.doesNotMatch(css, /\.history-snapshot \.history-snapshot/);
  });

  it('回调先处理业务选择器，统一前缀最后添加并兼容默认作用域', async () => {
    const seen = [];
    const css = await runPostcssScope('.cell:scope { padding: 12px; }', {
      scoped: true,
      id: 'v-summary',
      selectorPrefix: '.history-snapshot',
      transformSelector(selector) {
        seen.push(selector);
        return `.summary ${selector}`;
      },
    });
    assert.deepEqual(seen, ['.cell.v-summary']);
    assert.deepEqual(selectors(css), ['.history-snapshot .summary .cell.v-summary']);
  });

  it('多个容器和回调返回的选择器列表均逐条加前缀，函数内逗号保持原样', async () => {
    const css = await runPostcssScope('.cell {}', {
      ...unscoped,
      selectorPrefix: '.snapshot:is(.a, .b), .preview',
      transformSelector: () => '.summary .cell, .body .cell',
    });
    assert.deepEqual(selectors(css), [
      '.snapshot:is(.a, .b) .summary .cell', '.preview .summary .cell',
      '.snapshot:is(.a, .b) .body .cell', '.preview .body .cell',
    ]);
  });

  it('from-query 模式同样保留容器前缀，空前缀保持原有输出', async () => {
    const result = await postcss([scopeStyle({ injectScope: false, selectorPrefix: '.snapshot' })])
      .process('.cell:scope {}', { from: '/src/a.css?scope-style&scoped=true&id=v-query' });
    assert.deepEqual(selectors(result.css), ['.snapshot .cell']);
    assert.equal(await runPostcssScope('.cell {}', { ...unscoped, selectorPrefix: '  ' }), '.cell {}');
  });


  it('默认按单条选择器跳过 html/head/body/:root，global 类名仍添加前缀', async () => {
    const css = await runPostcssScope(`
      :global html, :global head, :global body, :global :root, .table { color: red; }
      :global html.dark > body.page .cell, .cell { padding: 8px; }
      :global BODY::before, :global .reset { margin: 0; }
    `, { ...unscoped, selectorPrefix: '.history-snapshot' });
    assert.deepEqual(selectors(css), [
      'html', 'head', 'body', ':root', '.history-snapshot .table',
      'html.dark > body.page .cell', '.history-snapshot .cell',
      'BODY::before', '.history-snapshot .reset',
    ]);
  });

  it('自定义排除项替换默认值，空数组允许根选择器也添加前缀', async () => {
    const input = 'body, .external:hover, #reset, .table { color: red; }';
    const css = await runPostcssScope(input, {
      ...unscoped, selectorPrefix: '.snapshot', selectorPrefixExclude: ['.external', '#reset'],
    });
    assert.deepEqual(selectors(css), ['.snapshot body', '.external:hover', '#reset', '.snapshot .table']);
    const forced = await runPostcssScope(':global body, :root {}', {
      ...unscoped, selectorPrefix: '.snapshot', selectorPrefixExclude: [],
    });
    assert.deepEqual(selectors(forced), ['.snapshot body', '.snapshot :root']);
  });

  it('排除判断不误匹配类名、属性值、函数内部的标签或部分标签名', async () => {
    const css = await runPostcssScope('.body, [data-name="body"], .table:not(body), bodyguard, :is(body, .table) {}', {
      ...unscoped, selectorPrefix: '.snapshot',
    });
    assert.deepEqual(selectors(css), [
      '.snapshot .body', '.snapshot [data-name="body"]', '.snapshot .table:not(body)',
      '.snapshot bodyguard', '.snapshot :is(body, .table)',
    ]);
  });

  it('排除项依据回调后的选择器判断，不影响标记处理和回调执行', async () => {
    const seen = [];
    const css = await runPostcssScope('.cell:scope {} :global body {}', {
      ...unscoped,
      selectorPrefix: '.snapshot',
      selectorPrefixExclude: ['.external'],
      transformSelector(selector) {
        seen.push(selector);
        return selector === '.cell' ? '.external .cell, .table .cell' : selector;
      },
    });
    assert.deepEqual(seen, ['.cell', 'body']);
    assert.deepEqual(selectors(css), ['.external .cell', '.snapshot .table .cell', '.snapshot body']);
  });

  it('排除项兼容多个容器、媒体规则及 from-query 配置', async () => {
    const result = await postcss([scopeStyle({
      injectScope: false, selectorPrefix: '.snapshot, .preview', selectorPrefixExclude: ['body', '.external'],
    })]).process('@media print { :global body, .external, .cell {} }', {
      from: '/src/a.css?scope-style&scoped=true&id=v-query',
    });
    assert.deepEqual(selectors(result.css), ['body', '.external', '.snapshot .cell', '.preview .cell']);
  });

  it('仅执行 PostCSS 不改变 JS 侧生成和注入的作用域标识', async () => {
    const source = 'import "./a.scss?scoped"; export const App = () => <div className="a" />;';
    const before = transformWithPreset(source);
    await runPostcssScope('.a:scope { color: red; }', unscoped);
    const after = transformWithPreset(source);
    assert.equal(after, before);
    assert.match(after, /scope-style&scoped=true&id=v-/);
    assert.match(after, /className="v-/);
  });
});
