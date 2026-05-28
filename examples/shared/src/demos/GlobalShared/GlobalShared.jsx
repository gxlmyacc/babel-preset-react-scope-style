import React from 'react';
import DemoPanel from '../../components/DemoPanel/DemoPanel';
import { useDemoT } from '../../i18n/useDemoT';
import './GlobalShared.global.scss?global';
import './GlobalShared.scss?scoped';


/**
 * 演示 ?global：多个组件块共用同一套「项目级」作用域选择器。
 * ?global 仅处理 CSS；同文件另需 ?scoped 空样式，以便 JSX 带上 [class*=ex-] 可匹配的 scope class。
 * @returns {import('react').ReactElement} 演示内容
 */
function GlobalShared() {
  const demo = useDemoT('global-shared');

  return (
    <DemoPanel title={demo.title} summary={demo.summary} tags={demo.tags}>
      <div className="global-demo">
        <div className="global-demo__block">
          <span className="shared-chip">{demo.t('blockAChip')}</span>
          <p>{demo.t('blockAText')}</p>
        </div>
        <div className="global-demo__block">
          <span className="shared-chip shared-chip--accent">{demo.t('blockBChip')}</span>
          <p>{demo.t('blockBText')}</p>
        </div>
      </div>
    </DemoPanel>
  );
}

export default GlobalShared;
