const path = require('path');
const withReactScopeStyle = require('babel-preset-react-scope-style/next');

const sharedRoot = path.resolve(__dirname, '../shared');
const nextModules = path.resolve(__dirname, 'node_modules');

/**
 * Next.js App Router 示例配置：复用 shared 应用源码，并注入 scope-style loader。
 * 勿使用 `next dev --turbo`（Turbopack 不支持本 loader 注入）。
 */
module.exports = withReactScopeStyle(
  {
    reactStrictMode: true,
    eslint: {
      ignoreDuringBuilds: true,
    },
    experimental: {
      externalDir: true,
    },
    sassOptions: {
      includePaths: [path.join(sharedRoot, 'src')],
    },
    /**
     * 将依赖解析到本示例 node_modules，避免 shared 外链冲突。
     * App Router 不要把 `react`/`react-dom` 指到固定文件路径，否则会破坏
     * `react-server` 条件导出（表现为 `cache is not a function`）。
     * @param {import('webpack').Configuration} config - webpack 配置
     * @returns {import('webpack').Configuration}
     */
    webpack(config) {
      config.resolve.modules = [
        nextModules,
        ...(config.resolve.modules || ['node_modules']),
      ];
      config.resolve.alias = {
        ...config.resolve.alias,
        classnames: path.join(nextModules, 'classnames'),
      };
      return config;
    },
  },
  {
    loaderOptions: {
      sourceMap: true,
    },
  }
);
