import React from 'react';
import classnames from 'classnames';
import { useI18n } from '../../../i18n/I18nProvider';
import './MockModal.scss?scoped';

/**
 * 模拟带 wrapClassName 的弹层组件（类似 Ant Design Modal）。
 * @param {object} props - 组件属性
 * @param {boolean} props.open - 是否显示
 * @param {string} [props.wrapClassName] - 包裹层自定义 class（会注入 scope id）
 * @param {string} props.title - 标题
 * @param {import('react').ReactNode} props.children - 内容
 * @param {() => void} props.onClose - 关闭回调
 * @returns {import('react').ReactElement | null} 弹层或 null
 */
function MockModal({
  open, wrapClassName, title, children, onClose,
}) {
  const { t } = useI18n();

  if (!open) return null;

  return (
    <div className={classnames('mock-modal', wrapClassName)} role="dialog">
      <button
        type="button"
        className="mock-modal__mask"
        aria-label={t('common.closeAria')}
        onClick={onClose}
      />
      <div className="mock-modal__wrap">
        <div className="mock-modal__content">
          <header className="mock-modal__header">
            <h4 className="mock-modal__title">{title}</h4>
            <button type="button" className="mock-modal__close" onClick={onClose}>
              ×
            </button>
          </header>
          <div className="mock-modal__body">{children}</div>
        </div>
      </div>
    </div>
  );
}

export default MockModal;
