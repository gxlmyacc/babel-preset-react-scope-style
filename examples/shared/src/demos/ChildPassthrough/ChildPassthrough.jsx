import React, { useState } from 'react';
import DemoPanel from '../../components/DemoPanel/DemoPanel';
import { useDemoT } from '../../i18n/useDemoT';
import ChildCard from './components/ChildCard';
import './ChildPassthrough.scss?scoped';

/**
 * 演示父组件透传 className，并在父级 SCSS 中用 :scope 定制子组件内部节点。
 * @returns {import('react').ReactElement} 演示内容
 */
function ChildPassthrough() {
  const demo = useDemoT('child-passthrough');
  const [skin, setSkin] = useState('skin-a');

  return (
    <DemoPanel title={demo.title} summary={demo.summary} tags={demo.tags}>
      <div className="passthrough-demo">
        <div className="passthrough-demo__toolbar">
          <button
            type="button"
            className={`passthrough-demo__tab${skin === 'skin-a' ? ' passthrough-demo__tab--active' : ''}`}
            onClick={() => setSkin('skin-a')}
          >
            {demo.t('skinA')}
          </button>
          <button
            type="button"
            className={`passthrough-demo__tab${skin === 'skin-b' ? ' passthrough-demo__tab--active' : ''}`}
            onClick={() => setSkin('skin-b')}
          >
            {demo.t('skinB')}
          </button>
        </div>
        <ChildCard className={skin} title={demo.t('cardTitle')}>
          {demo.t('cardBody')}
        </ChildCard>
      </div>
    </DemoPanel>
  );
}

export default ChildPassthrough;
