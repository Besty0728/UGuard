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
    <dialog ref={ref} onClose={onCancel} className="fixed inset-0 z-50 m-auto max-w-sm w-full p-0 rounded-2xl border border-white/80 bg-white/80 backdrop-blur-3xl shadow-glass backdrop:bg-stone-900/10 backdrop:backdrop-blur-sm">
      <div className="p-6">
        <h3 className="text-lg font-display font-bold text-dark mb-2">{title}</h3>
        <p className="text-[14px] font-medium text-dark/70 leading-relaxed">{message}</p>
      </div>
      <div className="flex justify-end gap-3 px-6 pb-6 mt-2">
        <button onClick={onCancel} className="px-4 py-2 text-[14px] font-semibold text-dark/70 border border-transparent hover:border-neutral-200 rounded-xl hover:bg-neutral-100 transition-all">{cancelText}</button>
        <button onClick={onConfirm} className={`px-4 py-2 text-[14px] font-semibold text-white border border-transparent rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all active:translate-y-0 active:shadow-sm ${danger ? 'bg-red-500 hover:bg-red-600 shadow-red-500/20' : 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20'}`}>{confirmText}</button>
      </div>
    </dialog>
  );
}
