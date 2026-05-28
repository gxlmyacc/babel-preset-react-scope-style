import React from 'react';
import DemoPanel from '../../components/DemoPanel/DemoPanel';
import { useDemoT } from '../../i18n/useDemoT';
import './GlobalSelectors.scss?scoped';

/**
 * 演示 CSS 中 :global 的行首写法与嵌套中间写法。
 * @returns {import('react').ReactElement} 演示内容
 */
function GlobalSelectors() {
  const demo = useDemoT('global-selectors');

  return (
    <DemoPanel title={demo.title} summary={demo.summary} tags={demo.tags}>
      <div className="global-sel-demo">
        <div className="global-sel-demo__section">
          <p className="global-sel-demo__caption">{demo.t('captionLeading')}</p>
          <div className="utility-reset-box">{demo.t('utilityText')}</div>
        </div>
        <div className="global-sel-demo__section">
          <p className="global-sel-demo__caption">{demo.t('captionNested')}</p>
          <div className="wrapper-box">
            <div className="wrapper-box__scoped">{demo.t('wrapperScoped')}</div>
            <div className="external-widget">{demo.t('externalWidget')}</div>
          </div>
        </div>
      </div>
    </DemoPanel>
  );
}

export default GlobalSelectors;
