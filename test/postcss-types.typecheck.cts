import postcss from 'postcss';
import scopeStyle, { type PostcssScopeStyleOptions } from 'babel-preset-react-scope-style/postcss';
import legacyScopeStyle from 'babel-preset-react-scope-style/postcss/postcss8';

const options: PostcssScopeStyleOptions = {
  scoped: true,
  injectScope: false,
  selectorPrefix: '.history-snapshot',
  selectorPrefixExclude: ['html', 'body', ':root', '.external'],
  transformSelector(selector, { filename }) {
    const source: string = filename;
    return source.endsWith('TableSummaryCell.scss') ? `.summary ${selector}` : selector;
  },
};
postcss([scopeStyle(options), legacyScopeStyle(options)]);
postcss([scopeStyle([{ scoped: true, id: 'v-test' }, options])]);
postcss([scopeStyle((root) => root.nodes.length ? options : null)]);
postcss([scopeStyle()]);

// @ts-expect-error injectScope 必须是布尔值。
scopeStyle({ scoped: true, injectScope: 'false' });
// @ts-expect-error 回调必须返回选择器字符串。
scopeStyle({ scoped: true, injectScope: false, transformSelector: () => 1 });

// @ts-expect-error 前缀必须是 CSS 选择器字符串。
scopeStyle({ scoped: true, injectScope: false, selectorPrefix: true });

// @ts-expect-error 排除项必须是字符串数组。
scopeStyle({ scoped: true, injectScope: false, selectorPrefixExclude: true });
