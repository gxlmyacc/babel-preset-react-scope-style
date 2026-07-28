/**
 * 根 layout。
 * @param {{ children: import('react').ReactNode }} props - 子节点
 * @returns {import('react').JSX.Element}
 */
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
