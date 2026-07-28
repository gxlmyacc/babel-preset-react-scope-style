const path = require('path');
const withReactScopeStyle = require('babel-preset-react-scope-style/next');

const sharedRoot = path.resolve(__dirname, '../shared');
const nextModules = path.resolve(__dirname, 'node_modules');

/**
 * Next.js 示例配置：复用 shared 应用源码，并注入 scope-style loader。
 */
module.exports = withReactScopeStyle(
  {
    reactStrictMode: true,
    eslint: {
      ignoreDuringBuilds: true,
    },
    // 允许编译仓库内 examples/shared 源码
    transpilePackages: [],
    experimental: {
      externalDir: true,
    },
    sassOptions: {
      includePaths: [path.join(sharedRoot, 'src')],
    },
    /**
     * 将 React 等依赖解析到本示例 node_modules，避免 shared 外链冲突。
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
        react: path.join(nextModules, 'react'),
        'react-dom': path.join(nextModules, 'react-dom'),
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
