// Автообновление: подписка renderer на события electron-updater (ТЗ v4 §1).
// В веб-режиме (нет window.promtova.app) работает как no-op. Состояние transient —
// не переживает перезапуск и не пишется в персистентные сторы.
import { useEffect, useRef, useState } from 'react';
import type { UpdateEvent } from '../types/electron';

export interface UpdaterState {
  status: 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'error';
  /** Версия доступного/загруженного обновления. */
  version?: string;
  /** Процент загрузки (0..100). */
  percent?: number;
  /** Сообщение об ошибке (status === 'error'). */
  message?: string;
}

type UpdaterApi = {
  onUpdateEvent(cb: (e: UpdateEvent) => void): () => void;
  downloadUpdate(): Promise<void>;
  installUpdate(): Promise<void>;
};

const getApi = (): UpdaterApi | null => {
  if (typeof window === 'undefined') return null;
  return window.promtova?.app ?? null;
};

/** Переносит состояние событий, игнорируя отсутствующий нативный мост. */
const useAppUpdater = (): { state: UpdaterState; install: () => void; download: () => void; dismiss: () => void } => {
  const [state, setState] = useState<UpdaterState>({ status: 'idle' });
  // Синхронный флаг «загрузка идёт»: нужен, чтобы последовательность событий
  // update-available → download-progress срабатывала без гонки с React-рендером.
  const downloadingRef = useRef(false);
  const downloadedRef = useRef(false);

  useEffect(() => {
    const api = getApi();
    if (!api) return; // веб/vitest — обновления не существуют, делать нечего

    const unsubscribe = api.onUpdateEvent((e) => {
      switch (e.event) {
        case 'checking':
          setState({ status: 'checking' });
          break;
        case 'update-available':
          // не качаем автоматически — ждём согласия пользователя
          downloadingRef.current = false;
          setState({ status: 'available', version: e.payload?.version });
          break;
        case 'download-progress':
          // показываем прогресс только если загрузка уже начата
          if (downloadingRef.current && !downloadedRef.current) {
            setState({ status: 'downloading', version: e.payload?.version, percent: e.payload?.percent });
          }
          break;
        case 'update-downloaded':
          downloadingRef.current = true;
          downloadedRef.current = true;
          setState({ status: 'downloaded', version: e.payload?.version });
          break;
        case 'error':
          // тихий лог: отсутствие сети/канала — не повод тревожить пользователя
          console.warn('[updater]', e.payload?.message);
          setState({ status: 'error', message: e.payload?.message });
          break;
      }
    });

    return unsubscribe;
  }, []);

  const download = () => {
    const api = getApi();
    if (!api) return;
    downloadingRef.current = true;
    setState((s) => ({ status: 'downloading', version: s.version, percent: 0 }));
    void api.downloadUpdate();
  };

  const install = () => {
    const api = getApi();
    if (api && downloadedRef.current) {
      void api.installUpdate();
    }
  };

  const dismiss = () => {
    downloadingRef.current = false;
    downloadedRef.current = false;
    setState({ status: 'idle' });
  };

  return { state, install, download, dismiss };
};

export default useAppUpdater;
