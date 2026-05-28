const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const postcss = require('postcss');
const t = require('@babel/types');
const { parse } = require('@babel/core');
const {
  runPostcssScope,
  multiScopeContexts,
  resetScopeOptions,
} = require('./helpers');
const utils = require('../src/utils');

/**
 * 执行 webpack loader，可覆盖 getOptions。
 * @param {string} content - CSS
 * @param {string} request - 请求
 * @param {object} [opts] - 选项
 * @param {object|null} [meta] - meta
 * @param {() => object|undefined} [opts.getOptions] - getOptions 实现
 * @returns {Promise<{ css: string, meta?: object }>}
 */
function runLoader(content, request, opts = {}, meta = null, getOptions) {
  const loader = require('../loader/index');
  const dir = path.join(process.cwd(), 'fixtures');
  const resource = request.split('?')[0];
  const absolute = path.isAbsolute(resource) ? resource : path.join(dir, resource);
  const queryPart = request.includes('?') ? request.slice(request.indexOf('?')) : '';
  const fullRequest = `${absolute}${queryPart}`;

  return new Promise((resolve, reject) => {
    const done = (err, code, map, outMeta) => {
      if (err) reject(err);
      else resolve({ css: code, map, meta: outMeta });
    };
    const ctx = {
      context: dir,
      rootContext: process.cwd(),
      resourcePath: absolute,
      resource: fullRequest,
      resourceQuery: queryPart,
      request: fullRequest,
      loaderIndex: 0,
      loaders: [{ request: fullRequest }],
      remainingRequest: absolute,
      getRemainingRequest: () => absolute,
      getCurrentRequest: () => fullRequest,
      getOptions: getOptions || (() => opts),
      emitWarning() {},
      async: () => done,
      callback: done,
    };
    loader.call(ctx, content, null, meta);
  });
}

describe('分支覆盖 — loader', () => {
  it('getOptions 返回 undefined 时使用空 options', async () => {
    const query = 'scope-style&scoped=true&id=v-noopt';
    const { css } = await runLoader(
      '.z { zoom: 1; }',
      `z.css?${query}`,
      {},
      null,
      () => undefined
    );
    assert.equal(css, '.z.v-noopt { zoom: 1; }');
  });

  it('scope-style query 缺少 id 时透传', async () => {
    const input = '.a { color: red; }';
    const { css } = await runLoader(input, 'a.css?scope-style&scoped=true');
    assert.equal(css, input);
  });

  it('有 meta 但无 ast 时正常运行', async () => {
    const query = 'scope-style&scoped=true&id=v-noast';
    const { css } = await runLoader('.n { }', `n.css?${query}`, {}, {});
    assert.equal(css, '.n.v-noast { }');
  });

  it('meta.ast 类型非 postcss 时忽略', async () => {
    const query = 'scope-style&scoped=true&id=v-meta';
    const { css } = await runLoader(
      '.m { margin: 0; }',
      `m.css?${query}`,
      {},
      { ast: { type: 'other-loader', version: '8.0.0', root: null } }
    );
    assert.equal(css, '.m.v-meta { margin: 0; }');
  });
});

describe('分支覆盖 — PostCSS 插件', () => {
  it('pluginOptions 为 null 时不抛错', () => {
    const pluginCore = require('../postcss/plugin');
    const runner = pluginCore(null);
    const root = postcss.parse('.d { display: block; }');
    assert.doesNotThrow(() => runner(root, { parse: postcss.parse }));
    assert.equal(root.toString(), '.d { display: block; }');
  });

  it('无 url() 的 @import 保持不变', async () => {
    const css = await runPostcssScope(
      '@import "./plain.css";\n.btn { color: red; }',
      { scoped: true, id: 'v-plain' }
    );
    assert.equal(css, '@import "./plain.css";\n.btn.v-plain { color: red; }');
  });

  it('追加多 scope 块时使用 helpers.parse', async () => {
    const pluginCore = require('../postcss/plugin');
    const root = postcss.parse('.chip { padding: 2px; }');
    let customParseUsed = false;
    const runner = pluginCore(multiScopeContexts(['v-p1', 'v-p2']));
    runner(root, {
      parse(cssText) {
        customParseUsed = true;
        return postcss.parse(cssText);
      },
    });
    assert.ok(customParseUsed);
    const out = root.toString();
    assert.equal(
      out,
      '.chip.v-p1 { padding: 2px; }\n.chip.v-p2 { padding: 2px; }'
    );
  });

  it('无 ?scoped 且无 scopeFn 时保留 import url', async () => {
    resetScopeOptions();
    const css = await runPostcssScope(
      '@import url("./lib.css?global");\n.x { }',
      { scoped: true, id: 'v-url' }
    );
    assert.equal(css, '@import url("./lib.css?global");\n.x.v-url { }');
  });

  it('normalizeNodes 合并时去掉重复的普通 @import', () => {
    const pluginCore = require('../postcss/plugin');
    const nodes = [
      postcss.atRule({ name: 'import', params: "'./dup.css'" }),
      postcss.atRule({ name: 'import', params: "'./dup.css'" }),
      postcss.rule({ selector: '.a', nodes: [] }),
    ];
    pluginCore.normalizeNodes(nodes);
    assert.equal(nodes.filter((n) => n.type === 'atrule' && n.name === 'import').length, 1);
    assert.equal(nodes[0].type, 'atrule');
    assert.equal(nodes[1].selector, '.a');
  });

  it('insertScopeStyleImportAfterAnchor 无锚点时 prepend', () => {
    const pluginCore = require('../postcss/plugin');
    const root = postcss.parse('.x { color: red; }');
    const rule = postcss.atRule({
      name: 'import',
      params: "url('./orphan.scss?scope-style&scoped=true&id=v-orphan')",
    });
    pluginCore.insertScopeStyleImportAfterAnchor(root, rule);
    assert.equal(root.nodes[0].name, 'import');
    assert.match(root.nodes[0].params, /id=v-orphan/);
    assert.equal(root.nodes[1].selector, '.x');
  });

  it('insertScopeStyleImportAfterAnchor 插入到同名 import 组末尾', () => {
    const pluginCore = require('../postcss/plugin');
    const root = postcss.parse(
      [
        "@import url('./partial.scss?scope-style&scoped=true&id=v-a');",
        "@import url('./partial.scss?scope-style&scoped=true&id=v-b');",
        '.x { }',
      ].join('\n')
    );
    const rule = postcss.atRule({
      name: 'import',
      params: "url('./partial.scss?scope-style&scoped=true&id=v-c')",
    });
    pluginCore.insertScopeStyleImportAfterAnchor(root, rule);
    const imports = root.nodes.filter((n) => n.type === 'atrule' && n.name === 'import');
    assert.equal(imports.length, 3);
    assert.match(imports[2].params, /id=v-c/);
    assert.equal(root.nodes[3].selector, '.x');
  });

  it('pluginOptions 为函数时按 root 返回配置', () => {
    const pluginCore = require('../postcss/plugin');
    const root = postcss.parse('.fn { opacity: 1; }');
    const runner = pluginCore(() => ({ scoped: true, id: 'v-fn-root' }));
    runner(root);
    assert.equal(root.toString(), '.fn.v-fn-root { opacity: 1; }');
  });

  it('多 scope 合并未传入 helpers.parse 时使用 postcss.parse', () => {
    const pluginCore = require('../postcss/plugin');
    const root = postcss.parse('.dual { gap: 0; }');
    pluginCore(multiScopeContexts(['v-d1', 'v-d2']))(root);
    assert.equal(
      root.toString(),
      '.dual.v-d1 { gap: 0; }\n.dual.v-d2 { gap: 0; }'
    );
  });

  it('applyScopeOptionToRoot：scoped 为 false 时仅处理 import', () => {
    const pluginCore = require('../postcss/plugin');
    const pkgOpts = require('../src/options');
    const root = postcss.parse('.only-import { color: red; }');
    pluginCore.applyScopeOptionToRoot(
      root,
      { scoped: false, id: 'v-skip-sel' },
      {
        scopeRegx: pkgOpts.scopeRegx,
        scopeFn: null,
      }
    );
    assert.equal(root.toString(), '.only-import { color: red; }');
  });

  it('import url 不匹配 scopeRegx 时保持原样', async () => {
    resetScopeOptions();
    const css = await runPostcssScope(
      '@import url("https://cdn.example.com/fonts.woff");\n.box { }',
      { scoped: true, id: 'v-cdn' }
    );
    assert.equal(
      css,
      '@import url("https://cdn.example.com/fonts.woff");\n.box.v-cdn { }'
    );
  });

  it('options.scope 作为 scopeFn 改写 ?scoped import', async () => {
    resetScopeOptions({
      scope: (p1, query, meta) => {
        assert.equal(meta.scopeId, 'v-scope-opt');
        return p1 + query;
      },
    });
    const css = await runPostcssScope(
      '@import url("./via-scope-opt.scss?scoped");\n.r { }',
      { scoped: true, id: 'v-scope-opt' }
    );
    assert.equal(
      css,
      '@import url("./via-scope-opt.scss?scope-style&scoped=true&id=v-scope-opt");\n.r.v-scope-opt { }'
    );
  });

  it('同时配置 scopeFn 与 scope 时优先使用 scopeFn', async () => {
    resetScopeOptions({
      scopeFn: (p1) => `${p1}?from-scopeFn`,
      scope: (p1) => `${p1}?from-scope`,
    });
    const css = await runPostcssScope(
      '@import url("./pri.scss?global");\n.z { }',
      { scoped: true, id: 'v-pri' }
    );
    assert.equal(css, '@import url("./pri.scss?from-scopeFn");\n.z.v-pri { }');
  });
});

describe('分支覆盖 — utils', () => {
  it('expr2str 处理后缀自增与 getter 对象方法', () => {
    assert.equal(
      utils.expr2str(t.updateExpression('++', t.identifier('i'), false)),
      'i++'
    );
    const getter = t.objectMethod(
      'get',
      t.identifier('value'),
      [],
      t.blockStatement([])
    );
    assert.equal(utils.expr2str(getter), 'get value(){}');
  });

  it('isRequired 忽略非字符串 import 源', () => {
    const ast = parse("import React from 'react';", { babelrc: false, configFile: false });
    ast.program.body[0].source.type = 'NumericLiteral';
    ast.program.body[0].source.value = 1;
    const traverse = require('@babel/traverse').default;
    let found = true;
    traverse(ast, {
      Program(programPath) {
        found = utils.isRequired(programPath, 'react');
        programPath.stop();
      },
    });
    assert.equal(found, false);
  });

  it('importSpecifier 向已有声明追加命名 import', () => {
    const ast = parse("import { cn } from 'classnames';", { babelrc: false, configFile: false });
    const programPath = {
      node: ast.program,
      isProgram: () => true,
      findParent: () => null,
      unshiftContainer(_k, node) { this.node.body.unshift(node); },
    };
    const childPath = { ...programPath, isProgram: () => false, findParent: () => programPath };
    const spec = utils.importSpecifier(childPath, 'alias,cn', 'classnames');
    assert.equal(spec.local.name, 'alias');
  });

  it('getImportSpecifier 解析命名导出', () => {
    const ast = parse("import { cn } from 'classnames';", { babelrc: false, configFile: false });
    const programPath = {
      node: ast.program,
      isProgram: () => true,
      findParent: () => null,
    };
    const childPath = { ...programPath, isProgram: () => false, findParent: () => programPath };
    const spec = utils.getImportSpecifier(childPath, 'classnames', 'cn');
    assert.equal(spec.local.name, 'cn');
  });

  it('var2Expression 对已有 AST 节点原样返回', () => {
    const id = t.identifier('keep');
    assert.equal(utils.var2Expression(id), id);
  });

  it('包未 import 时 importSpecifier 新建 import', () => {
    const ast = parse("import React from 'react';", { babelrc: false, configFile: false });
    const programPath = {
      node: ast.program,
      isProgram: () => true,
      findParent: () => null,
      unshiftContainer(_k, node) { this.node.body.unshift(node); },
    };
    const childPath = { ...programPath, isProgram: () => false, findParent: () => programPath };
    utils.importSpecifier(childPath, 'cn,default', 'classnames');
    assert.ok(ast.program.body.some(
      (n) => n.type === 'ImportDeclaration' && n.source.value === 'classnames'
    ));
  });

  it('包未 import 时 getImportSpecifier 返回 null', () => {
    const ast = parse("import React from 'react';", { babelrc: false, configFile: false });
    const programPath = {
      node: ast.program,
      isProgram: () => true,
      findParent: () => null,
    };
    const childPath = { ...programPath, isProgram: () => false, findParent: () => programPath };
    assert.equal(utils.getImportSpecifier(childPath, 'classnames'), null);
  });
});
