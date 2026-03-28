import { useEffect, useRef } from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { ThemeButton } from './common/Buttons';

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmText,
  cancelText,
  danger,
  onConfirm,
  onCancel,
}: Props) {
  const { language } = useI18n();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }

    if (open && !element.open) {
      element.showModal();
    }

    if (!open && element.open) {
      element.close();
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const confirmLabel = confirmText ?? (language === 'zh' ? '确认' : 'Confirm');
  const cancelLabel = cancelText ?? (language === 'zh' ? '取消' : 'Cancel');

  return (
    <dialog ref={ref} onClose={onCancel} className="fixed inset-0 z-50 m-auto w-full max-w-sm rounded-2xl border border-white/80 bg-white/80 p-0 shadow-glass backdrop:bg-stone-900/10 backdrop:backdrop-blur-sm backdrop-blur-3xl">
      <div className="p-6">
        <h3 className="mb-2 text-lg font-display font-bold text-dark">{title}</h3>
        <p className="text-[14px] font-medium leading-relaxed text-dark/70">{message}</p>
      </div>
      <div className="mt-2 flex justify-end gap-3 px-6 pb-6">
        <ThemeButton variant="gray" onClick={onCancel}>
          {cancelLabel}
        </ThemeButton>
        <ThemeButton variant={danger ? 'red' : 'amber'} onClick={onConfirm}>
          {confirmLabel}
        </ThemeButton>
      </div>
    </dialog>
  );
}
