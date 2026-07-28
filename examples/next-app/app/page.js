'use client';

import React from 'react';
import { I18nProvider } from '../../shared/src/i18n/I18nProvider';
import App from '../../shared/src/App';

/**
 * App Router 首页：以 Client Component 挂载 shared 演示应用（含 i18n / 交互状态）。
 * @returns {import('react').ReactElement}
 */
export default function HomePage() {
  return (
    <I18nProvider>
      <App />
    </I18nProvider>
  );
}
