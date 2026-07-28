import React from 'react';
import { I18nProvider } from '../../shared/src/i18n/I18nProvider';

/**
 * Next 自定义 App：挂载 shared 演示应用与 i18n。
 * @param {{ Component: import('react').ComponentType, pageProps: object }} props - Next App props
 * @returns {import('react').ReactElement}
 */
export default function NextApp({ Component, pageProps }) {
  return (
    <React.StrictMode>
      <I18nProvider>
        <Component {...pageProps} />
      </I18nProvider>
    </React.StrictMode>
  );
}
