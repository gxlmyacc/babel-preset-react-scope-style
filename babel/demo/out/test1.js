"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _react = _interopRequireDefault(require("react"));

var _classnames = _interopRequireDefault(require("classnames"));

require("./test.scss");

require("./index.scss?scope-style&scoped=true&id=v-f63d7abe");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Date.prototype.toString.call(Reflect.construct(Date, [], function () {})); return true; } catch (e) { return false; } }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var App = /*#__PURE__*/function (_Rainbow$Component) {
  _inherits(App, _Rainbow$Component);

  var _super = _createSuper(App);

  function App(props) {
    _classCallCheck(this, App);

    return _super.call(this, props);
  }

  _createClass(App, [{
    key: "cc",
    value: function cc() {
      return <div className="v-f63d7abe test"></div>;
    }
  }, {
    key: "render",
    value: function render() {
      var a = true;
      var ret = <div className="v-f63d7abe">
        <div className={(0, _classnames.default)(["v-f63d7abe", "demo-class ".concat(this.namespace)])}></div>
        <div className={(0, _classnames.default)(["v-f63d7abe", ['class-a', 'class-b', {
          'class-c': true,
          'class-d': this.props.show
        }]])}></div>
        <div className={(0, _classnames.default)(["v-f63d7abe", {
          a: true
        }])}></div>
      </div>;
      if (a) ret = <span className={(0, _classnames.default)(["v-f63d7abe", ['a', 'b']])}></span>;else ret = <p className="v-f63d7abe"></p>;
      console.log('ddd', ret);
      return ret; // return this.cc();
      // return a && <div>dd</div>
    }
  }], [{
    key: "data",
    value: function data() {
      return {};
    }
  }]);

  return App;
}(Rainbow.Component);

_defineProperty(App, "methods", {
  dd: function dd() {
    return <div className="v-f63d7abe test"></div>;
  }
});

var _default = App;
exports.default = _default;