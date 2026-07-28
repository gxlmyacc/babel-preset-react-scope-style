const fs = require('fs');
const path = require('path');
const { transformSync } = require('@babel/core');
const { SCOPE_STYLE_QUERY_RE, processScopeStyleCss } = require('../lib/process-scope-css');
const { buildBabelTransformOptions, processStyleCss } = require('../lib/alias-config');
const {
  createLibScopeFn,
  resolveStyleSourcePath,
} = require('./lib-scope-bridge');

const STYLE_FILE_RE = /\.(css|scss|sass|less)$/i;
const STYLE_IMPORT_RE = /\.(css|scss|sass|less)(\?.*)?$/i;
const JS_EXT_RE = /\.(m?[jt]sx?)$/i;
const SCOPED_STYLE_NS = 'react-scope-style';

/**
 * 将 esbuild 模块路径拆分为磁盘路径与 query 段。
 * @param {string} modulePath - 可能含 `?scope-style&...` 的模块路径
 * @returns {{ filePath: string, query: string }} filePath 为真实文件路径，query 含前导 `?` 或为空
 */
function splitPathQuery(modulePath) {
  const normalized = modulePath.replace(/\\/g, '/');
  const qIdx = normalized.indexOf('?');
  if (qIdx === -1) {
    return { filePath: modulePath, query: '' };
  }
  return {
    filePath: modulePath.slice(0, qIdx),
    query: modulePath.slice(qIdx),
  };
}

/**
 * 根据源文件扩展名选择 esbuild onLoad 返回的 loader。
 * @param {string} filePath - 不含 query 的文件路径
 * @returns {'js'|'jsx'|'ts'|'tsx'}
 */
function resolveScriptLoader(filePath) {
  if (/\.tsx$/i.test(filePath)) return 'tsx';
  if (/\.ts$/i.test(filePath)) return 'ts';
  if (/\.jsx$/i.test(filePath)) return 'jsx';
  return 'js';
}

/**
 * 从候选目录解析可选 npm 包（如 sass、less）。
 * @param {string} moduleName - 包名
 * @param {string[]} searchDirs - 查找起点目录列表
 * @returns {object|null} 已加载模块，未找到时返回 null
 */
function resolveOptionalModule(moduleName, searchDirs) {
  // eslint-disable-next-line no-restricted-syntax
  for (const dir of searchDirs) {
    if (!dir) continue;
    try {
      return require(require.resolve(moduleName, { paths: [dir] }));
    } catch {
      // 继续尝试下一个目录
    }
  }
  return null;
}

/**
 * 将 SCSS/Sass/Less 编译为 CSS 文本。
 * @param {string} filePath - 样式源文件路径（不含 query）
 * @param {string} [rawContent] - 已读取的源文件内容（Less 需要）
 * @returns {Promise<string>} 编译后的 CSS
 */
async function compileStylePreprocessor(filePath, rawContent) {
  const searchDirs = [path.dirname(filePath), process.cwd()];

  if (/\.(scss|sass)$/i.test(filePath)) {
    const sass = resolveOptionalModule('sass', searchDirs);
    if (!sass) {
      throw new Error(
        'babel-preset-react-scope-style/esbuild: 编译 .scss/.sass 需要安装 `sass`（npm i -D sass）'
      );
    }
    return sass.compile(filePath, {
      loadPaths: [path.dirname(filePath)],
    }).css;
  }

  if (/\.less$/i.test(filePath)) {
    const less = resolveOptionalModule('less', searchDirs);
    if (!less) {
      throw new Error(
        'babel-preset-react-scope-style/esbuild: 编译 .less 需要安装 `less`（npm i -D less）'
      );
    }
    const result = await less.render(rawContent, {
      filename: filePath,
      paths: [path.dirname(filePath)],
    });
    return result.css;
  }

  return rawContent;
}

/**
 * esbuild 插件：对 JSX 执行 Babel scope 转换，并对样式走 PostCSS 作用域。
 * @param {import('../types').ScopeStyleOptions & { libMode?: boolean, styleScoped?: Map, rootDir?: string }} [userOptions={}] - preset 与插件选项
 * @returns {import('esbuild').Plugin}
 */
function reactScopeStyle(userOptions = {}) {
  const { loadScopePreset } = require('../lib/resolve-preset');
  const preset = loadScopePreset();
  const {
    libMode = false,
    styleScoped = null,
    rootDir = process.cwd(),
    aliasConfig = true,
    aliasMap = {},
    ...presetOptions
  } = userOptions;

  const babelOptions = { ...presetOptions };
  if (libMode) {
    if (!styleScoped) {
      throw new Error('reactScopeStyle: libMode 需要传入 styleScoped 桥接表');
    }
    babelOptions.scopeFn = createLibScopeFn(styleScoped, rootDir);
  }

  return {
    name: 'react-scope-style',
    setup(build) {
      build.onLoad({ filter: JS_EXT_RE }, async (args) => {
        if (args.path.replace(/\\/g, '/').includes('node_modules')) {
          return null;
        }

        const { filePath } = splitPathQuery(args.path);
        if (!JS_EXT_RE.test(filePath)) {
          return null;
        }

        const code = await fs.promises.readFile(filePath, 'utf8');
        const result = transformSync(code, buildBabelTransformOptions({
          filename: filePath,
          preset,
          babelOptions,
          rootDir,
          aliasConfig,
          sourceMaps: build.initialOptions.sourcemap !== false,
        }));
        /* c8 ignore next — transformSync 在有效源码下总会返回 code */
        if (!result || result.code == null) {
          return null;
        }

        return {
          contents: result.code,
          loader: resolveScriptLoader(filePath),
          resolveDir: path.dirname(filePath),
        };
      });

      build.onResolve({ filter: STYLE_IMPORT_RE }, (args) => {
        const { filePath, query: pathQuery } = splitPathQuery(args.path);
        const query = args.query || pathQuery;

        if (libMode && !SCOPE_STYLE_QUERY_RE.test(query)) {
          const resolvedPath = path.isAbsolute(filePath)
            ? filePath
            : path.join(args.resolveDir, filePath);
          const sourcePath = resolveStyleSourcePath(resolvedPath);
          if (!sourcePath || sourcePath.includes('node_modules')) {
            return null;
          }
          const cssKey = path.resolve(resolvedPath.replace(/\.(scss|sass|less)$/i, '.css'));
          return {
            path: sourcePath,
            namespace: SCOPED_STYLE_NS,
            pluginData: { libMode: true, cssKey },
          };
        }

        if (!SCOPE_STYLE_QUERY_RE.test(query)) {
          return null;
        }

        const resolvedPath = path.isAbsolute(filePath)
          ? filePath
          : path.join(args.resolveDir, filePath);

        return {
          path: resolvedPath,
          namespace: SCOPED_STYLE_NS,
          pluginData: { query },
        };
      });

      build.onLoad({ filter: /.*/, namespace: SCOPED_STYLE_NS }, async (args) => {
        const filePath = args.path;
        const pluginData = args.pluginData || {};
        const query = args.suffix || pluginData.query || '';

        if (!STYLE_FILE_RE.test(filePath)) {
          return null;
        }

        const rawContent = await fs.promises.readFile(filePath, 'utf8');
        const cssInput = await compileStylePreprocessor(filePath, rawContent);

        if (pluginData.libMode && styleScoped) {
          const cssKey = path.resolve(
            pluginData.cssKey || filePath.replace(/\.(scss|sass|less)$/i, '.css')
          );
          const scopedItem = styleScoped.get(cssKey);
          if (!scopedItem || !scopedItem.list.length) {
            const cssOnly = await processStyleCss(cssInput, {
              rootDir,
              filePath,
              aliasConfig,
              aliasMap,
              processScopeStyleCss,
            });
            return { contents: cssOnly, loader: 'css' };
          }
          const css = await processStyleCss(cssInput, {
            rootDir,
            filePath,
            aliasConfig,
            aliasMap,
            scopedItem,
            processScopeStyleCss,
          });
          return { contents: css, loader: 'css' };
        }

        if (!SCOPE_STYLE_QUERY_RE.test(query)) {
          return null;
        }

        const css = await processStyleCss(cssInput, {
          query,
          rootDir,
          filePath,
          aliasConfig,
          aliasMap,
          processScopeStyleCss,
        });
        return { contents: css, loader: 'css' };
      });
    },
  };
}

module.exports = reactScopeStyle;
module.exports.default = reactScopeStyle;
module.exports.splitPathQuery = splitPathQuery;
module.exports.resolveScriptLoader = resolveScriptLoader;
module.exports.compileStylePreprocessor = compileStylePreprocessor;
