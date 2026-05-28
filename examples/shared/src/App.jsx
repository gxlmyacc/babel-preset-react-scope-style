import React, { useMemo, useState } from 'react';
import AppHeader from './components/AppHeader/AppHeader';
import Menu from './components/Menu/Menu';
import { demoRegistry } from './demos/registry';
import { useI18n } from './i18n/I18nProvider';
import { DEMO_TAG_KEYS } from './i18n/useDemoT';
import './styles/global.scss?global';
import './App.scss?scoped';

/**
 * 根据演示 id 与当前语言生成菜单项文案。
 * @param {string} id - 演示 id
 * @param {(path: string) => string} t - 翻译函数
 * @returns {{ id: string, label: string, summary: string, tags: string[] }}
 */
function buildMenuItem(id, t) {
  const base = `demos.${id}`;
  const tagKeys = DEMO_TAG_KEYS[id] || [];
  return {
    id,
    label: t(`${base}.label`),
    summary: t(`${base}.menuSummary`),
    tags: tagKeys.map((key) => t(`${base}.${key}`)),
  };
}

/**
 * 示例应用根组件：顶栏语言切换 + 侧边菜单切换演示场景。
 * @returns {import('react').ReactElement} 应用根节点
 */
function App() {
  const { t } = useI18n();
  const [activeId, setActiveId] = useState(demoRegistry[0].id);

  const menuItems = useMemo(
    () => demoRegistry.map((item) => buildMenuItem(item.id, t)),
    [t]
  );

  const activeDemo = demoRegistry.find((item) => item.id === activeId);
  const ActiveComponent = activeDemo?.Component;

  return (
    <div className="demo-app">
      <AppHeader />
      <div className="demo-app__body">
        <aside className="demo-app__sidebar">
          <Menu
            items={menuItems}
            activeId={activeId}
            onSelect={setActiveId}
          />
        </aside>
        <main className="demo-app__main">
          {ActiveComponent && <ActiveComponent key={activeId} />}
        </main>
      </div>
    </div>
  );
}

export default App;
