import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import reactScopeStyle from 'babel-preset-react-scope-style/vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const scopeStyleOptions = require(path.join(__dirname, '../shared/scope-style-options.cjs'));

const bundlerModules = path.resolve(__dirname, 'node_modules');

export default defineConfig({
  root: path.resolve(__dirname, '../shared'),
  resolve: {
    alias: {
      react: path.join(bundlerModules, 'react'),
      'react-dom': path.join(bundlerModules, 'react-dom'),
      classnames: path.join(bundlerModules, 'classnames'),
    },
  },
  plugins: [
    reactScopeStyle(scopeStyleOptions),
    react(),
  ],
  server: {
    port: 5173,
  },
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
  },
});
