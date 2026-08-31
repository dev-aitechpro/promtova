import { useUIStore } from '../store/usePromtovaStore';
import { X, AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';

// =============== Toast ===============
const ToastStack = () => {
  const { toasts, dismissToast } = useUIStore();
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="toast-enter pointer-events-auto flex min-w-[280px] max-w-sm items-start gap-3 rounded-lg border px-4 py-3 shadow-lg"
          style={{
            background: 'var(--bg-elevated)',
            borderColor: 'var(--border-primary)',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          {t.type === 'success' && <CheckCircle2 size={18} className="mt-0.5 shrink-0" style={{ color: 'var(--status-success)' }} />}
          {t.type === 'error' && <AlertCircle size={18} className="mt-0.5 shrink-0" style={{ color: 'var(--status-error)' }} />}
          {t.type === 'warning' && <AlertTriangle size={18} className="mt-0.5 shrink-0" style={{ color: 'var(--status-warning)' }} />}
          {t.type === 'info' && <Info size={18} className="mt-0.5 shrink-0" style={{ color: 'var(--status-info)' }} />}
          <span className="flex-1 text-[13px]" style={{ color: 'var(--text-primary)' }}>{t.message}</span>
          <button
            onClick={() => dismissToast(t.id)}
            className="rounded p-0.5 opacity-60 hover:opacity-100"
            style={{ color: 'var(--text-secondary)' }}
            aria-label="Закрыть"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};

export default ToastStack;
