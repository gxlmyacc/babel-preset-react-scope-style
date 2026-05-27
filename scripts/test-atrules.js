const { runPostcssScope } = require('../test/helpers');

const scopeOpts = { scoped: true, id: 'v-nest' };

const cases = [
  ['@charset + rule', '@charset "UTF-8";\n.btn { color: red; }'],
  [
    '@color-profile',
    '@color-profile --swop {\n  rendering-intent: relative-colorimetric;\n}\n.btn { color: red; }',
  ],
  ['@container', '@container (min-width: 400px) {\n  .panel { display: block; }\n}'],
  ['@scope (native)', '@scope (.card) {\n  .title { color: blue; }\n}'],
  ['@layer', '@layer base {\n  .a { color: red; }\n}'],
  ['@starting-style', '@starting-style {\n  .box { opacity: 0; }\n}'],
  ['@property', '@property --x {\n  syntax: "<color>";\n  inherits: false;\n  initial-value: red;\n}\n.btn { color: var(--x); }'],
];

(async () => {
  // eslint-disable-next-line no-restricted-syntax
  for (const [name, css] of cases) {
    console.log(`\n=== ${name} ===`);
    try {
      console.log(await runPostcssScope(css, scopeOpts));
    } catch (e) {
      console.log('ERROR:', e.message);
    }
  }
})();
