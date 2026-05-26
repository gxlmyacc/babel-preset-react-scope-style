const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const t = require('@babel/types');
const { parse } = require('@babel/core');
const utils = require('../src/utils');

describe('utils', () => {
  it('fileExists returns true for existing path', () => {
    assert.equal(utils.fileExists(require.resolve('../package.json')), true);
  });

  it('fileExists returns false for missing path', () => {
    assert.equal(utils.fileExists('/nonexistent-path-xyz/package.json'), false);
  });

  it('createScopeQuery builds global and scoped queries', () => {
    assert.equal(utils.createScopeQuery('v-1', false), '?scope-style&scoped=true&id=v-1');
    assert.equal(utils.createScopeQuery('v-', true), '?scope-style&scoped=true&global=true&id=v-');
  });

  it('existClassAttrName supports function matcher', () => {
    const fn = (name) => name === 'data-class';
    assert.equal(utils.existClassAttrName(fn, 'data-class', 'div'), true);
    assert.equal(utils.existClassAttrName(fn, 'className', 'div'), false);
  });

  it('expr2str covers common node types', () => {
    assert.equal(utils.expr2str('raw'), 'raw');
    assert.equal(utils.expr2str(t.identifier('foo')), 'foo');
    assert.equal(utils.expr2str(t.jsxIdentifier('className')), 'className');
    assert.equal(utils.expr2str(t.jsxNamespacedName(t.jsxIdentifier('x'), t.jsxIdentifier('y'))), 'x:y');
    assert.equal(utils.expr2str(t.thisExpression()), 'this');
    assert.equal(utils.expr2str(t.nullLiteral()), 'null');
    assert.equal(utils.expr2str(t.regExpLiteral('ab', 'g')), '/ab/g');
    assert.equal(utils.expr2str(t.binaryExpression('+', t.numericLiteral(1), t.numericLiteral(2))), '1 + 2');
    assert.equal(utils.expr2str(t.unaryExpression('!', t.booleanLiteral(true))), '!true');
    assert.equal(utils.expr2str(t.conditionalExpression(
      t.booleanLiteral(true),
      t.stringLiteral('a'),
      t.stringLiteral('b')
    )), 'true ? a : b');
    assert.equal(utils.expr2str(t.callExpression(t.identifier('fn'), [t.numericLiteral(1)])), 'fn(1)');
    assert.equal(utils.expr2str(t.newExpression(t.identifier('Date'), [])), 'new Date()');
    assert.equal(utils.expr2str(t.templateLiteral(
      [t.templateElement({ raw: 'hi', cooked: 'hi' }, true)],
      []
    )), '`hi`');
    assert.equal(utils.expr2str({ type: 'UnknownType' }), '');
  });

  it('var2Expression converts primitives and structures', () => {
    assert.equal(utils.var2Expression('a').type, 'StringLiteral');
    assert.equal(utils.var2Expression(true).type, 'BooleanLiteral');
    assert.equal(utils.var2Expression(1).type, 'NumericLiteral');
    assert.equal(utils.var2Expression(null).type, 'NullLiteral');
    assert.equal(utils.var2Expression(/x/i).type, 'RegExpLiteral');
    assert.equal(utils.var2Expression(new Date(0)).type, 'ExpressionStatement');
    assert.equal(utils.var2Expression({ a: 1 }).type, 'ObjectExpression');
    assert.ok(utils.var2Expression([1, 2]));
    assert.equal(utils.var2Expression(undefined), undefined);
    // eslint-disable-next-line symbol-description
    assert.equal(utils.var2Expression(Symbol()).type, 'Identifier');
  });

  it('isRequired detects react import', () => {
    const traverse = require('@babel/traverse').default;
    const ast = parse("import React from 'react'; export default () => null;", {
      babelrc: false,
      configFile: false,
    });
    let hasReact = false;
    let hasVue = false;
    traverse(ast, {
      Program(programPath) {
        hasReact = utils.isRequired(programPath, 'react');
        hasVue = utils.isRequired(programPath, 'vue');
        programPath.stop();
      },
    });
    assert.equal(hasReact, true);
    assert.equal(hasVue, false);
  });

  it('importSpecifier adds and reuses library import', () => {
    const ast = parse("import React from 'react';", { babelrc: false, configFile: false });
    const programPath = {
      node: ast.program,
      isProgram: () => true,
      findParent: () => null,
      unshiftContainer(key, node) {
        this.node.body.unshift(node);
      },
    };
    const childPath = { ...programPath, isProgram: () => false, findParent: () => programPath };
    const spec = utils.importSpecifier(childPath, 'cn,default', 'classnames');
    assert.equal(spec.local.name, 'cn');
    const again = utils.importSpecifier(childPath, 'cn,default', 'classnames');
    assert.equal(again.local.name, 'cn');
    const named = utils.importDefaultSpecifier(childPath, 'cx', 'clsx');
    assert.equal(named.local.name, 'cx');
  });

  it('resolveClassNameLibrary uses clsx in auto when only clsx is imported', () => {
    const ast = parse("import cx from 'clsx';", { babelrc: false, configFile: false });
    const programPath = {
      node: ast.program,
      isProgram: () => true,
      findParent: () => null,
    };
    const childPath = { ...programPath, isProgram: () => false, findParent: () => programPath };
    const lib = utils.resolveClassNameLibrary(childPath, 'auto');
    assert.equal(lib.libraryName, 'clsx');
    assert.equal(lib.calleeName, 'cx');
  });

  it('resolveClassNameLibrary prefers classnames over clsx in auto when both imported', () => {
    const ast = parse(
      "import cx from 'clsx'; import cn from 'classnames';",
      { babelrc: false, configFile: false }
    );
    const programPath = {
      node: ast.program,
      isProgram: () => true,
      findParent: () => null,
    };
    const childPath = { ...programPath, isProgram: () => false, findParent: () => programPath };
    const lib = utils.resolveClassNameLibrary(childPath, 'auto');
    assert.equal(lib.libraryName, 'classnames');
    assert.equal(lib.calleeName, 'cn');
  });

  it('expr2str handles member and object method nodes', () => {
    const obj = t.memberExpression(t.identifier('a'), t.identifier('b'));
    assert.equal(utils.expr2str(obj), 'a.b');
    const nested = t.memberExpression(obj, t.identifier('c'));
    assert.equal(utils.expr2str(nested), 'a.b.c');
    const method = t.objectMethod(
      'method',
      t.identifier('fn'),
      [t.identifier('x')],
      t.blockStatement([])
    );
    assert.match(utils.expr2str(method), /fn\(x\)/);
  });

  it('isImportSpecifier matches named import', () => {
    const ast = parse("import { foo } from 'bar';", { babelrc: false, configFile: false });
    const programPath = {
      node: ast.program,
      isProgram: () => true,
      findParent: () => null,
    };
    const childPath = { ...programPath, isProgram: () => false, findParent: () => programPath };
    const decl = utils.isImportLibrary(childPath, 'bar');
    assert.ok(utils.isImportSpecifier(childPath, 'foo', decl));
  });

  it('resolveClassNameLibrary honors prefer classnames', () => {
    const ast = parse("import cn from 'classnames';", { babelrc: false, configFile: false });
    const programPath = {
      node: ast.program,
      isProgram: () => true,
      findParent: () => null,
    };
    const childPath = { ...programPath, isProgram: () => false, findParent: () => programPath };
    const lib = utils.resolveClassNameLibrary(childPath, 'classnames');
    assert.equal(lib.libraryName, 'classnames');
  });

  it('importDefaultSpecifier delegates to importSpecifier', () => {
    const ast = parse("import React from 'react';", { babelrc: false, configFile: false });
    const programPath = {
      node: ast.program,
      isProgram: () => true,
      findParent: () => null,
      unshiftContainer(_k, node) { this.node.body.unshift(node); },
    };
    const childPath = { ...programPath, isProgram: () => false, findParent: () => programPath };
    const spec = utils.importDefaultSpecifier(childPath, 'cn', 'classnames');
    assert.equal(spec.local.name, 'cn');
  });

  it('getImportSpecifier finds named export', () => {
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

  it('isRequired with empty name list returns true', () => {
    const ast = parse('export default 1;', { babelrc: false, configFile: false });
    const traverse = require('@babel/traverse').default;
    let result;
    traverse(ast, {
      Program(programPath) {
        result = utils.isRequired(programPath, []);
        programPath.stop();
      },
    });
    assert.equal(result, true);
  });

  it('existClassAttrName returns undefined when attrName missing', () => {
    assert.equal(utils.existClassAttrName('className', undefined, 'div'), undefined);
  });

  it('temp2var interpolates template expressions', () => {
    const expr = t.templateLiteral(
      [
        t.templateElement({ raw: 'a', cooked: 'a' }, false),
        t.templateElement({ raw: 'b', cooked: 'b' }, true),
      ],
      [t.identifier('x')]
    );
    // eslint-disable-next-line no-template-curly-in-string
    assert.equal(utils.expr2str(expr), '`${x}ab`');
  });

  it('var2Expression handles function values', () => {
    const expr = utils.var2Expression(function demo() { return 1; });
    assert.ok(expr);
  });

  it('arr2Expression skips undefined entries', () => {
    const stmt = utils.arr2Expression([1, undefined, 2]);
    assert.equal(stmt.type, 'ExpressionStatement');
    assert.equal(stmt.expression.type, 'ArrayExpression');
    assert.equal(stmt.expression.elements.length, 2);
  });

  it('obj2Expression skips undefined property values', () => {
    const expr = utils.obj2Expression({ a: 1, b: undefined });
    assert.equal(expr.properties.length, 1);
  });

  it('memberExpr2Str handles JSXMemberExpression and bracket props', () => {
    const jsxMember = t.jsxMemberExpression(
      t.jsxIdentifier('a'),
      t.jsxIdentifier('b')
    );
    assert.equal(utils.memberExpr2Str(jsxMember), 'a.b');
    const bracket = t.memberExpression(
      t.identifier('obj'),
      t.memberExpression(t.identifier('a'), t.identifier('b')),
      true
    );
    assert.equal(utils.memberExpr2Str(bracket), 'obj[a.b]');
  });

  it('expr2str covers spread tagged template and declarations', () => {
    assert.equal(
      utils.expr2str(t.spreadElement(t.identifier('rest'))),
      '...rest'
    );
    assert.match(
      utils.expr2str(t.taggedTemplateExpression(
        t.identifier('tag'),
        t.templateLiteral([t.templateElement({ raw: '', cooked: '' }, true)], [])
      )),
      /tag`/
    );
    assert.match(
      utils.expr2str(t.functionExpression(t.identifier('fn'), [], t.blockStatement([]))),
      /function fn/
    );
    assert.match(
      utils.expr2str(t.variableDeclarator(t.identifier('x'), t.numericLiteral(1))),
      /= 1$/
    );
    assert.equal(
      utils.expr2str(t.variableDeclarator(t.identifier('y'))),
      '[object Object]'
    );
    assert.match(
      utils.expr2str(t.variableDeclaration('const', [
        t.variableDeclarator(t.identifier('z'), t.numericLiteral(0)),
      ])),
      /const .+ = 0;/
    );
    assert.match(
      utils.expr2str(t.arrayExpression([t.numericLiteral(1), t.numericLiteral(2)])),
      /\[1, 2\]/
    );
    assert.match(
      utils.expr2str(t.objectExpression([
        t.objectProperty(t.identifier('k'), t.stringLiteral('v')),
      ])),
      /k: v/
    );
    assert.match(
      utils.expr2str(t.objectProperty(
        t.stringLiteral('key'),
        t.numericLiteral(1),
        true
      )),
      /\[key\]: 1/
    );
    assert.match(
      utils.expr2str(t.arrayPattern([t.identifier('a')])),
      /\[a\]/
    );
    assert.match(
      utils.expr2str(t.objectPattern([
        t.objectProperty(t.identifier('p'), t.identifier('q')),
      ])),
      /p: q/
    );
    assert.equal(utils.expr2str(t.blockStatement([])), '{}');
    assert.equal(
      utils.expr2str(t.assignmentPattern(t.identifier('a'), t.numericLiteral(0))),
      'a = 0'
    );
  });

  it('isImportSpecifier resolves via libraryName and named import', () => {
    const ast = parse("import { foo } from 'bar';", { babelrc: false, configFile: false });
    const programPath = {
      node: ast.program,
      isProgram: () => true,
      findParent: () => null,
    };
    const childPath = { ...programPath, isProgram: () => false, findParent: () => programPath };
    const spec = utils.isImportSpecifier(childPath, 'foo', null, 'bar');
    assert.equal(spec.local.name, 'foo');
    const missing = utils.isImportSpecifier(childPath, 'missing', null, 'bar');
    assert.equal(missing, undefined);
  });

  it('importSpecifier appends another default import alias', () => {
    const ast = parse("import cn from 'classnames';", { babelrc: false, configFile: false });
    const programPath = {
      node: ast.program,
      isProgram: () => true,
      findParent: () => null,
      unshiftContainer(_k, node) { this.node.body.unshift(node); },
    };
    const childPath = { ...programPath, isProgram: () => false, findParent: () => programPath };
    const extra = utils.importSpecifier(childPath, 'cn2,default', 'classnames');
    assert.equal(extra.local.name, 'cn2');
    assert.equal(programPath.node.body[0].specifiers.length, 2);
  });

  it('expr2str unwraps JSXExpressionContainer and assignment pattern', () => {
    assert.equal(
      utils.expr2str(t.jsxExpressionContainer(t.identifier('x'))),
      'x'
    );
    assert.equal(
      utils.expr2str(t.assignmentPattern(t.identifier('a'), t.numericLiteral(0))),
      'a = 0'
    );
  });

  it('isImportSpecifier scans all imports when declaration omitted', () => {
    const ast = parse("import { a } from 'lib-a'; import cn from 'classnames';", {
      babelrc: false,
      configFile: false,
    });
    const programPath = {
      node: ast.program,
      isProgram: () => true,
      findParent: () => null,
    };
    const childPath = { ...programPath, isProgram: () => false, findParent: () => programPath };
    const spec = utils.isImportSpecifier(childPath, 'cn,default');
    assert.equal(spec.local.name, 'cn');
  });

  it('isImportSpecifier rejects wrong specifier type for named import', () => {
    const ast = parse("import cn from 'classnames';", { babelrc: false, configFile: false });
    const programPath = {
      node: ast.program,
      isProgram: () => true,
      findParent: () => null,
    };
    const childPath = { ...programPath, isProgram: () => false, findParent: () => programPath };
    const decl = utils.isImportLibrary(childPath, 'classnames');
    assert.equal(utils.isImportSpecifier(childPath, 'cn,foo', decl), undefined);
  });
});
