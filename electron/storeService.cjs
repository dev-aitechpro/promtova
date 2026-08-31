// @ts-nocheck
// Обёртка над electron-store (§2.2, §2.3). Единственное место с доступом к диску.
// Логика вынесена в createStoreService, чтобы её можно было тестировать без Electron.

const STORE_KEYS = ['promtova-state', 'promtova-theme'];

/**
 * Чистая логика поверх инстанса electron-store.
 * Значения ходят строками — Zustand persist хранит `{ state, version }` в JSON.
 */
const createStoreService = (store) => ({
  get(key) {
    if (!STORE_KEYS.includes(key)) return null;
    try {
      const value = store.get(key);
      return value === undefined || value === null ? null : JSON.stringify(value);
    } catch (error) {
      console.error('[storeService] get failed', error);
      return null; // повреждённый JSON воспринимаем как отсутствие данных
    }
  },

  set(key, value) {
    if (!STORE_KEYS.includes(key)) return false;
    try {
      store.set(key, JSON.parse(value));
      return true;
    } catch (error) {
      console.error('[storeService] set failed', error);
      return false;
    }
  },

  remove(key) {
    if (!STORE_KEYS.includes(key)) return false;
    try {
      store.delete(key);
      return true;
    } catch (error) {
      console.error('[storeService] remove failed', error);
      return false;
    }
  },
});

/** electron-store создаётся лениво — модуль можно импортировать в тестах. */
const createStore = () => {
  const Store = require('electron-store');
  // name: 'stores' -> %APPDATA%\Promtova\stores.json
  return new Store({ name: 'stores' });
};

const registerStoreHandlers = (ipcMain, store) => {
  const service = createStoreService(store);
  ipcMain.handle('stores:get', (_event, key) => service.get(key));
  ipcMain.handle('stores:set', (_event, key, value) => service.set(key, value));
  ipcMain.handle('stores:remove', (_event, key) => service.remove(key));
};

module.exports = { STORE_KEYS, createStoreService, createStore, registerStoreHandlers };
