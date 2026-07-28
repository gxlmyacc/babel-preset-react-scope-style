/**
 * App Router 根布局（Server Component）。
 * @param {{ children: import('react').ReactNode }} props - 布局子节点
 * @returns {import('react').ReactElement}
 */
export const metadata = {
  title: 'react-scope-style — Next App Router',
};

/**
 * 渲染 HTML 根节点。
 * @param {{ children: import('react').ReactNode }} props - 布局子节点
 * @returns {import('react').ReactElement}
 */
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
