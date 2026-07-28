const fs = require('fs');
const path = require('path');
const { globSync } = require('../lib/glob-sync');

const DEFAULT_CONFIG_FILES = [
  'esbuild-scope.config.js',
  'esbuild-scope.config.cjs',
  'esbuild-scope.config.mjs',
];

/**
 * 读取 package.json 中的 namespace 字段。
 * @param {string} rootDir - 项目根目录
 * @returns {string}
 */
function readPackageNamespace(rootDir) {
  try {
    const pkg = require(path.join(rootDir, 'package.json'));
    return pkg.namespace || '';
  } catch {
    return '';
  }
}

/**
 * 解析配置文件路径。
 * @param {string} rootDir - 项目根目录
 * @param {string} [configPath] - CLI 指定的 config 路径
 * @param {boolean} [skipConfig] - 是否跳过配置文件自动发现
 * @returns {string|null} 存在的配置文件绝对路径
 */
function resolveConfigFile(rootDir, configPath, skipConfig = false) {
  if (skipConfig) {
    return null;
  }
  const candidates = configPath
    ? [path.resolve(rootDir, configPath)]
    : DEFAULT_CONFIG_FILES.map((name) => path.join(rootDir, name));

  return candidates.find((file) => fs.existsSync(file)) || null;
}

/**
 * 加载 esbuild-scope 配置文件。
 * @param {string} configFile - 配置文件绝对路径
 * @returns {object} 配置对象
 */
function loadConfigFile(configFile) {
  const config = require(configFile);
  return config && config.default ? config.default : config;
}

/**
 * 将 kebab-case CLI 键转为 camelCase。
 * @param {object} cliOptions - Commander 解析结果
 * @returns {object}
 */
function normalizeCliKeys(cliOptions) {
  return { ...cliOptions };
}

/**
 * 合并 CLI 参数、配置文件与默认值，得到完整构建配置。
 * @param {string} command - build | start
 * @param {object} cliOptions - Commander 解析的选项
 * @returns {object} 归一化后的构建配置
 */
function resolveBuildConfig(command, cliOptions = {}) {
  const opts = normalizeCliKeys(cliOptions);
  const rootDir = opts.root
    ? path.resolve(process.cwd(), opts.root)
    : process.cwd();

  const skipConfig = Boolean(opts.noConfig) || opts.config === false;
  const configPath = skipConfig ? undefined : opts.config;
  const configFile = resolveConfigFile(rootDir, configPath, skipConfig);
  const fileConfig = configFile ? loadConfigFile(configFile) : {};

  const merged = {
    command,
    rootDir,
    configFile,
    src: './src',
    out: './dist',
    styleSrc: undefined,
    styleOut: undefined,
    entry: undefined,
    bundle: false,
    format: 'esm',
    jsx: 'automatic',
    sourcemap: false,
    typescript: false,
    scopeStyle: true,
    scopeStyleVersion: false,
    scopeNamespace: '',
    scopeStyleOptions: {},
    servedir: undefined,
    servePort: 3002,
    disableClean: false,
    ignore: [],
    alias: {},
    aliasConfig: true,
    define: {},
    external: [],
    esbuild: {},
    ...fileConfig,
    ...opts,
  };

  // 配置文件显式 bundle:true 时，不应被 CLI 未传 --bundle 覆盖
  if (fileConfig.bundle === true && cliOptions.bundle !== true) {
    merged.bundle = true;
  }

  // 配置文件显式 root 时，不应被 CLI 未传 --root 时用 cwd 误覆盖（fileConfig 已在 opts 之后合并时若 opts.root 为 undefined 则保留）
  if (fileConfig.root != null && cliOptions.root === undefined) {
    merged.root = fileConfig.root;
  }

  merged.rootDir = path.isAbsolute(merged.root)
    ? merged.root
    : path.resolve(process.cwd(), merged.root || rootDir);
  merged.srcDir = path.resolve(merged.rootDir, merged.src || './src');
  merged.outDir = path.resolve(merged.rootDir, merged.out || merged.outdir || './dist');
  merged.styleSrcDir = path.resolve(
    merged.rootDir,
    merged.styleSrc || merged.src || './src'
  );
  merged.styleOutDir = path.resolve(
    merged.rootDir,
    merged.styleOut || merged.out || merged.outdir || './dist'
  );
  merged.servedir = merged.servedir
    ? path.resolve(merged.rootDir, merged.servedir)
    : merged.outDir;

  if (!merged.scopeNamespace) {
    merged.scopeNamespace = readPackageNamespace(merged.rootDir);
  }

  merged.scopeStyle = Boolean(
    merged.scopeStyle
    || merged.scopeStyleOptions.scope
    || Object.keys(merged.scopeStyleOptions).length > 0
  );

  merged.libMode = merged.bundle === false || merged.libMode === true;

  if (merged.ignore && typeof merged.ignore === 'string') {
    merged.ignore = merged.ignore.split(',').map((item) => item.trim()).filter(Boolean);
  }

  return merged;
}

/**
 * 构建 Babel preset 作用域选项（对齐 build-react-esm-project）。
 * @param {object} config - resolveBuildConfig 返回值
 * @returns {import('../types').ScopeStyleOptions}
 */
function resolveScopePresetOptions(config) {
  let pkg = null;
  try {
    pkg = require(path.join(config.rootDir, 'package.json'));
  } catch {
    pkg = null;
  }

  return {
    scope: config.scopeStyle !== false,
    scopeVersion: Boolean(config.scopeStyleVersion),
    scopeNamespace: config.scopeNamespace || '',
    pkg,
    ...config.scopeStyleOptions,
  };
}

/**
 * 解析 esbuild entryPoints。
 * @param {object} config - resolveBuildConfig 返回值
 * @returns {string[]|Record<string, string>}
 */
function resolveEntryPoints(config) {
  if (config.entry) {
    if (typeof config.entry === 'string') {
      return path.isAbsolute(config.entry)
        ? config.entry
        : path.resolve(config.rootDir, config.entry);
    }
    const entries = {};
    Object.entries(config.entry).forEach(([key, value]) => {
      entries[key] = path.isAbsolute(value)
        ? value
        : path.resolve(config.rootDir, value);
    });
    return entries;
  }

  if (config.libMode) {
    const exts = config.typescript
      ? 'js,jsx,mjs,cjs,ts,tsx,mts,cts'
      : 'js,jsx,mjs,cjs';
    const ignore = config.ignore.length
      ? config.ignore.map((item) => (item.includes('*') ? item : `**/${item}/**`))
      : ['**/node_modules/**'];

    const files = globSync(`${config.src}/**/*.{${exts}}`, {
      cwd: config.rootDir,
      absolute: true,
      ignore,
    });
    if (!files.length) {
      throw new Error(
        `[react-scope-style] 库模式未找到入口文件：请检查 --src（当前 ${config.src}）`
      );
    }
    return files;
  }

  throw new Error(
    '[react-scope-style] 缺少入口：请通过 --entry 或 esbuild-scope.config.js 的 entry 指定'
  );
}

/**
 * 将构建配置转换为 esbuild BuildOptions（不含 plugins）。
 * @param {object} config - resolveBuildConfig 返回值
 * @returns {import('esbuild').BuildOptions}
 */
function toEsbuildOptions(config) {
  const entryPoints = resolveEntryPoints(config);
  const isSingleOutfile = Boolean(config.outfile)
    && !config.libMode
    && typeof entryPoints === 'string';

  const options = {
    absWorkingDir: config.rootDir,
    entryPoints,
    bundle: config.libMode ? false : config.bundle !== false,
    format: config.format || 'esm',
    jsx: config.jsx || 'automatic',
    sourcemap: Boolean(config.sourcemap),
    define: config.define,
    external: config.external,
    alias: config.alias,
    logLevel: config.logLevel || 'info',
    ...config.esbuild,
  };

  if (config.libMode && options.alias && Object.keys(options.alias).length) {
    delete options.alias;
  }

  if (isSingleOutfile) {
    options.outfile = path.isAbsolute(config.outfile)
      ? config.outfile
      : path.resolve(config.rootDir, config.outfile);
    delete options.outdir;
  } else {
    options.outdir = config.libMode ? config.outDir : config.outDir;
    if (config.libMode) {
      options.outbase = config.srcDir;
    }
  }

  return options;
}

module.exports = {
  DEFAULT_CONFIG_FILES,
  resolveBuildConfig,
  resolveScopePresetOptions,
  resolveEntryPoints,
  toEsbuildOptions,
  resolveConfigFile,
};
