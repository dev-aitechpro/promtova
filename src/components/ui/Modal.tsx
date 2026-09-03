import { X } from 'lucide-react';

// =============== Modal Wrapper ===============
// Esc обрабатывается централизованно в useGlobalHotkeys (§8.1), чтобы не закрывать
// две модалки одновременно при вложенном открытии.
const Modal = ({
  open,
  onClose,
  title,
  children,
  width = '520px',
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: string;
  footer?: React.ReactNode;
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 animate-fade-in" style={{ background: 'rgba(0,0,0,0.55)' }}>
      <div
        className="animate-scale-in flex max-h-[90vh] w-full flex-col overflow-hidden rounded-xl border"
        style={{
          width,
          maxWidth: '100%',
          background: 'var(--bg-elevated)',
          borderColor: 'var(--border-primary)',
          boxShadow: 'var(--shadow-lg)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between border-b px-5 py-3.5"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <h2 className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 transition-colors hover:bg-white/5"
            style={{ color: 'var(--text-secondary)' }}
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div
            className="flex items-center justify-end gap-2 border-t px-5 py-3"
            style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-panel)' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
