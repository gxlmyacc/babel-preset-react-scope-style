import ScopedBasic from './ScopedBasic/ScopedBasic';
import GlobalShared from './GlobalShared/GlobalShared';
import ScopeSelectors from './ScopeSelectors/ScopeSelectors';
import GlobalSelectors from './GlobalSelectors/GlobalSelectors';
import ChildPassthrough from './ChildPassthrough/ChildPassthrough';
import CustomClassAttrs from './CustomClassAttrs/CustomClassAttrs';

/**
 * 演示场景注册表（文案由 i18n 按 id 解析）。
 * @type {Array<{ id: string, Component: import('react').ComponentType }>}
 */
export const demoRegistry = [
  { id: 'scoped-basic', Component: ScopedBasic },
  { id: 'global-shared', Component: GlobalShared },
  { id: 'scope-selectors', Component: ScopeSelectors },
  { id: 'global-selectors', Component: GlobalSelectors },
  { id: 'child-passthrough', Component: ChildPassthrough },
  { id: 'custom-class-attrs', Component: CustomClassAttrs },
];

export default demoRegistry;
