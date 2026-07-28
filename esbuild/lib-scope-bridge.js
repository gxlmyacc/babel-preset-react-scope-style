const path = require('path');

/**
 * 创建库模式（多文件 ESM 发布）用的 StyleScoped 桥接表。
 * @returns {Map<string, { map: Record<string, boolean>, handled: boolean, list: Array<{ scopeId: string, global: boolean }> }>}
 */
function createStyleScopedMap() {
  return new Map();
}

/**
 * 将 JS 源路径映射为对应 CSS 输出路径键（与 build-react-esm-project 一致）。
 * @param {string} jsFilename - 当前 JS 文件绝对路径
 * @returns {string} 默认同目录 `.css` 路径
 */
function defaultCssKeyFromJs(jsFilename) {
  return jsFilename.replace(/\.(js|jsx|mjs|cjs|ts|tsx|mts|cts)$/i, '.css');
}

/**
 * 解析 scopeFn 应写入 StyleScoped 的 CSS 路径键。
 * @param {object} scoped - Babel scopeFn 第三个参数
 * @param {string} rootDir - 项目根目录
 * @returns {string} StyleScoped 键（绝对路径）
 */
function resolveStyleScopedKey(scoped, rootDir) {
  let filename = defaultCssKeyFromJs(scoped.filename);
  const basename = path.basename(filename).replace(/\.(scss|sass|less|css)$/i, '');

  if (scoped.source && (scoped.global || !scoped.source.startsWith(`./${basename}.`))) {
    let source = scoped.source.split('?')[0];
    if (!source.startsWith('.')) {
      source = path.join(path.dirname(scoped.filename), source);
    } else {
      source = path.resolve(path.dirname(scoped.filename), source);
    }
    if (!/\.css$/i.test(source)) {
      source = source.replace(/\.(scss|sass|less)$/i, '.css');
    }
    filename = path.resolve(source);
  }

  return path.resolve(filename);
}

/**
 * 创建库模式 Babel scopeFn：记录 scope 元数据并将 import 改写为 plain `.css`。
 * @param {Map} styleScoped - StyleScoped 桥接表
 * @param {string} rootDir - 项目根目录
 * @returns {(filePath: string, query: string, meta: object) => string} scopeFn
 */
function createLibScopeFn(styleScoped, rootDir) {
  return function libScopeFn(p1, query, scoped) {
    const cssKey = resolveStyleScopedKey(scoped, rootDir);
    let scopedItem = styleScoped.get(cssKey);
    if (!scopedItem) {
      scopedItem = {
        map: {},
        handled: false,
        list: [],
      };
      styleScoped.set(cssKey, scopedItem);
    }
    if (scoped.scopeId && !scopedItem.map[scoped.scopeId]) {
      scopedItem.map[scoped.scopeId] = true;
      scopedItem.list.push({
        scopeId: scoped.scopeId,
        global: Boolean(scoped.global),
      });
    }
    return p1.replace(/\.(scss|sass|less)$/i, '.css');
  };
}

/**
 * 将 StyleScoped 项转为 PostCSS scope query 并依次处理 CSS。
 * @param {string} cssContent - 原始 CSS 文本
 * @param {{ list: Array<{ scopeId: string, global: boolean }> }} scopedItem - StyleScoped 条目
 * @param {typeof import('../lib/process-scope-css').processScopeStyleCss} processScopeStyleCss - CSS 处理函数
 * @returns {Promise<string>} 处理后的 CSS
 */
async function applyStyleScopedToCss(cssContent, scopedItem, processScopeStyleCss) {
  let output = cssContent;
  // eslint-disable-next-line no-restricted-syntax
  for (const item of scopedItem.list) {
    const query = item.global
      ? `?scope-style&scoped=true&global=true&id=${item.scopeId}`
      : `?scope-style&scoped=true&id=${item.scopeId}`;
    output = await processScopeStyleCss(output, query);
  }
  scopedItem.handled = true;
  return output;
}

/**
 * 预扫描源码目录内 JS/TS 文件，填充 StyleScoped（库模式 JS 先于 CSS 编译）。
 * @param {object} params - 扫描参数
 * @param {string} params.rootDir - 项目根目录
 * @param {string} params.srcDir - 源码目录（相对 rootDir）
 * @param {boolean} [params.typescript=false] - 是否包含 ts/tsx
 * @param {string[]} [params.ignore=[]] - 忽略 glob 片段
 * @param {import('../types').ScopeStyleOptions} params.presetOptions - Babel preset 选项
 * @param {Map} params.styleScoped - StyleScoped 桥接表
 * @returns {void}
 */
function preScanJsForStyleScoped({
  rootDir,
  srcDir,
  typescript = false,
  ignore = [],
  presetOptions,
  styleScoped,
  aliasConfig = true,
}) {
  const fs = require('fs');
  const { transformSync } = require('@babel/core');
  const { globSync } = require('../lib/glob-sync');
  const { loadScopePreset } = require('../lib/resolve-preset');
  const preset = loadScopePreset();
  const { buildBabelTransformOptions } = require('../lib/alias-config');

  const exts = typescript
    ? 'js,jsx,mjs,cjs,ts,tsx,mts,cts'
    : 'js,jsx,mjs,cjs';
  const pattern = `${srcDir}/**/*.{${exts}}`;
  const ignorePatterns = ignore.length
    ? ignore.map((item) => (item.includes('*') ? item : `**/${item}/**`))
    : ['**/node_modules/**'];

  const files = globSync(pattern, {
    cwd: rootDir,
    absolute: true,
    ignore: ignorePatterns,
  });

  const scopeFn = createLibScopeFn(styleScoped, rootDir);
  const options = {
    ...presetOptions,
    scope: true,
    scopeFn,
  };

  files.forEach((file) => {
    const code = fs.readFileSync(file, 'utf8');
    transformSync(code, buildBabelTransformOptions({
      filename: file,
      preset,
      babelOptions: options,
      rootDir,
      aliasConfig,
      sourceMaps: false,
    }));
  });
}

/**
 * 解析磁盘上的样式源文件（css 不存在时尝试 scss/sass/less）。
 * @param {string} filePath - 请求路径（绝对）
 * @returns {string|null} 存在的样式源路径
 */
function resolveStyleSourcePath(filePath) {
  const fs = require('fs');
  if (fs.existsSync(filePath)) return filePath;
  const candidates = [
    filePath.replace(/\.css$/i, '.scss'),
    filePath.replace(/\.css$/i, '.sass'),
    filePath.replace(/\.css$/i, '.less'),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

/**
 * 库模式：将 styleSrc 下样式编译到 styleOut，并按 StyleScoped 作用域化（对齐 Gulp 样式流水线）。
 * @param {object} config - resolveBuildConfig 返回值
 * @param {Map} styleScoped - StyleScoped 桥接表
 * @returns {Promise<void>}
 */
async function buildLibStyles(config, styleScoped) {
  const fs = require('fs');
  const { globSync } = require('../lib/glob-sync');
  const { processScopeStyleCss } = require('../lib/process-scope-css');
  const { processStyleCss } = require('../lib/alias-config');
  const { compileStylePreprocessor } = require('./index');

  const styleRel = path.relative(config.rootDir, config.styleSrcDir) || '.';
  const files = globSync(`${styleRel}/**/*.{css,scss,sass,less}`, {
    cwd: config.rootDir,
    absolute: true,
    ignore: ['**/node_modules/**'],
  });

  await Promise.all(files.map(async (file) => {
    const rel = path.relative(config.styleSrcDir, file);
    const outCss = path.join(
      config.styleOutDir,
      rel.replace(/\.(scss|sass|less)$/i, '.css')
    );
    fs.mkdirSync(path.dirname(outCss), { recursive: true });

    const rawContent = fs.readFileSync(file, 'utf8');
    const cssInput = await compileStylePreprocessor(file, rawContent);
    const cssKey = path.resolve(file.replace(/\.(scss|sass|less)$/i, '.css'));
    const scopedItem = styleScoped.get(cssKey);

    let css = await processStyleCss(cssInput, {
      rootDir: config.rootDir,
      filePath: file,
      aliasConfig: config.aliasConfig,
      aliasMap: config.alias,
      scopedItem,
      processScopeStyleCss,
    });

    fs.writeFileSync(outCss, css);
  }));
}

/** 库模式不参与复制的源码扩展名（由 esbuild / buildLibStyles 处理） */
const LIB_SKIP_COPY_EXT_RE = /\.(js|jsx|mjs|cjs|ts|tsx|mts|cts|css|scss|sass|less)$/i;

/**
 * 库模式：将 src 下非 JS/TS/样式文件复制到输出目录（保持相对路径）。
 * @param {object} config - resolveBuildConfig 返回值
 * @returns {void}
 */
function copyLibStaticAssets(config) {
  const fs = require('fs');
  const { globSync } = require('../lib/glob-sync');

  const srcRel = path.relative(config.rootDir, config.srcDir) || '.';
  const ignorePatterns = config.ignore.length
    ? config.ignore.map((item) => (item.includes('*') ? item : `**/${item}/**`))
    : ['**/node_modules/**'];

  const files = globSync(`${srcRel}/**/*`, {
    cwd: config.rootDir,
    absolute: true,
    ignore: ignorePatterns,
    nodir: true,
  });

  files.forEach((file) => {
    if (LIB_SKIP_COPY_EXT_RE.test(file)) {
      return;
    }
    const rel = path.relative(config.srcDir, file);
    const dest = path.join(config.outDir, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(file, dest);
  });
}

module.exports = {
  createStyleScopedMap,
  createLibScopeFn,
  resolveStyleScopedKey,
  applyStyleScopedToCss,
  preScanJsForStyleScoped,
  resolveStyleSourcePath,
  buildLibStyles,
  copyLibStaticAssets,
  LIB_SKIP_COPY_EXT_RE,
};
