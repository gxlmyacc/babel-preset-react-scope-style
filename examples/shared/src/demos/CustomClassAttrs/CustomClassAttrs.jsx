import React, { useState } from 'react';
import DemoPanel from '../../components/DemoPanel/DemoPanel';
import { useDemoT } from '../../i18n/useDemoT';
import MockModal from './components/MockModal';
import './CustomClassAttrs.scss?scoped';

/**
 * 演示 classAttrs 中的 wrapClassName：仅当属性存在时注入 scope id。
 * @returns {import('react').ReactElement} 演示内容
 */
function CustomClassAttrs() {
  const demo = useDemoT('custom-class-attrs');
  const [open, setOpen] = useState(false);

  return (
    <DemoPanel title={demo.title} summary={demo.summary} tags={demo.tags}>
      <div className="attrs-demo">
        <p className="attrs-demo__text">
          {demo.t('configText')}
          <code>{demo.t('configCode')}</code>
        </p>
        <button type="button" className="attrs-demo__open" onClick={() => setOpen(true)}>
          {demo.t('openModal')}
        </button>
        <MockModal
          open={open}
          wrapClassName="demo-modal-wrap"
          title={demo.t('modalTitle')}
          onClose={() => setOpen(false)}
        >
          {demo.t('modalBodyPrefix')}
          <code>{demo.t('modalBodyCodeScss')}</code>
          {demo.t('modalBodyMid')}
          <code>{demo.t('modalBodyCodeScope')}</code>
          {demo.t('modalBodySuffix')}
        </MockModal>
      </div>
    </DemoPanel>
  );
}

export default CustomClassAttrs;
