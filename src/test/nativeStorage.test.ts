// Тесты нативного хранилища (§2.1, §2.3, §4.1, §5.1, §5.2 ТЗ).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  nativeStorage,
  memoryStorage,
  resetMemoryStorage,
  isNativePersistence,
  getDataPath,
  resetAllData,
} from '../storage/nativeStorage';
import type { PromtovaApi } from '../types/electron';

const clearBridge = () => {
  delete (window as unknown as { promtova?: PromtovaApi }).promtova;
};

describe('nativeStorage — in-memory fallback без window.promtova (§2.1, §4.1)', () => {
  beforeEach(() => {
    resetMemoryStorage();
    clearBridge();
  });

  it('пишет и читает через in-memory адаптер', async () => {
    expect(isNativePersistence()).toBe(false);
    await nativeStorage.setItem('promtova-state', '{"state":{}}');
    expect(await nativeStorage.getItem('promtova-state')).toBe('{"state":{}}');
    await nativeStorage.removeItem('promtova-state');
    expect(await nativeStorage.getItem('promtova-state')).toBeNull();
  });

  it('memoryStorage — чистый JS-объект, не web-хранилище', async () => {
    expect(await memoryStorage.getItem('k')).toBeNull();
    memoryStorage.setItem('k', 'v');
    expect(await memoryStorage.getItem('k')).toBe('v');
    memoryStorage.removeItem('k');
    expect(await memoryStorage.getItem('k')).toBeNull();
  });

  it('getDataPath = null без моста', () => {
    expect(getDataPath()).toBeNull();
  });
});

describe('nativeStorage — маппинг в window.promtova.stores (§2.3)', () => {
  beforeEach(() => {
    resetMemoryStorage();
    clearBridge();
  });

  const installBridge = (): PromtovaApi => {
    const get = vi.fn(async (key: string) =>
      key === 'promtova-state' ? '{"state":{}}' : null,
    );
    const set = vi.fn(async () => undefined);
    const remove = vi.fn(async () => undefined);
    const api: PromtovaApi = {
      stores: { get, set, remove },
      file: {} as PromtovaApi['file'],
      app: {} as PromtovaApi['app'],
      catalog: {} as PromtovaApi['catalog'],
    };
    (window as unknown as { promtova?: PromtovaApi }).promtova = api;
    return api;
  };

  it('getItem вызывает stores.get и возвращает значение', async () => {
    const api = installBridge();
    const value = await nativeStorage.getItem('promtova-state');
    expect(value).toBe('{"state":{}}');
    expect(api.stores.get).toHaveBeenCalledWith('promtova-state');
  });

  it('setItem уходит в stores.set (in-memory не трогается)', async () => {
    const api = installBridge();
    await nativeStorage.setItem('promtova-theme', '{"state":{}}');
    expect(api.stores.set).toHaveBeenCalledWith('promtova-theme', '{"state":{}}');
    // значение не попало в локальную память — оно на диске (в моке)
    expect(await memoryStorage.getItem('promtova-theme')).toBeNull();
  });

  it('removeItem уходит в stores.remove и чистит память', async () => {
    const api = installBridge();
    memoryStorage.setItem('promtova-state', 'x');
    await nativeStorage.removeItem('promtova-state');
    expect(api.stores.remove).toHaveBeenCalledWith('promtova-state');
    expect(await memoryStorage.getItem('promtova-state')).toBeNull();
  });

  it('getDataPath берётся из app.dataPath', () => {
    const api: PromtovaApi = {
      stores: {} as PromtovaApi['stores'],
      file: {} as PromtovaApi['file'],
      app: { dataPath: 'C:\\Users\\x\\AppData\\Roaming\\Promtova\\stores.json' } as PromtovaApi['app'],
      catalog: {} as PromtovaApi['catalog'],
    };
    (window as unknown as { promtova?: PromtovaApi }).promtova = api;
    expect(getDataPath()).toBe('C:\\Users\\x\\AppData\\Roaming\\Promtova\\stores.json');
  });

  it('при сбое моста — прозрачный откат на in-memory (не падает)', async () => {
    const api: PromtovaApi = {
      stores: {
        get: async () => {
          throw new Error('bridge down');
        },
        set: async () => {
          throw new Error('bridge down');
        },
        remove: async () => {
          throw new Error('bridge down');
        },
      },
      file: {} as PromtovaApi['file'],
      app: {} as PromtovaApi['app'],
      catalog: {} as PromtovaApi['catalog'],
    };
    (window as unknown as { promtova?: PromtovaApi }).promtova = api;

    expect(await nativeStorage.getItem('promtova-state')).toBeNull();
    // setItem не бросает, значение оседает в in-memory
    await expect(nativeStorage.setItem('promtova-state', 'v')).resolves.toBeUndefined();
    expect(await memoryStorage.getItem('promtova-state')).toBe('v');
  });
});

describe('resetAllData (§8)', () => {
  beforeEach(() => {
    resetMemoryStorage();
    clearBridge();
  });

  it('удаляет оба ключа стора', async () => {
    memoryStorage.setItem('promtova-state', 'a');
    memoryStorage.setItem('promtova-theme', 'b');
    await resetAllData();
    expect(await memoryStorage.getItem('promtova-state')).toBeNull();
    expect(await memoryStorage.getItem('promtova-theme')).toBeNull();
  });
});
