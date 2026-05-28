import React from 'react';
import DemoPanel from '../../components/DemoPanel/DemoPanel';
import { useDemoT } from '../../i18n/useDemoT';
import { useI18n } from '../../i18n/I18nProvider';
import './ScopeSelectors.scss?scoped';

/**
 * 对比默认、:scope 附加、:scope 独立三种选择器写法。
 * @returns {import('react').ReactElement} 演示内容
 */
function ScopeSelectors() {
  const demo = useDemoT('scope-selectors');
  const { t } = useI18n();

  return (
    <DemoPanel title={demo.title} summary={demo.summary} tags={demo.tags}>
      <div className="scope-grid">
        <div className="scope-box scope-box--default">
          <span className="scope-box__label">{demo.t('labelDefault')}</span>
          <span className="inner">{t('common.innerText')}</span>
        </div>
        <div className="scope-box scope-box--attached">
          <span className="scope-box__label">{demo.t('labelAttached')}</span>
          <span className="inner">{t('common.innerText')}</span>
        </div>
        <div className="scope-box scope-box--nested-scope">
          <span className="scope-box__label">{demo.t('labelNested')}</span>
          <span className="inner">{t('common.innerText')}</span>
        </div>
      </div>
    </DemoPanel>
  );
}

export default ScopeSelectors;
