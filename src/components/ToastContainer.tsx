import React from 'react';
import { useApp } from '../context/AppContext';
import { CheckCircle2, Info, AlertTriangle, XCircle, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[110] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((toast) => {
        const icons = {
          success: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
          info: <Info className="w-5 h-5 text-sky-400 shrink-0" />,
          warning: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
          error: <XCircle className="w-5 h-5 text-rose-400 shrink-0" />,
        };

        const bgColors = {
          success: 'bg-zinc-900/95 border-emerald-500/30 text-zinc-100 shadow-emerald-500/10',
          info: 'bg-zinc-900/95 border-sky-500/30 text-zinc-100 shadow-sky-500/10',
          warning: 'bg-zinc-900/95 border-amber-500/30 text-zinc-100 shadow-amber-500/10',
          error: 'bg-zinc-900/95 border-rose-500/30 text-zinc-100 shadow-rose-500/10',
        };

        return (
          <div
            key={toast.id}
            id={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border shadow-xl backdrop-blur-md transition-all duration-300 transform translate-y-0 opacity-100 ${bgColors[toast.type]}`}
          >
            <div className="mt-0.5">
              {toast.icon ? (
                <span className="text-xl leading-none">{toast.icon}</span>
              ) : (
                icons[toast.type]
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold tracking-wide text-zinc-100">
                {toast.title}
              </h4>
              <p className="text-xs text-zinc-300 mt-0.5 leading-relaxed break-words">
                {toast.message}
              </p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-zinc-400 hover:text-zinc-200 transition-colors p-1 -mr-1 -mt-1 rounded-lg hover:bg-zinc-800/60"
              aria-label="ปิด"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
