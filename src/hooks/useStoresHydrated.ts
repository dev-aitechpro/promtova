// Асинхронная гидрация persist (§2.4).
// С нативным хранилищем чтение файла идёт через IPC, поэтому стор гидратируется
// асинхронно. Пока это не произошло, App не рендерится — иначе поверх готовых данных
// на кадр «проскочил» бы пустой seed.
import { useEffect, useState } from 'react';
import { usePromtovaStore, useThemeStore } from '../store/usePromtovaStore';

export const useStoresHydrated = (): boolean => {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let alive = true;

    const isReady = () =>
      usePromtovaStore.persist.hasHydrated() && useThemeStore.persist.hasHydrated();

    const sync = () => {
      if (alive && isReady()) setHydrated(true);
    };

    sync(); // гидрация могла завершиться до монтирования
    const unsubData = usePromtovaStore.persist.onFinishHydration(sync);
    const unsubTheme = useThemeStore.persist.onFinishHydration(sync);
    sync(); // на случай, если колбэк уже отработал между проверкой и подпиской

    return () => {
      alive = false;
      unsubData();
      unsubTheme();
    };
  }, []);

  return hydrated;
};
