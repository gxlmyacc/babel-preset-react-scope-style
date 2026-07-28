import './page.scss?scoped';

/**
 * Phase B1 页面：SWC 重写 ?scoped query，并注入 scope className。
 * @returns {import('react').JSX.Element}
 */
export default function Page() {
  return (
    <main className="card">
      <h1 className="title">next-swc-poc</h1>
      <p>Phase B1: SWC inject-scope + webpack CSS loader (no Babel).</p>
    </main>
  );
}
