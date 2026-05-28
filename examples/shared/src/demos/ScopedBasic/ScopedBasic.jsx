import React from 'react';
import DemoPanel from '../../components/DemoPanel/DemoPanel';
import { useDemoT } from '../../i18n/useDemoT';
import './ScopedBasic.scss?scoped';

/**
 * 演示默认 scoped：嵌套选择器在最后一节挂 scope id。
 * @returns {import('react').ReactElement} 演示内容
 */
function ScopedBasic() {
  const demo = useDemoT('scoped-basic');

  return (
    <DemoPanel title={demo.title} summary={demo.summary} tags={demo.tags}>
      <article className="scoped-card">
        <h3 className="scoped-card__title">{demo.t('cardTitle')}</h3>
        <p className="scoped-card__body">{demo.t('cardBody')}</p>
        <button type="button" className="scoped-card__btn">
          {demo.t('cardBtn')}
        </button>
      </article>
    </DemoPanel>
  );
}

export default ScopedBasic;
