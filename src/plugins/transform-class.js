const {
  isReactComponent, importSpecifier, expr2str, ClassNames, LibraryClassNames, existClassAttrName,
  getImportSpecifier,
} = require('../utils');
const options = require('../options');

module.exports = function ({ types: t, template }) {
  const scope = Boolean(options.scope);
  const classAttrs = options.classAttrs;

  function JSXAttributeVisitor(path) {
    let tagName = path.parent && expr2str(path.parent.name);
    let arrtName = expr2str(path.node.name);
    if (!classAttrs.some(classAttrName => existClassAttrName(classAttrName, arrtName, tagName))
      || !t.isJSXExpressionContainer(path.node.value)) return;

    let expression = path.node.value.expression;
    if (t.isStringLiteral(expression)
      || t.isTemplateLiteral(expression)
      || (t.isCallExpression(expression) && expr2str(expression.callee) === this.CLASSNAMES)) return;

    if (!this.libraryVarSpecifier) {
      this.libraryVarSpecifier = importSpecifier(path, `${this.CLASSNAMES},default`, LibraryClassNames);
    }
    path.node.value.expression = template('$RCS($EXPR$)')({
      $RCS: this.libraryVarSpecifier.local.name,
      $EXPR$: expression
    }).expression;
  }

  return {
    visitor: {
      Program: {
        enter(path) {
          if (!scope || !isReactComponent(path)) return;

          let libraryVarSpecifier = getImportSpecifier(path, LibraryClassNames);
          const ctx = {
            libraryVarSpecifier,
            CLASSNAMES: libraryVarSpecifier ? expr2str(libraryVarSpecifier.imported || libraryVarSpecifier.local) : ClassNames
          };
          path.traverse({
            JSXAttribute: JSXAttributeVisitor
          }, ctx);
        },
      },
    }
  };
};
