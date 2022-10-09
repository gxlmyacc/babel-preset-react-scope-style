const t = require('@babel/types');
const fs = require('fs');
const template = require('@babel/template').default;

const ScopeName = 'scope-style';
const ClassNames = 'classNames';
const LibraryClassNames = 'classnames';

function fileExists(path) {
  try {
    return !fs.accessSync(path, fs.F_OK);
  } catch (e) {
    return false;
  }
}

function getImportDeclarations(path) {
  let program = path.isProgram() ? path : path.findParent(p => p.isProgram());
  return program.node.body.filter(node => t.isImportDeclaration(node));
}

function isImportLibrary(path, libraryName) {
  let declaration = getImportDeclarations(path).find(node => node.source.value === libraryName);
  return declaration;
}

function arr2Expression(arr, parent) {
  let temp = '';
  let vars = {};
  arr.forEach((v, i) => {
    // eslint-disable-next-line no-use-before-define
    let expr = var2Expression(v, arr);
    if (!expr) return;
    let key = `$${i}`;
    temp += (temp ? ', ' : '') + key;
    vars[key] = expr;
  });
  return template(`[${temp}]`)(vars);
}

function obj2Expression(obj, parent) {
  let props = Object.keys(obj).map(k => {
    let v = obj[k];
    // eslint-disable-next-line no-use-before-define
    let expr = var2Expression(v, obj);
    if (!expr) return;
    return t.objectProperty(t.identifier(k), expr);
  }).filter(Boolean);
  return t.objectExpression(props);
}

function var2Expression(v, parent) {
  if (t.isNode(v)) return v;
  if (v === undefined) return;
  if (Array.isArray(v)) return arr2Expression(v, parent);
  switch (typeof v) {
    case 'string': return t.stringLiteral(v);
    case 'boolean': return t.booleanLiteral(v);
    case 'number': return t.numericLiteral(v);
    case 'object':
      if (v === null) return t.nullLiteral();
      if (v instanceof RegExp) return t.regExpLiteral(v.source, v.flags);
      if (v instanceof Date) return template('new Date(TIME)')({ TIME: t.numericLiteral(v.getTime()) });
      if (v instanceof Function) return template(v.toString())();
      return obj2Expression(v, parent);
    default: return t.identifier('undefined');
  }
}


function memberExpr2Str(expr) {
  let objStr;
  const object = expr.object;
  if (!object) return String(expr.value);
  switch (expr.object.type) {
    case 'MemberExpression':
    case 'JSXMemberExpression':
      objStr = memberExpr2Str(expr.object);
      break;
    default:
      // eslint-disable-next-line no-use-before-define
      objStr = expr2str(expr.object);
  }
  let propIsMember = expr.property.type === 'MemberExpression';
  // eslint-disable-next-line no-use-before-define
  let propStr = expr2str(expr.property);
  return objStr + (objStr && !propIsMember ? '.' : '') + (propIsMember ? `[${propStr}]` : propStr);
}

function expr2str(expr) {
  if (!expr) return '';
  if (typeof expr === 'string') return expr;
  // if (expr.extra) return expr.extra.raw;
  switch (expr.type) {
    case 'JSXExpressionContainer':
      return expr2str(expr.expression);
    case 'MemberExpression':
    case 'JSXMemberExpression':
      return memberExpr2Str(expr);
    case 'Identifier':
    case 'JSXIdentifier':
      return expr.name;
    case 'JSXNamespacedName':
      return `${expr.namespace.name}:${expr.name.name}`;
    case 'ThisExpression':
      return 'this';
    case 'NumericLiteral':
    case 'BooleanLiteral':
    case 'StringLiteral':
      return expr.value;
    case 'NullLiteral':
      return 'null';
    case 'RegExpLiteral':
      return `/${expr.pattern}/${expr.flags}`;
    case 'SpreadElement':
      return `...${expr2str(expr.argument)}`;
    case 'BinaryExpression':
      return `${expr2str(expr.left)} ${expr.operator} ${expr2str(expr.right)}`;
    case 'UpdateExpression':
    case 'UnaryExpression':
      return `${expr.prefix ? expr.operator : ''}${expr2str(expr.argument)}${!expr.prefix ? expr.operator : ''}`;
    case 'ConditionalExpression':
      return `${expr2str(expr.test)} ? ${expr2str(expr.consequent)} : ${expr2str(expr.alternate)}`;
    case 'CallExpression':
      return `${expr2str(expr.callee)}(${expr.arguments.map(a => expr2str(a)).join(',')})`;
    case 'NewExpression':
      return `new ${expr2str(expr.callee)}(${expr.arguments.map(a => expr2str(a)).join(',')})`;
    case 'VariableDeclarator':
      return `${expr.id}${expr.init ? ` = ${expr2str(expr.init)}` : ''}`;
    case 'VariableDeclaration':
      return `${expr.kind} ${expr.declarations.map(d => expr2str(d))};`;
    case 'BlockStatement':
      return `{${expr2str(expr.body)}}`;
    case 'TemplateLiteral':
      // eslint-disable-next-line no-use-before-define
      return temp2var(expr);
    case 'TaggedTemplateExpression':
      return `${expr2str(expr2str(expr.tag))}${expr2str(expr.quasi)}`;
    case 'FunctionExpression':
      return `function ${expr2str(expr.id)}(${expr.params.map(a => expr2str(a)).join(',')})${expr2str(expr.body)}`;
    case 'AssignmentPattern':
      return `${expr2str(expr.left)} = ${expr2str(expr.right)}`;
    case 'ArrayExpression':
    case 'ArrayPattern':
      return `[${expr.elements.map(v => expr2str(v)).join(', ')}]`;
    case 'ObjectProperty':
      return `${expr.computed ? `[${expr2str(expr.key)}]` : expr2str(expr.key)}: ${expr2str(expr.value)}`;
    case 'ObjectMethod':
      // eslint-disable-next-line
      return `${expr.kind !== 'method' ? `${expr.kind} ` : ''}${expr2str(expr.key)}(${expr.params.map(a => expr2str(a)).join(', ')})${expr2str(expr.body)}`;
    case 'ObjectPattern':
    case 'ObjectExpression':
      return `{${expr.properties.map(v => expr2str(v)).join(', ')}}`;
    default: return '';
  }
}

function temp2var(expr) {
  let arr = [...expr.expressions, ...expr.quasis].sort((a, b) => a.start - b.start);
  let ret = '';
  arr.forEach(v => {
    if (v.type === 'TemplateElement') ret += v.value.raw;
    else ret += '${' + expr2str(v) + '}';
  });
  return '`' + ret + '`';
}


function isFunction(fn) {
  return typeof fn === 'function';
}

function isRequired(path, name) {
  const ctx = { imported: false };
  const names = Array.isArray(name) ? [...name] : [name];
  if (!names.length) return true;

  path.traverse({
    ImportDeclaration(path) {
      const { type, value } = path.node.source;
      if (type !== 'StringLiteral') return;
      const idx = names.indexOf(value);
      if (idx < 0) return;

      names.splice(idx, 1);

      if (!names.length) {
        this.imported = true;
        path.stop();
      }
    }
  }, ctx);
  return ctx.imported;
}

function isReactComponent(path) {
  return isRequired(path, 'react');
}


function isImportSpecifier(path, specifierName, declaration, libraryName) {
  let declarations;
  let [local, imported] = specifierName.split(',');
  if (!declaration) {
    if (libraryName) declaration = isImportLibrary(path, libraryName);
    else declarations = getImportDeclarations(path);
  }
  if (declaration) declarations = [declaration];
  let ret;
  declarations && declarations.some(item => ret = item.specifiers.find(v => {
    if (imported) {
      if (imported === 'default') {
        if (v.type !== 'ImportDefaultSpecifier') return;
      } else {
        if (v.type !== 'ImportSpecifier') return;
      }
    }
    return v.local.name === local;
  }));
  return ret;
}

function importSpecifier(path, specifierName, libraryName) {
  let declaration = isImportLibrary(path, libraryName);

  let [local, imported = specifierName] = specifierName.split(',');
  let specifier = imported === 'default'
    ? t.importDefaultSpecifier(t.identifier(local))
    : t.importSpecifier(t.identifier(local), t.identifier(imported));
  if (declaration) {
    if (!isImportSpecifier(path, specifierName, declaration)) {
      declaration.specifiers.push(specifier);
    }
  } else {
    let program = path.isProgram() ? path : path.findParent(p => p.isProgram());
    program.unshiftContainer('body',  t.importDeclaration(
      [specifier],
      t.stringLiteral(libraryName),
    ));
  }
  return specifier;
}

function importDefaultSpecifier(path, specifierName, libraryName) {
  return importSpecifier(path, `${specifierName},default`, libraryName);
}

function existClassAttrName(classAttrName, attrName, tagName) {
  if (!attrName) return;
  return typeof classAttrName === 'function'
    ? classAttrName(attrName, tagName)
    : attrName === classAttrName;
}

function createScopeQuery(scopeId, isGlobal) {
  return `?${ScopeName}&scoped=true${isGlobal ? '&global=true' : ''}&id=${scopeId}`;
}

function getImportSpecifier(path, libraryName, exportType = 'default') {
  let specifier = null;
  let declaration = isImportLibrary(path, LibraryClassNames);
  if (declaration) {
    specifier = declaration.specifiers.find(s => {
      if (exportType === 'default') {
        return s.type === 'ImportDefaultSpecifier';
      }
      return expr2str(s.local) === exportType;
    });
    // if (specifier) ret = expr2str(specifier.imported || specifier.local);
  }
  return specifier;
}

module.exports = {
  ScopeName,
  ClassNames,
  LibraryClassNames,

  fileExists,

  isFunction,
  isRequired,
  isReactComponent,
  isImportLibrary,
  getImportSpecifier,

  var2Expression,
  arr2Expression,
  obj2Expression,

  memberExpr2Str,
  expr2str,

  isImportSpecifier,
  importSpecifier,
  importDefaultSpecifier,

  existClassAttrName,
  createScopeQuery
};
