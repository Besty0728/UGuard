import { useEffect, useRef } from 'react';

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

export function ConfirmDialog({ open, title, message, confirmText = '确认', cancelText = '取消', danger, onConfirm, onCancel }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const el = ref.current; if (!el) return; if (open && !el.open) el.showModal(); if (!open && el.open) el.close(); }, [open]);
  if (!open) return null;

  return (
    <dialog ref={ref} onClose={onCancel} className="fixed inset-0 z-50 m-auto max-w-sm w-full p-0 rounded-xl border-0 bg-white shadow-modal">
      <div className="p-5">
        <h3 className="text-sm font-display font-semibold text-neutral-800 mb-1">{title}</h3>
        <p className="text-[13px] text-neutral-500 leading-relaxed">{message}</p>
      </div>
      <div className="flex justify-end gap-2 px-5 pb-5">
        <button onClick={onCancel} className="px-3 py-1.5 text-[13px] font-medium text-neutral-500 rounded-lg hover:bg-neutral-50 transition-colors">{cancelText}</button>
        <button onClick={onConfirm} className={`px-3 py-1.5 text-[13px] font-medium text-white rounded-lg transition-colors ${danger ? 'bg-red-500 hover:bg-red-600' : 'bg-primary-600 hover:bg-primary-700'}`}>{confirmText}</button>
      </div>
    </dialog>
  );
}
