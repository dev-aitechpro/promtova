// Тесты UI автообновления (ТЗ v4 §1.4). Mock window.promtova.app без реального electron-updater.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import useAppUpdater from '../hooks/useAppUpdater';
import UpdateBanner from '../components/UpdateBanner';
import type { PromtovaApi, UpdateEvent } from '../types/electron';

type AppApi = PromtovaApi['app'];

const clearBridge = () => {
  delete (window as unknown as { promtova?: PromtovaApi }).promtova;
};

const installAppBridge = (): { emit: (e: UpdateEvent) => void; installUpdate: ReturnType<typeof vi.fn> } => {
  let subscribers: Array<(e: UpdateEvent) => void> = [];
  const emit = (e: UpdateEvent) => subscribers.forEach((cb) => cb(e));
  const installUpdate = vi.fn(async () => undefined);
  const api: AppApi = {
    isElectron: true,
    dataPath: 'C:\\Users\\x\\AppData\\Roaming\\Promtova\\stores.json',
    version: '1.2.0',
    onUpdateEvent: (cb) => {
      subscribers.push(cb);
      return () => {
        subscribers = subscribers.filter((s) => s !== cb);
      };
    },
    installUpdate,
    openExternal: vi.fn(async () => undefined),
  };
  (window as unknown as { promtova: PromtovaApi }).promtova = {
    stores: {} as PromtovaApi['stores'],
    file: {} as PromtovaApi['file'],
    app: api,
  };
  return { emit, installUpdate };
};

// ============= Hook Harness =============
const HookHarness = ({ render }: { render: (s: ReturnType<typeof useAppUpdater>) => React.ReactNode }) => {
  const hook = useAppUpdater();
  return <>{render(hook)}</>;
};

describe('useAppUpdater — состояния (§1.2, §1.4)', () => {
  beforeEach(() => {
    clearBridge();
    vi.clearAllMocks();
  });
  afterEach(() => cleanup());

  it('в веб-режиме (нет window.promtova.app) — idle и ничего не делает', () => {
    render(<HookHarness render={(h) => <div data-testid="s">{h.state.status}</div>} />);
    expect(screen.getByTestId('s').textContent).toBe('idle');
  });

  it('подписывается на onUpdateEvent и ловит update-downloaded', async () => {
    const { emit } = installAppBridge();
    render(<HookHarness render={(h) => <div data-testid="s">{h.state.status}:{h.state.version ?? ''}</div>} />);
    emit({ event: 'update-downloaded', payload: { version: '1.3.0' } });
    await waitFor(() =>
      expect(screen.getByTestId('s').textContent).toBe('downloaded:1.3.0'),
    );
  });

  it('прогресс загрузки обновляет percent', async () => {
    const { emit } = installAppBridge();
    render(<HookHarness render={(h) => <div data-testid="s">{h.state.status}:{h.state.percent ?? ''}</div>} />);
    emit({ event: 'update-available', payload: { version: '1.3.0' } });
    emit({ event: 'download-progress', payload: { percent: 42 } });
    await waitFor(() => expect(screen.getByTestId('s').textContent).toBe('downloading:42'));
  });

  it('installUpdate вызывается для состояния downloaded', async () => {
    const user = userEvent.setup();
    const { emit, installUpdate } = installAppBridge();
    render(<UpdateBanner />);
    emit({ event: 'update-downloaded', payload: { version: '1.3.0' } });
    const btn = await screen.findByRole('button', { name: 'Перезапустить сейчас' });
    await user.click(btn);
    expect(installUpdate).toHaveBeenCalledTimes(1);
  });

  it('ошибка скрывает баннер (не рендерится)', () => {
    const { emit } = installAppBridge();
    const { container } = render(<UpdateBanner />);
    emit({ event: 'error', payload: { message: 'net err' } });
    expect(container.querySelector('[role="status"]')).not.toBeInTheDocument();
  });
});
