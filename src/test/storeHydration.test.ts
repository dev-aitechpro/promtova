// Асинхронная гидрация Zustand-стора поверх async-хранилища (§2.4, §5.3 ТЗ).
// Проверяем тот же механизм, что использует nativeStorage: migrate / partialize
// сохраняются, seed не перезатирает восстановленные данные.
import { describe, it, expect } from 'vitest';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { StateStorage } from 'zustand/middleware';

const makeAsyncStorage = (initial: Record<string, string>) => {
  const map = new Map(Object.entries(initial));
  const storage: StateStorage = {
    getItem: async (n) => map.get(n) ?? null,
    setItem: async (n, v) => {
      map.set(n, v);
    },
    removeItem: async (n) => {
      map.delete(n);
    },
  };
  return { storage, map };
};

const waitHydrated = async (store: {
  persist: {
    hasHydrated: () => boolean;
    onFinishHydration: (cb: () => void) => () => void;
  };
}): Promise<void> => {
  if (store.persist.hasHydrated()) return;
  await new Promise<void>((res) => {
    const unsub = store.persist.onFinishHydration(() => {
      unsub();
      res();
    });
  });
};

describe('Zustand persist + async-хранилище (§2.4, §5.3)', () => {
  it('гидрация из предзаполненного файла восстанавливает данные, seed не перезатирает', async () => {
    const persisted = JSON.stringify({ state: { count: 42, label: 'old' }, version: 1 });
    const { storage } = makeAsyncStorage({ 'test-store': persisted });

    const useStore = create<{ count: number; label: string; inc: () => void }>()(
      persist(
        (set) => ({
          count: 0,
          label: 'seed',
          inc: () => set((s) => ({ count: s.count + 1 })),
        }),
        {
          name: 'test-store',
          version: 2,
          storage: createJSONStorage(() => storage),
          partialize: (s) => ({ count: s.count, label: s.label }),
          migrate: (persistedState: unknown, version: number) => {
            const p = (persistedState ?? {}) as { count?: number; label?: string };
            if (version < 2) {
              return { count: p.count ?? 0, label: p.label ?? 'migrated' };
            }
            return { count: p.count ?? 0, label: p.label ?? 'seed' };
          },
        },
      ),
    );

    await waitHydrated(useStore);

    const st = useStore.getState();
    expect(st.count).toBe(42); // восстановлено из файла, не seed (0)
    expect(st.label).toBe('old'); // migrate не затирает существующее
    expect(typeof st.inc).toBe('function'); // методы стора сохранены
  });

  it('partialize ограничивает сохраняемые поля', async () => {
    const { storage, map } = makeAsyncStorage({});
    const useStore = create<{ keep: string; skip: string }>()(
      persist(
        (_set) => ({ keep: 'a', skip: 'b' }),
        {
          name: 'partial-store',
          version: 1,
          storage: createJSONStorage(() => storage),
          partialize: (s) => ({ keep: s.keep }),
        },
      ),
    );

    await waitHydrated(useStore);
    useStore.setState({ keep: 'a2', skip: 'b2' });
    await new Promise((r) => setTimeout(r, 20)); // дать persist записать

    const written = map.get('partial-store');
    expect(written).toBeTruthy();
    const parsed = JSON.parse(written as string);
    expect(parsed.state).toHaveProperty('keep');
    expect(parsed.state).not.toHaveProperty('skip');
  });
});
