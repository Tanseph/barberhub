import React from 'react';
import { useApp } from '../context/AppContext';

export const ModalConfirm: React.FC = () => {
  const { confirmDialog, closeConfirm, theme } = useApp();
  const isDark = theme.isDark ?? true;

  if (!confirmDialog.isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div
        className={`rounded-2xl max-w-md w-full p-6 shadow-2xl transform transition-all animate-scaleUp border ${
          isDark ? 'bg-zinc-900 border-zinc-700/80 text-zinc-100' : 'bg-white border-slate-200 text-slate-900'
        }`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center gap-3.5 mb-4">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-2xl shrink-0">
            {confirmDialog.icon || '⚠️'}
          </div>
          <div>
            <h3 className={`text-lg font-bold ${isDark ? 'text-zinc-100' : 'text-slate-900'}`}>
              {confirmDialog.title}
            </h3>
            <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-slate-500'} mt-0.5`}>
              ระบบจัดการร้านตัดผม BarberPOS
            </p>
          </div>
        </div>

        <div className={`rounded-xl p-4 border mb-6 ${
          isDark ? 'bg-zinc-950/60 border-zinc-800/80' : 'bg-slate-50 border-slate-200'
        }`}>
          <p className={`text-sm leading-relaxed ${isDark ? 'text-zinc-300' : 'text-slate-700'}`}>
            {confirmDialog.message}
          </p>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={closeConfirm}
            className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors btn-tactile ${
              isDark ? 'border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-300' : 'border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            {confirmDialog.cancelText || 'ยกเลิก'}
          </button>
          <button
            type="button"
            onClick={() => {
              try {
                confirmDialog.onConfirm();
              } finally {
                closeConfirm();
              }
            }}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold text-white shadow-xs transition-all btn-tactile ${
              confirmDialog.confirmColor || 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/25'
            }`}
          >
            {confirmDialog.confirmText || 'ยืนยันดำเนินการ'}
          </button>
        </div>
      </div>
    </div>
  );
};
