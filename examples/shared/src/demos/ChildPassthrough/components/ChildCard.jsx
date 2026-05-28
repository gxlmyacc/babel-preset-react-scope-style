import React from 'react';
import classnames from 'classnames';
import './ChildCard.scss?scoped';

/**
 * 子卡片：接收父组件透传的 className；结构样式在本文件，皮肤样式在父组件 ChildPassthrough.scss。
 * @param {object} props - 组件属性
 * @param {string} [props.className] - 父组件传入的皮肤 class
 * @param {string} props.title - 卡片标题
 * @param {import('react').ReactNode} props.children - 卡片正文
 * @returns {import('react').ReactElement} 子卡片
 */
function ChildCard({ className, title, children }) {
  return (
    <div className={classnames('child-card', className)}>
      <div className="child-card__header">{title}</div>
      <div className="child-card__body">{children}</div>
    </div>
  );
}

export default ChildCard;
