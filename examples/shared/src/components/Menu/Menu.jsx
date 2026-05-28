import React from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import './Menu.scss?scoped';

/**
 * 左侧演示场景菜单。
 * @param {object} props - 组件属性
 * @param {Array<{ id: string, label: string, summary: string }>} props.items - 菜单项
 * @param {string} props.activeId - 当前选中 id
 * @param {(id: string) => void} props.onSelect - 选中回调
 * @returns {import('react').ReactElement} 菜单导航
 */
function Menu({ items, activeId, onSelect }) {
  const { t } = useI18n();

  return (
    <nav className="demo-menu" aria-label={t('menu.ariaLabel')}>
      <p className="demo-menu__title">{t('menu.title')}</p>
      <ul className="demo-menu__list">
        {items.map((item) => (
          <li key={item.id} className="demo-menu__item">
            <button
              type="button"
              className={`demo-menu__btn${activeId === item.id ? ' demo-menu__btn--active' : ''}`}
              onClick={() => onSelect(item.id)}
            >
              <span className="demo-menu__label">{item.label}</span>
              <span className="demo-menu__summary">{item.summary}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default Menu;
