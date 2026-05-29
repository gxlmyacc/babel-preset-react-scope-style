const fs = require('fs');
const path = require('path');
const {
  resolveBuildConfig,
  resolveScopePresetOptions,
  toEsbuildOptions,
} = require('./resolve-config');
const {
  createStyleScopedMap,
  preScanJsForStyleScoped,
  buildLibStyles,
  copyLibStaticAssets,
} = require('./lib-scope-bridge');
const { createEsbuildAliasPlugin } = require('./lib-alias-plugin');
const reactScopeStyle = require('./index');

/**
 * 清空输出目录；bundle 模式可保留静态入口等文件。
 * @param {string} outDir - 输出目录绝对路径
 * @param {object} [options] - 清理选项
 * @param {string[]} [options.keepNames] - 不删除的文件/目录名（仅一级）
 * @returns {void}
 */
function cleanOutDir(outDir, options = {}) {
  const keepNames = new Set(options.keepNames || []);

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
    return;
  }

  if (!keepNames.size) {
    fs.rmSync(outDir, { recursive: true, force: true });
    fs.mkdirSync(outDir, { recursive: true });
    return;
  }

  fs.readdirSync(outDir).forEach((name) => {
    if (keepNames.has(name)) return;
    fs.rmSync(path.join(outDir, name), { recursive: true, force: true });
  });
}

/**
 * 组装含 scope 插件的 esbuild 构建选项。
 * @param {object} config - resolveBuildConfig 返回值
 * @returns {import('esbuild').BuildOptions}
 */
function createEsbuildBuildOptions(config) {
  const presetOptions = resolveScopePresetOptions(config);
  const styleScoped = config.libMode ? createStyleScopedMap() : null;

  if (config.libMode && config.scopeStyle) {
    preScanJsForStyleScoped({
      rootDir: config.rootDir,
      srcDir: path.relative(config.rootDir, config.srcDir) || '.',
      typescript: config.typescript,
      ignore: config.ignore,
      presetOptions,
      styleScoped,
      aliasConfig: config.aliasConfig,
    });
  }

  const plugins = [
    ...(config.plugins || []),
  ];

  if (config.libMode && config.alias && Object.keys(config.alias).length) {
    const aliasPlugin = createEsbuildAliasPlugin(config.alias);
    if (aliasPlugin) {
      plugins.unshift(aliasPlugin);
    }
  }

  if (config.scopeStyle) {
    plugins.unshift(reactScopeStyle({
      ...presetOptions,
      libMode: config.libMode,
      styleScoped,
      rootDir: config.rootDir,
      aliasConfig: config.aliasConfig,
      aliasMap: config.alias,
    }));
  }

  return {
    buildOptions: {
      ...toEsbuildOptions(config),
      plugins,
    },
    styleScoped,
  };
}

/**
 * 执行一次性 esbuild 构建。
 * @param {object} config - resolveBuildConfig 返回值
 * @returns {Promise<import('esbuild').BuildResult>}
 */
async function runBuild(config) {
  if (!config.disableClean) {
    const keepNames = !config.libMode && config.bundle !== false
      ? ['index.html']
      : [];
    cleanOutDir(config.outDir, { keepNames });
  }

  const esbuild = require('esbuild');
  const { buildOptions, styleScoped } = createEsbuildBuildOptions(config);
  const result = await esbuild.build(buildOptions);

  if (config.libMode && config.scopeStyle && styleScoped) {
    await buildLibStyles(config, styleScoped);
  }

  if (config.libMode) {
    copyLibStaticAssets(config);
  }

  return result;
}

/**
 * 启动 watch + serve（对齐 react-esm-project 的 start 命令）。
 * @param {object} config - resolveBuildConfig 返回值
 * @returns {Promise<{ port: number, host: string }>}
 */
async function runStart(config) {
  if (config.libMode) {
    throw new Error('[react-scope-style] start 命令暂不支持 libMode，请使用 build');
  }

  const esbuild = require('esbuild');
  const { buildOptions } = createEsbuildBuildOptions(config);
  const ctx = await esbuild.context(buildOptions);
  await ctx.watch();
  const result = await ctx.serve({
    servedir: config.servedir,
    port: Number(config.servePort) || 3002,
  });
  const indexHtml = path.join(config.servedir, 'index.html');
  if (!fs.existsSync(indexHtml)) {
    console.warn(
      `[react-scope-style] 未找到 ${indexHtml}，浏览器可能只显示目录列表。`
      + ' 请在 servedir 下添加引用打包产物的 index.html（见 examples/esbuild-bundle/public/index.html）。'
    );
  }
  return result;
}

/**
 * 执行 CLI 命令。
 * @param {'build'|'start'} command - 子命令名
 * @param {object} cliOptions - Commander 选项
 * @returns {Promise<void>}
 */
async function execCommand(command, cliOptions) {
  const config = resolveBuildConfig(command, cliOptions);

  if (command === 'start') {
    const { port, host } = await runStart(config);
    const url = `http://${host}:${port}`;
    console.log(`[react-scope-style] ${url}`);
    return;
  }

  await runBuild(config);
}

module.exports = {
  cleanOutDir,
  createEsbuildBuildOptions,
  runBuild,
  runStart,
  execCommand,
};
