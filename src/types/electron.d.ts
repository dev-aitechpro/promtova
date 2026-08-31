// Контракт моста renderer ↔ main (§2.3). Экспонируется preload через contextBridge.

/** Ключи Zustand-сторов, которые хранятся на диске. */
export type StoreKey = 'promtova-state' | 'promtova-theme';

export interface NativeFileFilter {
  name: string;
  extensions: string[];
}

export interface OpenDialogOptions {
  title?: string;
  filters?: NativeFileFilter[];
  properties?: string[];
  defaultPath?: string;
}

export interface SaveDialogOptions {
  title?: string;
  filters?: NativeFileFilter[];
  defaultPath?: string;
}

export type UpdateEventName =
  | 'checking'
  | 'update-available'
  | 'download-progress'
  | 'update-downloaded'
  | 'error';

export interface UpdateEvent {
  event: UpdateEventName;
  payload?: { version?: string; percent?: number; message?: string };
}

export interface NativeStoresApi {
  get(key: StoreKey): Promise<string | null>;
  set(key: StoreKey, value: string): Promise<void>;
  remove(key: StoreKey): Promise<void>;
}

export interface NativeFileApi {
  showOpenDialog(opts: OpenDialogOptions): Promise<string[] | null>;
  showSaveDialog(opts: SaveDialogOptions): Promise<string | null>;
  readText(filePath: string): Promise<string>;
  writeText(filePath: string, content: string): Promise<void>;
}

export interface NativeAppApi {
  isElectron: boolean;
  /** Абсолютный путь к файлу данных (в Electron) или null в веб-режиме. */
  dataPath: string | null;
  version: string;
  onUpdateEvent(cb: (e: UpdateEvent) => void): () => void;
  installUpdate(): Promise<void>;
}

export interface PromtovaApi {
  stores: NativeStoresApi;
  file: NativeFileApi;
  app: NativeAppApi;
}

declare global {
  interface Window {
    /** Отсутствует в веб-режиме и в vitest — там работает in-memory адаптер. */
    promtova?: PromtovaApi;
  }
}
