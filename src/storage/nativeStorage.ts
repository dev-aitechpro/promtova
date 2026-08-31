// Нативное хранилище (§2.1, §2.4).
// В Electron значения уходят в main-процесс через preload-мост и попадают в JSON-файл
// на диске (electron-store). Веб-режим и vitest работают на in-memory адаптере —
// НЕ на localStorage: обращений к web-хранилищам в коде нет вообще (§1.3, §10).
import type { StateStorage } from 'zustand/middleware';

/** Память процесса — фолбэк для веб-режима и тестов. Ничего не пишет на диск. */
const memory = new Map<string, string>();

export const memoryStorage: StateStorage = {
  getItem: (name) => memory.get(name) ?? null,
  setItem: (name, value) => {
    memory.set(name, value);
  },
  removeItem: (name) => {
    memory.delete(name);
  },
};

/** Очистка in-memory адаптера — используется в тестах вместо localStorage.clear(). */
export const resetMemoryStorage = (): void => {
  memory.clear();
};

/** Доступен ли нативный мост (Electron). */
export const isNativePersistence = (): boolean =>
  typeof window !== 'undefined' && !!window.promtova?.stores;

const storesApi = () =>
  typeof window !== 'undefined' ? window.promtova?.stores ?? null : null;

/**
 * Адаптер поверх IPC. Любая ошибка моста — прозрачный откат на in-memory,
 * чтобы UI никогда не падал из-за хранилища.
 */
export const nativeStorage: StateStorage = {
  getItem: async (name) => {
    const api = storesApi();
    if (!api) return memoryStorage.getItem(name);
    try {
      return await api.get(name as never);
    } catch {
      return memoryStorage.getItem(name);
    }
  },

  setItem: async (name, value) => {
    const api = storesApi();
    if (!api) return memoryStorage.setItem(name, value);
    try {
      await api.set(name as never, value);
    } catch {
      memoryStorage.setItem(name, value);
    }
  },

  removeItem: async (name) => {
    const api = storesApi();
    if (api) {
      try {
        await api.remove(name as never);
      } catch {
        // игнорируем: ниже всё равно чистим память
      }
    }
    memoryStorage.removeItem(name);
  },
};

/** Путь к файлу данных (для окна «Настройки»), null в веб-режиме. */
export const getDataPath = (): string | null =>
  (typeof window !== 'undefined' && window.promtova?.app?.dataPath) || null;

/** Полный сброс базы: очищаем нативный файл и память (§8). */
export const resetAllData = async (): Promise<void> => {
  await nativeStorage.removeItem('promtova-state');
  await nativeStorage.removeItem('promtova-theme');
  resetMemoryStorage();
};
