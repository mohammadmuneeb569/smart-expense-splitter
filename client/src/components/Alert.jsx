import React, { useEffect } from 'react';
import { X, AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';

const icons = {
  error: <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />,
  success: <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />,
  info: <Info size={16} className="text-slate-400 flex-shrink-0 mt-0.5" />,
  warning: <AlertTriangle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />,
};

const styles = {
  error: 'bg-red-950/30 border-red-900/50 text-red-200',
  success: 'bg-emerald-950/30 border-emerald-900/50 text-emerald-200',
  info: 'bg-slate-900/80 border-slate-800 text-slate-200',
  warning: 'bg-amber-950/30 border-amber-900/50 text-amber-200',
};

export default function Alert({ type = 'info', message, onClose, autoClose = false }) {
  useEffect(() => {
    if (autoClose && onClose) {
      const timer = setTimeout(onClose, 4000);
      return () => clearTimeout(timer);
    }
  }, [autoClose, onClose]);

  if (!message) return null;

  return (
    <div className={`flex items-start gap-2.5 px-3.5 py-3 rounded-lg border text-sm animate-slide-up ${styles[type] || styles.info}`}>
      {icons[type] || icons.info}
      <p className="flex-1 leading-snug text-xs sm:text-sm">{message}</p>
      {onClose && (
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-200 p-1 -mr-1 -mt-1 rounded transition-colors"
          aria-label="Dismiss alert"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
