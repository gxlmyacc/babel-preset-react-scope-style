import { useMemo } from 'react';
import { useI18n } from './I18nProvider';

/** 各演示场景对应的 i18n 标签键 */
export const DEMO_TAG_KEYS = {
  'scoped-basic': ['tagScoped', 'tagDefault'],
  'global-shared': ['tagGlobal', 'tagAttr'],
  'scope-selectors': ['tagScope', 'tagPosition'],
  'global-selectors': ['tagGlobal', 'tagThirdParty'],
  'child-passthrough': ['tagPassthrough', 'tagScope', 'tagInner'],
  'custom-class-attrs': ['tagWrap', 'tagAttrs', 'tagScope'],
};

/**
 * 获取指定演示场景的标题、摘要、标签与字段翻译函数。
 * @param {string} id - 演示 id（与 registry 一致）
 * @returns {{ title: string, summary: string, tags: string[], t: (key: string) => string }}
 */
export function useDemoT(id) {
  const { t: rootT } = useI18n();
  const base = `demos.${id}`;

  return useMemo(() => {
    const tagKeys = DEMO_TAG_KEYS[id] || [];
    return {
      title: rootT(`${base}.title`),
      summary: rootT(`${base}.summary`),
      tags: tagKeys.map((key) => rootT(`${base}.${key}`)),
      t: (key) => rootT(`${base}.${key}`),
    };
  }, [id, rootT]);
}
