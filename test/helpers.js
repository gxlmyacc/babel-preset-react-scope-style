const assert = require('node:assert/strict');
const { transformSync } = require('@babel/core');
const postcss = require('postcss');
const options = require('../src/options');
const optionsDefaults = require('../src/options-default');
const injectScope = require('../src/plugins/inject-scope');

/**
 * 重置插件全局 options 与 scopeId 缓存，保证测试隔离。
 * @param {Partial<import('../src/options-default')>} [overrides] - 覆盖默认配置
 * @returns {void}
 */
function resetScopeOptions(overrides = {}) {
  Object.keys(options).forEach((key) => {
    delete options[key];
  });
  Object.assign(options, { ...optionsDefaults, pkg: { name: 'test-app' }, ...overrides });
  Object.keys(injectScope.scopeIds).forEach((key) => {
    delete injectScope.scopeIds[key];
  });
}

/**
 * 使用本包 preset 编译源码。
 * @param {string} code - 输入源码
 * @param {object} [opts] - 额外选项
 * @param {string} [opts.filename='/project/src/Component.jsx'] - 虚拟文件名
 * @param {Partial<import('../src/options-default')>} [opts.pluginOptions] - preset 配置
 * @returns {string} 编译后代码
 */
function transformWithPreset(code, opts = {}) {
  const { filename = '/project/src/Component.jsx', pluginOptions = {} } = opts;
  resetScopeOptions(pluginOptions);
  const preset = require('../src/index');
  const result = transformSync(code, {
    filename,
    presets: [[preset, pluginOptions]],
    babelrc: false,
    configFile: false,
  });
  if (!result || result.code == null) {
    throw new Error('Babel transform returned empty result');
  }
  return result.code.trim();
}

/**
 * 模拟多个 JS/TS 文件引用同一 `?scoped` 样式时，PostCSS 侧收到的多份 scope 上下文。
 * 每个 importer 对应各自由文件路径 hash 生成的 scope id（与 Babel inject-scope 一致）。
 * @param {string[]} scopeIds - 各引用方的 scope id 列表，如 `['v-hashA', 'v-hashB']`
 * @returns {Array<{ scoped: boolean, global: boolean, id: string }>}
 */
function multiScopeContexts(scopeIds) {
  return scopeIds.map((id) => ({
    scoped: true,
    global: false,
    id,
  }));
}

/**
 * 运行 PostCSS scope 插件并返回 CSS 文本。
 * @param {string} css - 输入 CSS
 * @param {object|object[]
 *   |import('../postcss/plugin').PluginOptions|import('../postcss/plugin').PluginOptions[]} pluginOptions - 单 scope 或多 scope（同一 CSS 被多个 importer 引用）
 * @returns {Promise<string>}
 */
async function runPostcssScope(css, pluginOptions) {
  const plugin = require('../postcss')(pluginOptions);
  const result = await postcss([plugin]).process(css, { from: undefined });
  return result.css.trim();
}

/**
 * 将多 scope 输出按规则块拆成数组（去掉空行），便于断言「同一源文件生成了 N 份作用域样式」。
 * @param {string} css - 插件输出的完整 CSS
 * @returns {string[]} 非空规则片段列表
 */
function splitScopedCssBlocks(css) {
  return css
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

/**
 * 从 Babel 转换结果中提取 scope id（import query 或 JSX className）。
 * @param {string} code - 转换后的 JS 代码
 * @returns {string|null} scope id，如 `v-abc123` 或 global 模式下的 `v-`
 */
function extractScopeIdFromCode(code) {
  const fromImport = code.match(
    /scope-style&scoped=true(?:&global=true)?&id=(v-[a-z0-9-]*)/
  );
  if (fromImport) return fromImport[1];
  const fromClass = code.match(/className="(v-[a-z0-9]+)/);
  if (fromClass) return fromClass[1];
  const fromArray = code.match(/\["(v-[a-z0-9]+)"/);
  if (fromArray) return fromArray[1];
  return null;
}

/** @type {string|undefined} */
let defaultTestScopeId;

/**
 * 返回默认测试虚拟路径 `/project/src/Component.jsx` 对应的 scope id。
 * @returns {string}
 */
function getDefaultTestScopeId() {
  if (!defaultTestScopeId) {
    const code = transformWithPreset(
      "import React from 'react';\nimport './__probe.scss?scoped';\nexport function P() { return <span />; }"
    );
    defaultTestScopeId = extractScopeIdFromCode(code);
    if (!defaultTestScopeId) {
      throw new Error('getDefaultTestScopeId: probe transform produced no scope id');
    }
  }
  return defaultTestScopeId;
}

/**
 * 将 actual 与 expected 做严格相等比对；expected 中 `{scopeId}` 替换为从 actual 解析的 scope id。
 * @param {string} actual - 实际输出
 * @param {string} expected - 期望输出（可含 `{scopeId}` 占位符）
 * @returns {void}
 */
function assertScopedEqual(actual, expected) {
  const scopeId = extractScopeIdFromCode(actual);
  assert.ok(scopeId, 'expected scope id in actual output');
  assert.equal(actual, expected.replace(/\{scopeId\}/g, scopeId));
}

/**
 * 模拟指定路径的 React 组件文件经 preset 转换（用于多 importer 场景）。
 * @param {object} params - 参数
 * @param {string} params.filename - 虚拟文件路径（决定 scope hash）
 * @param {string} [params.styleImport='./shared.scss?scoped'] - 样式 import 路径
 * @param {string} [params.jsx='export function Comp() { return <div className="root" />; }'] - 组件 JSX 源码
 * @returns {string} 转换后的代码
 */
function transformImporterFile({
  filename,
  styleImport = './shared.scss?scoped',
  jsx = 'export function Comp() { return <div className="root" />; }',
}) {
  const code = [
    'import React from \'react\';',
    `import '${styleImport}';`,
    jsx,
  ].join('\n');
  return transformWithPreset(code, { filename });
}

/**
 * 根据多个 importer 的 Babel 输出 id，对同一份 CSS 跑多 scope PostCSS（端到端模拟）。
 * @param {string} css - 共享样式表内容
 * @param {string[]} importerFilenames - 各 JS/TS 文件路径
 * @returns {Promise<{ css: string, scopeIds: string[] }>}
 */
async function postcssForSharedCssFromImporters(css, importerFilenames) {
  const scopeIds = importerFilenames.map((filename) => {
    const code = transformImporterFile({ filename });
    const id = extractScopeIdFromCode(code);
    if (!id) throw new Error(`no scope id in ${filename}`);
    return id;
  });
  const outputCss = await runPostcssScope(css, multiScopeContexts(scopeIds));
  return { css: outputCss, scopeIds };
}

module.exports = {
  resetScopeOptions,
  transformWithPreset,
  multiScopeContexts,
  runPostcssScope,
  splitScopedCssBlocks,
  extractScopeIdFromCode,
  getDefaultTestScopeId,
  assertScopedEqual,
  transformImporterFile,
  postcssForSharedCssFromImporters,
};
