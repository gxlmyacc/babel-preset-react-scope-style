import type { PluginItem } from '@babel/core';
import type { Plugin } from 'postcss';

export type ClassNameLibraryPreference = 'auto' | 'clsx' | 'classnames';

export interface ScopeStyleOptions {
  /** 样式 import 路径匹配正则 */
  scopeRegx?: RegExp;
  /** 是否启用 scope 处理 */
  scope?: boolean | string;
  scopeFn?: (
    filePath: string,
    query: string,
    meta: {
      filename: string;
      source: string;
      scopeId: string;
      global?: boolean;
      pkg?: { name?: string; version?: string } | null;
    }
  ) => string;
  scopePrefix?: string;
  scopeAttrs?: boolean;
  scopeAll?: boolean;
  scopeVersion?: boolean;
  scopeNamespace?: string;
  pkg?: { name?: string; version?: string } | null;
  classAttrs?: Array<string | ((attrName: string, tagName: string) => boolean)>;
  /** 自动注入 className 工具库时的偏好：`auto` 优先 classnames，其次 clsx；未 import 时默认 classnames */
  classNameLibrary?: ClassNameLibraryPreference;
}

declare const preset: { (api: unknown, options?: ScopeStyleOptions): { plugins: PluginItem[] } };
export default preset;

export function reactScopeStyleVite(options?: ScopeStyleOptions): import('vite').Plugin;

export function reactScopeStyleEsbuild(options?: ScopeStyleOptions): import('esbuild').Plugin;

export interface EsbuildScopeConfig {
  /** 项目根目录（相对路径基于当前工作目录解析）；影响源码、输出与 package.json 读取 */
  root?: string;
  /** 入口：bundle 模式必填；字符串为单入口，对象为多入口 `{ name: 'path' }`；库模式可省略（由 `src` glob） */
  entry?: string | Record<string, string>;
  /** 库模式源码目录（相对 `root`）；未指定 `entry` 时从此目录 glob 所有 JS/TS 文件作为入口 */
  src?: string;
  /** 输出目录（相对 `root`）；`outdir` 的别名，二者等价 */
  out?: string;
  /** 输出目录（相对 `root`）；与 `out` 等价 */
  outdir?: string;
  /** 单文件输出路径（相对 `root`）；仅 bundle 单入口时生效，与 `outdir` 互斥 */
  outfile?: string;
  /** 是否打包为单文件/少量 chunk；`true` 为 SPA bundle，`false` 为库模式多文件输出（默认） */
  bundle?: boolean;
  /** 强制库模式（多文件 ESM）；默认在 `bundle: false` 时自动启用 */
  libMode?: boolean;
  /** 输出模块格式：`esm`（默认）、`cjs` 或 `iife` */
  format?: 'esm' | 'cjs' | 'iife';
  /** JSX 编译方式，透传 esbuild：`automatic`（默认）、`transform` 或 `preserve` */
  jsx?: 'automatic' | 'transform' | 'preserve';
  /** 是否生成 source map */
  sourcemap?: boolean;
  /** 库模式 glob 是否包含 `.ts` / `.tsx` / `.mts` / `.cts` 扩展名 */
  typescript?: boolean;
  /** 是否启用 JSX 作用域 className 与样式 scope 转换（默认 `true`） */
  scopeStyle?: boolean;
  /** scope id 是否包含 `package.json` 的 version 字段 */
  scopeStyleVersion?: boolean;
  /** scope id 命名空间前缀；未设置时读取 `package.json` 的 `namespace` */
  scopeNamespace?: string;
  /** 透传给 Babel preset 的细粒度作用域选项（如 `scopePrefix`、`classNameLibrary`） */
  scopeStyleOptions?: ScopeStyleOptions;
  /** `start` 命令静态资源服务目录（相对 `root`）；默认与输出目录相同 */
  servedir?: string;
  /** `start` 命令开发服务器端口（默认 `3002`） */
  servePort?: number;
  /** 构建前是否跳过清空输出目录 */
  disableClean?: boolean;
  /** 库模式 glob 时忽略的目录或 glob 模式；字符串可用逗号分隔 */
  ignore?: string[] | string;
  /** esbuild 原生路径别名；bundle 模式直接透传，库模式由插件与 PostCSS 模拟 */
  alias?: Record<string, string>;
  /** 启用 babel-plugin-alias-config / postcss-alias-config（目标项目需自行安装）；`false` 关闭 */
  aliasConfig?: boolean | { findConfig?: boolean; config?: string };
  /** 编译期常量替换，透传 esbuild `define` */
  define?: Record<string, string>;
  /** 外部依赖包名列表，透传 esbuild `external` */
  external?: string[];
  /** 额外透传给 esbuild 的构建选项（与上述字段合并，后者优先） */
  esbuild?: Record<string, unknown>;
  /** 附加 esbuild 插件，在 scope / alias 插件之后注册 */
  plugins?: import('esbuild').Plugin[];
}

export function withReactScopeStyle(
  config: Record<string, unknown>,
  loaderOptions?: Record<string, unknown>
): Record<string, unknown>;

export const postcssScopeStyle: (options?: Record<string, unknown>) => Plugin;

export interface ScopeStyleLoaderOptions {
  /** 是否生成 source map（与 css-loader 链式传递的 prev map 配合） */
  sourceMap?: boolean;
}
