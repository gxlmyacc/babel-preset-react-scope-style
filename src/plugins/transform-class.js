const { 
  isReactComponent, importSpecifier, expr2str, ClassNames, LibraryClassNames 
} = require('../utils');
const options = require('../options');

module.exports = function ({ types: t, template }) {
  const CLASSNAMES = ClassNames;
  const classAttrs = options.classAttrs;
  
  function JSXAttributeVisitor(path) {
    if (!classAttrs.includes(path.node.name.name)
      || !t.isJSXExpressionContainer(path.node.value)
      || (t.isCallExpression(path.node.value.expression) 
        && expr2str(path.node.value.expression.callee) === CLASSNAMES)) return;

    if (!this.libraryVarSpecifier) {
      this.libraryVarSpecifier = importSpecifier(path, `${CLASSNAMES},default`, LibraryClassNames);
    }
    path.node.value.expression = template('$RCS($EXPR$)')({
      $RCS: this.libraryVarSpecifier.local.name,
      $EXPR$: path.node.value.expression
    }).expression;
  }

  return {
    visitor: {
      Program: {
        enter(path) {
          if (!isReactComponent(path)) return;

          const ctx = {
            libraryVarSpecifier: null
          };
          path.traverse({
            JSXAttribute: JSXAttributeVisitor
          }, ctx);
        },
      },
    }
  };
};
