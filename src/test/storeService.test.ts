// Тесты обёртки над electron-store (§2.2, §5.4 ТЗ).
// Импортируем CommonJS-модуль; типы заданы в src/types/electron-cjs.d.ts.
import { describe, it, expect } from 'vitest';
import { createStoreService, STORE_KEYS } from '../../electron/storeService.cjs';

type StoreLike = {
  data: Record<string, unknown>;
  get: (k: string) => unknown;
  set: (k: string, v: unknown) => void;
  delete: (k: string) => void;
};

const makeStore = (initial: Record<string, unknown> = {}): StoreLike => {
  const data: Record<string, unknown> = { ...initial };
  return {
    data,
    get: (k: string) => data[k],
    set: (k: string, v: unknown) => {
      data[k] = v;
    },
    delete: (k: string) => {
      delete data[k];
    },
  };
};

describe('storeService — обёртка над electron-store (§2.2, §5.4)', () => {
  it('STORE_KEYS ограничивает допустимые ключи', () => {
    expect(STORE_KEYS).toEqual(['promtova-state', 'promtova-theme']);
  });

  it('get возвращает JSON.stringify значения', () => {
    const s = createStoreService(
      makeStore({ 'promtova-state': { state: { a: 1 }, version: 2 } }),
    );
    expect(s.get('promtova-state')).toBe(JSON.stringify({ state: { a: 1 }, version: 2 }));
  });

  it('get → null, если ключа нет', () => {
    const s = createStoreService(makeStore());
    expect(s.get('promtova-state')).toBeNull();
  });

  it('get → null при повреждённом/бросающем store.get', () => {
    const bad = {
      get: () => {
        throw new Error('corrupt');
      },
      set: () => undefined,
      delete: () => undefined,
    };
    const s = createStoreService(bad as unknown as StoreLike);
    expect(s.get('promtova-state')).toBeNull();
  });

  it('set парсит JSON и сохраняет структуру {state, version}', () => {
    const store = makeStore();
    const s = createStoreService(store);
    expect(s.set('promtova-state', JSON.stringify({ state: { x: 1 }, version: 2 }))).toBe(true);
    expect(store.data['promtova-state']).toEqual({ state: { x: 1 }, version: 2 });
  });

  it('set → false для неизвестного ключа', () => {
    const s = createStoreService(makeStore());
    expect(s.set('other' as 'promtova-state', '{}')).toBe(false);
  });

  it('remove удаляет ключ', () => {
    const store = makeStore({ 'promtova-theme': { state: {} } });
    const s = createStoreService(store);
    expect(s.remove('promtova-theme')).toBe(true);
    expect(store.data['promtova-theme']).toBeUndefined();
  });

  it('get/set/remove отклоняют ключи вне STORE_KEYS', () => {
    const s = createStoreService(makeStore());
    expect(s.get('random' as 'promtova-state')).toBeNull();
    expect(s.set('random' as 'promtova-state', '{}')).toBe(false);
    expect(s.remove('random' as 'promtova-state')).toBe(false);
  });
});
