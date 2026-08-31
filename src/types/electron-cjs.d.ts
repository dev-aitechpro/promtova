// Ambient-декларации для CommonJS-модулей Electron (electron/*.cjs),
// импортируемых из vitest-тестов. Нужны, чтобы `tsc --noEmit` (§12.1 ТЗ)
// не падал на отсутствии типов у .cjs-файлов, которые лежат вне `include`.

declare module '*/electron/storeService.cjs' {
  export const STORE_KEYS: string[];
  export function createStoreService(store: {
    get(key: string): unknown;
    set(key: string, value: unknown): void;
    delete(key: string): void;
  }): {
    get(key: string): string | null;
    set(key: string, value: string): boolean;
    remove(key: string): boolean;
  };
  export function createStore(): unknown;
  export function registerStoreHandlers(ipcMain: unknown, store: unknown): void;
}

declare module '*/electron/updater.cjs' {
  export function registerUpdater(
    win: unknown,
    ctx: { ipcMain: unknown; app: { isPackaged: boolean } },
    autoUpdaterOverride?: unknown,
  ): { check: () => void; stop: () => void };
  export const CHECK_INTERVAL_MS: number;
}
