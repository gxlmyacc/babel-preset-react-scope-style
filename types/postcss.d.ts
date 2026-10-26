import type { PluginCreator, Root } from 'postcss';

/** 自定义选择器转换的上下文。 */
export interface TransformSelectorContext {
  /** 当前规则的源文件绝对路径；没有来源时为空字符串。 */
  filename: string;
}

/** 仅用于 PostCSS 样式处理，不影响 Babel 或 JSX。 */
export interface PostcssScopeStyleOptions {
  /** 是否解析作用域标记。 */
  scoped?: boolean;
  /** 是否使用 [class*=id] 匹配作用域。 */
  global?: boolean;
  /** 作用域标识；injectScope 为 false 时可以省略。 */
  id?: string;
  /** 根级裸 :global 的替换内容。 */
  globalSelector?: string;
  /** 是否向 CSS 选择器注入作用域标识，默认 true；false 时仍转换 :scope / :global。 */
  injectScope?: boolean;
  /**
   * 自定义回调后统一添加的容器选择器，可用逗号指定多个容器，默认不添加。
   * 原生嵌套仅处理最外层规则，关键帧不受影响。
   */
  selectorPrefix?: string;
  /**
   * 命中时不添加统一前缀的顶层简单选择器，默认 ['html', 'head', 'body', ':root']。
   * 支持标签、类名、ID、属性或伪类等单个简单选择器，按逗号分隔的每条规则分别判断。
   * 不匹配函数伪类内部的节点。自定义数组替换默认值，[] 表示全部添加前缀。
   * 仅跳过前缀，不跳过作用域标记处理和 transformSelector 回调。
   */
  selectorPrefixExclude?: string[];
  /**
   * 在标记转换后逐条处理逗号分隔的选择器，跳过关键帧。
   * 嵌套 CSS 的回调接收当前规则的相对选择器；多作用域时按各自上下文调用。
   * @param selector 已转换的单条选择器。
   * @param context 当前规则的来源。
   * @returns 非空的选择器字符串。
   */
  transformSelector?: (selector: string, context: TransformSelectorContext) => string;
}

/** 支持单个上下文、多个上下文或按样式根节点动态返回配置。 */
export type PostcssScopeStyleConfig = PostcssScopeStyleOptions | PostcssScopeStyleOptions[]
  | ((root: Root) => PostcssScopeStyleOptions | PostcssScopeStyleOptions[] | null | undefined);

/**
 * 创建可直接传入 postcss([...]) 的插件。
 * @param options 作用域解析及选择器转换配置。
 * @returns 与当前 PostCSS 版本适配的插件工厂。
 */
export default function scopeStyle(options?: PostcssScopeStyleConfig): PluginCreator<void>;
