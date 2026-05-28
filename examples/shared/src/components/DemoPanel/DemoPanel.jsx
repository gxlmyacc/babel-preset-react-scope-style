import React from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import './DemoPanel.scss?scoped';

/**
 * 单个演示场景的外层布局：标题、说明、标签与预览区。
 * @param {object} props - 组件属性
 * @param {string} props.title - 场景标题
 * @param {string} props.summary - 场景简述
 * @param {string[]} [props.tags=[]] - 能力标签
 * @param {import('react').ReactNode} props.children - 预览内容
 * @returns {import('react').ReactElement} 面板容器
 */
function DemoPanel({ title, summary, tags = [], children }) {
  const { t } = useI18n();

  return (
    <section className="demo-panel">
      <header className="demo-panel__header">
        <h2 className="demo-panel__title">{title}</h2>
        <p className="demo-panel__summary">{summary}</p>
        {tags.length > 0 && (
          <ul className="demo-panel__tags">
            {tags.map((tag) => (
              <li key={tag} className="demo-panel__tag">
                {tag}
              </li>
            ))}
          </ul>
        )}
      </header>
      <div className="demo-panel__preview">{children}</div>
      <p className="demo-panel__hint">
        {t('demoPanel.hintPrefix')}
        <code>{t('demoPanel.hintEx')}</code>
        {t('demoPanel.hintMid')}
        <code>{t('demoPanel.hintGlobal')}</code>
        {t('demoPanel.hintSuffix')}
      </p>
    </section>
  );
}

export default DemoPanel;
