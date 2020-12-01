const t = require('@babel/types');
const findUp = require('find-up');
const fs = require('fs');
const path = require('path');
const template = require('@babel/template').default;

const ScopeName = 'scope-style';
const ClassNames = 'classNames';
const LibraryClassNames = 'classnames';

function formatDate(date, fmt) {
  let o = {
    'M+': date.getMonth() + 1,
    'd+': date.getDate(),
    'h+': date.getHours(),
    'm+': date.getMinutes(),
    's+': date.getSeconds(),
    'q+': Math.floor((date.getMonth() + 3) / 3),
    S: date.getMilliseconds()
  };
  if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (date.getFullYear() + '').substr(4 - RegExp.$1.length));
  Object.keys(o).forEach(k => {
    if (new RegExp('(' + k + ')').test(fmt)) {
      fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (('00' + o[k]).substr(('' + o[k]).length)));
    }
  });
  return fmt;
};

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

function isImportLibrary(path, libraryName = LibraryName) {
  let declaration = getImportDeclarations(path).find(node => node.source.value === libraryName);
  // path.traverse({
  //   ImportDeclaration(path) {
  //     if (path.node.source.value === libraryName) declaration = path.node;
  //     path.stop();
  //   },
  // });
  return declaration;
}

function arr2Expression(arr, parent) {
  let temp = '';
  let vars = {};
  arr.forEach((v, i) => {
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
      objStr = expr2str(expr.object);
  }
  let propIsMember = expr.property.type === 'MemberExpression';
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


function isImportSpecifier(path, specifierName, declaration, libraryName = LibraryName) {
  let declarations;
  if (!declaration) {
    if (libraryName) declaration = isImportLibrary(path, libraryName);
    else declarations = getImportDeclarations(path);
  } 
  if (declaration) declarations = [declaration];
  let ret;
  declarations && declarations.some(item => ret = item.specifiers.find(v => v.local.name === specifierName));
  return ret;
}

function importSpecifier(path, specifierName, libraryName = LibraryName) {
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

function importDefaultSpecifier(path, specifierName, libraryName = LibraryName) {
  return importSpecifier(path, `${specifierName},default`, libraryName);
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

  var2Expression,
  arr2Expression,
  obj2Expression,

  memberExpr2Str,
  expr2str,

  isImportSpecifier,
  importSpecifier,
  importDefaultSpecifier,
}