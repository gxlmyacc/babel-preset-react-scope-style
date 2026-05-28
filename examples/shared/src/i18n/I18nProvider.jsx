import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from './constants';
import { resolveMessage } from './resolve';

const STORAGE_KEY = 'react-scope-style-demo-locale';

const I18nContext = createContext(null);

/**
 * 从 localStorage 读取已保存语言，非法值回退默认英文。
 * @returns {import('./constants').Locale} 语言代码
 */
function readStoredLocale() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && SUPPORTED_LOCALES.includes(stored)) return stored;
  } catch {
    /* 无 localStorage 时忽略 */
  }
  return DEFAULT_LOCALE;
}

/**
 * 提供示例应用 i18n 上下文。
 * @param {object} props - 组件属性
 * @param {import('react').ReactNode} props.children - 子节点
 * @returns {import('react').ReactElement} Provider
 */
export function I18nProvider({ children }) {
  const [locale, setLocaleState] = useState(readStoredLocale);

  const setLocale = useCallback((next) => {
    if (!SUPPORTED_LOCALES.includes(next)) return;
    setLocaleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* 忽略 */
    }
    document.documentElement.lang = next === 'zh' ? 'zh-CN' : 'en';
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en';
  }, [locale]);

  const t = useCallback((path) => resolveMessage(locale, path), [locale]);

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/**
 * 获取 i18n 上下文。
 * @returns {{ locale: string, setLocale: (locale: string) => void, t: (path: string) => string }}
 */
export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return ctx;
}

export default I18nProvider;
