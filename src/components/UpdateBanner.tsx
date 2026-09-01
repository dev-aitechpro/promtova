// Баннер автообновления (ТЗ v4 §1.2). Только в Electron и только при активном
// обновлении. В вебе/тестах useAppUpdater отдаёт idle → рендерим null.
import { RefreshCw, Download, Check, X } from 'lucide-react';
import useAppUpdater from '../hooks/useAppUpdater';
import Button from './ui/Button';

const UpdateBanner = () => {
  const { state, install, download, dismiss } = useAppUpdater();

  if (state.status === 'idle' || state.status === 'checking' || state.status === 'error') {
    return null;
  }

  const isDownloading = state.status === 'downloading';
  const isAvailable = state.status === 'available';

  return (
    <div
      className="pointer-events-auto fixed bottom-5 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2"
      role="status"
      aria-live="polite"
    >
      <div
        className="overflow-hidden rounded-xl border shadow-lg"
        style={{
          background: 'var(--bg-elevated)',
          borderColor: 'var(--border-primary)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div className="flex items-start gap-3 px-4 py-3">
          <div
            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
            style={{ background: 'var(--accent-subtle)', color: 'var(--accent-primary)' }}
          >
            {state.status === 'downloaded' ? (
              <Check size={16} />
            ) : isDownloading ? (
              <Download size={16} />
            ) : isAvailable ? (
              <RefreshCw size={16} />
            ) : (
              <RefreshCw size={16} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            {state.status === 'downloaded' ? (
              <>
                <p className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Обновление готово{state.version ? ` · v${state.version}` : ''}
                </p>
                <p className="mt-0.5 text-[11.5px]" style={{ color: 'var(--text-secondary)' }}>
                  Перезапустите приложение, чтобы применить новую версию.
                </p>
              </>
            ) : isAvailable ? (
              <>
                <p className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Доступно обновление{state.version ? ` · v${state.version}` : ''}
                </p>
                <p className="mt-0.5 text-[11.5px]" style={{ color: 'var(--text-secondary)' }}>
                  Загрузить и установить новую версию?
                </p>
              </>
            ) : (
              <>
                <p className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Загружается обновление{state.version ? ` · v${state.version}` : ''}…
                </p>
                <div
                  className="mt-2 h-1 w-full overflow-hidden rounded-full"
                  style={{ background: 'var(--bg-active)' }}
                >
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      background: 'var(--accent-primary)',
                      width: `${state.percent ?? 0}%`,
                    }}
                  />
                </div>
              </>
            )}
          </div>
          <button
            onClick={dismiss}
            aria-label="Закрыть уведомление"
            className="rounded p-0.5 opacity-60 hover:opacity-100"
            style={{ color: 'var(--text-secondary)' }}
          >
            <X size={14} />
          </button>
        </div>

        {state.status === 'available' && (
          <div
            className="flex items-center justify-end gap-2 border-t px-4 py-2.5"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <Button variant="ghost" size="sm" onClick={dismiss}>
              Позже
            </Button>
            <Button variant="primary" size="sm" onClick={download}>
              Загрузить
            </Button>
          </div>
        )}
        {state.status === 'downloaded' && (
          <div
            className="flex items-center justify-end gap-2 border-t px-4 py-2.5"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <Button variant="ghost" size="sm" onClick={dismiss}>
              Позже
            </Button>
            <Button variant="primary" size="sm" onClick={install}>
              Перезапустить сейчас
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UpdateBanner;
