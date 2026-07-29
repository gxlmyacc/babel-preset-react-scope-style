const fs = require('fs');
const path = require('path');
const { injectScopeLoader } = require('../lib/inject-scope-loader');

/**
 * 解析本仓库内 SWC WASM 插件绝对路径。
 * @returns {string|null} 存在则返回路径，否则 null
 */
function resolveBundledSwcPluginPath() {
  const candidates = [
    path.join(__dirname, '../swc/swc_plugin_react_scope_style.wasm'),
  ];
  return candidates.find((p) => fs.existsSync(p)) || null;
}

/**
 * 从 cwd 的 package.json 读取 name/version，供 scopeId 哈希使用。
 * @returns {{ name: string, version: string }|undefined}
 */
function readPkgFromCwd() {
  try {
    const pkgPath = path.join(process.cwd(), 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    return { name: pkg.name || '', version: pkg.version || '' };
  } catch {
    return undefined;
  }
}

/**
 * 合并 experimental.swcPlugins，避免覆盖用户已有项。
 * @param {object} nextConfig - 原始 next 配置
 * @param {string} wasmPath - WASM 绝对路径
 * @param {object} pluginOptions - 传给 SWC 插件的选项
 * @returns {object} 含 experimental.swcPlugins 的配置片段
 */
function mergeSwcPlugins(nextConfig, wasmPath, pluginOptions) {
  const prevExperimental = nextConfig.experimental || {};
  const prevPlugins = Array.isArray(prevExperimental.swcPlugins)
    ? prevExperimental.swcPlugins.slice()
    : [];
  const already = prevPlugins.some((entry) => {
    const id = Array.isArray(entry) ? entry[0] : entry;
    return id === wasmPath || (typeof id === 'string' && id.includes('swc_plugin_react_scope_style'));
  });
  if (!already) {
    prevPlugins.push([wasmPath, pluginOptions]);
  }
  return {
    experimental: {
      ...prevExperimental,
      swcPlugins: prevPlugins,
    },
  };
}

/**
 * Turbopack 选项的副作用说明（Next 14.2）。
 * 不要写入 `experimental.turbo`：在 14.2 上会使 `next build` 报错
 * “next build doesn't support turbopack yet”。
 * CSS 通道依赖 `process.env.TURBOPACK` + PostCSS from-query。
 * @param {object} nextConfig - 原始 next 配置
 * @returns {object} 空对象（保留用户已有 turbo/turbopack 字段）
 */
function mergeTurbopackStub(nextConfig) {
  // 用户若已自行配置 turbopack / experimental.turbo，原样保留在 nextConfig 中。
  void nextConfig;
  return {};
}

/**
 * 生成 Turbopack 用的 PostCSS 配置片段（from-query 通道）。
 * Webpack 路径请勿同时启用（用 `process.env.TURBOPACK` 分流），以免与 loader 双重 scope。
 * @returns {{ plugins: Record<string, object> }}
 */
function createTurbopackPostcssPlugins() {
  return {
    plugins: {
      'babel-preset-react-scope-style/postcss': {},
    },
  };
}

/**
 * Next.js 配置包装器：向 webpack 样式链路注入 scope-style loader。
 * 默认仍需 `babel.config.js`（含 `next/babel` 与本 preset）才能走 Babel。
 * 传入 `swcPlugin: true` 时额外挂载 Phase B SWC WASM（可省略 Babel，仅 Webpack CSS）。
 * 传入 `turbopack: true` 时声明 turbo stub，并提示 CSS 走 PostCSS from-query（见文档）。
 * @param {object} [nextConfig={}] - 原始 next.config 对象
 * @param {object} [options={}] - 集成选项
 * @param {object} [options.loaderOptions] - 传给 scope loader 的 options（如 sourceMap）
 * @param {boolean|string} [options.swcPlugin] - `true` 使用内置 WASM；字符串为自定义 WASM 路径
 * @param {object} [options.swcPluginOptions] - 传给 SWC 插件的 camelCase 选项（如 scopePrefix、pkg）
 * @param {boolean} [options.turbopack] - 启用 Turbopack CSS 接线（PostCSS from-query；见 phase-b-swc.md）
 * @returns {object} 包装后的 Next.js 配置
 */
function withReactScopeStyle(nextConfig = {}, options = {}) {
  const {
    loaderOptions = {},
    swcPlugin = false,
    swcPluginOptions = {},
    turbopack: enableTurbopack = false,
  } = options;

  let config = { ...nextConfig };

  if (swcPlugin) {
    const wasmPath = typeof swcPlugin === 'string'
      ? path.resolve(swcPlugin)
      : resolveBundledSwcPluginPath();
    if (!wasmPath) {
      throw new Error(
        '[withReactScopeStyle] SWC plugin WASM not found. Run `npm run build:swc-plugin` '
        + 'or pass options.swcPlugin as an absolute .wasm path.'
      );
    }
    const pluginOpts = {
      ...swcPluginOptions,
      pkg: swcPluginOptions.pkg || readPkgFromCwd(),
    };
    config = {
      ...config,
      ...mergeSwcPlugins(config, wasmPath, pluginOpts),
    };
  }

  if (enableTurbopack) {
    config = {
      ...config,
      ...mergeTurbopackStub(config),
    };
  }

  return {
    ...config,
    /**
     * 合并用户 webpack 钩子并注入 scope loader。
     * @param {import('webpack').Configuration} webpackConfig - Next 生成的 webpack 配置
     * @param {object} webpackOptions - Next webpack 上下文
     * @returns {import('webpack').Configuration}
     */
    webpack(webpackConfig, webpackOptions) {
      injectScopeLoader(webpackConfig, loaderOptions);

      if (typeof nextConfig.webpack === 'function') {
        return nextConfig.webpack(webpackConfig, webpackOptions);
      }
      return webpackConfig;
    },
  };
}

module.exports = withReactScopeStyle;
module.exports.default = withReactScopeStyle;
module.exports.withReactScopeStyle = withReactScopeStyle;
module.exports.injectScopeLoader = injectScopeLoader;
module.exports.resolveBundledSwcPluginPath = resolveBundledSwcPluginPath;
module.exports.createTurbopackPostcssPlugins = createTurbopackPostcssPlugins;
module.exports.mergeTurbopackStub = mergeTurbopackStub;
