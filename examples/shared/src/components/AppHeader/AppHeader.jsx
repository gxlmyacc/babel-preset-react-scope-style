import React from 'react';
import { useI18n } from '../../i18n/I18nProvider';
import './AppHeader.scss?scoped';

/**
 * 全站顶栏：左侧标题，右侧语言切换。
 * @returns {import('react').ReactElement} 顶栏
 */
function AppHeader() {
  const { locale, setLocale, t } = useI18n();

  return (
    <header className="app-header">
      <div className="app-header__brand">
        <h1 className="app-header__title shared-title">{t('app.title')}</h1>
        <p className="app-header__subtitle">{t('app.subtitle')}</p>
      </div>
      <div className="app-header__actions">
        <label className="app-header__lang" htmlFor="demo-locale-select">
          <span className="app-header__lang-label">{t('app.languageLabel')}</span>
          <select
            id="demo-locale-select"
            className="app-header__lang-select"
            value={locale}
            onChange={(e) => setLocale(e.target.value)}
          >
            <option value="en">{t('app.langEn')}</option>
            <option value="zh">{t('app.langZh')}</option>
          </select>
        </label>
      </div>
    </header>
  );
}

export default AppHeader;
