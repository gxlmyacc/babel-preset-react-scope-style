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

export function withReactScopeStyle(
  config: Record<string, unknown>,
  loaderOptions?: Record<string, unknown>
): Record<string, unknown>;

export const postcssScopeStyle: (options?: Record<string, unknown>) => Plugin;

export interface ScopeStyleLoaderOptions {
  /** 是否生成 source map（与 css-loader 链式传递的 prev map 配合） */
  sourceMap?: boolean;
}
