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

describe('coverage branches — loader', () => {
  it('uses empty options when getOptions returns undefined', async () => {
    const query = 'scope-style&scoped=true&id=v-noopt';
    const { css } = await runLoader(
      '.z { zoom: 1; }',
      `z.css?${query}`,
      {},
      null,
      () => undefined
    );
    assert.match(css, /\.z\.v-noopt/);
  });

  it('passes through when scope-style query lacks id', async () => {
    const input = '.a { color: red; }';
    const { css } = await runLoader(input, 'a.css?scope-style&scoped=true');
    assert.equal(css, input);
  });

  it('runs when meta is present without ast', async () => {
    const query = 'scope-style&scoped=true&id=v-noast';
    const { css } = await runLoader('.n { }', `n.css?${query}`, {}, {});
    assert.match(css, /\.n\.v-noast/);
  });

  it('ignores meta.ast when type is not postcss', async () => {
    const query = 'scope-style&scoped=true&id=v-meta';
    const { css } = await runLoader(
      '.m { margin: 0; }',
      `m.css?${query}`,
      {},
      { ast: { type: 'other-loader', version: '8.0.0', root: null } }
    );
    assert.match(css, /\.m\.v-meta/);
  });
});

describe('coverage branches — postcss plugin', () => {
  it('accepts null pluginOptions without throwing', () => {
    const pluginCore = require('../postcss/plugin');
    const runner = pluginCore(null);
    const root = postcss.parse('.d { display: block; }');
    assert.doesNotThrow(() => runner(root, { parse: postcss.parse }));
    assert.match(root.toString(), /\.d\s*\{/);
  });

  it('leaves @import without url() unchanged', async () => {
    const css = await runPostcssScope(
      '@import "./plain.css";\n.btn { color: red; }',
      { scoped: true, id: 'v-plain' }
    );
    assert.match(css, /@import "\.\/plain\.css"/);
    assert.match(css, /\.btn\.v-plain/);
  });

  it('uses helpers.parse when appending multi-scope blocks', async () => {
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
    assert.match(out, /\.chip\.v-p1/);
    assert.match(out, /\.chip\.v-p2/);
  });

  it('keeps import url when scoped suffix is absent and scopeFn missing', async () => {
    resetScopeOptions();
    const css = await runPostcssScope(
      '@import url("./lib.css?global");\n.x { }',
      { scoped: true, id: 'v-url' }
    );
    assert.match(css, /lib\.css\?global/);
    assert.doesNotMatch(css, /scope-style/);
  });
});

describe('coverage branches — utils', () => {
  it('expr2str handles postfix update and get object method', () => {
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
    assert.match(utils.expr2str(getter), /get value/);
  });

  it('isRequired ignores non-string import sources', () => {
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

  it('importSpecifier adds named import to existing declaration', () => {
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

  it('getImportSpecifier resolves named export', () => {
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

  it('var2Expression returns existing AST nodes as-is', () => {
    const id = t.identifier('keep');
    assert.equal(utils.var2Expression(id), id);
  });

  it('importSpecifier creates new import when package missing', () => {
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

  it('getImportSpecifier returns null when package not imported', () => {
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
