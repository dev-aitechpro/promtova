// @ts-nocheck
// Мост renderer ↔ main (§2.3). contextIsolation: true — в renderer уходит только
// этот белый список методов, без ipcRenderer и без доступа к Node.

const { contextBridge, ipcRenderer } = require('electron');

// Однократный синхронный вызов на старте: пути и версия нужны renderer сразу,
// до первого рендера окна «Настройки».
const info = ipcRenderer.sendSync('app:getInfoSync') || {};

contextBridge.exposeInMainWorld('promtova', {
  stores: {
    get: (key) => ipcRenderer.invoke('stores:get', key),
    set: (key, value) => ipcRenderer.invoke('stores:set', key, value),
    remove: (key) => ipcRenderer.invoke('stores:remove', key),
  },

  file: {
    showOpenDialog: async (opts) => {
      const result = await ipcRenderer.invoke('file:openDialog', opts);
      return result.canceled ? null : result.filePaths;
    },
    showSaveDialog: async (opts) => {
      const result = await ipcRenderer.invoke('file:saveDialog', opts);
      return result.canceled ? null : result.filePath;
    },
    readText: (filePath) => ipcRenderer.invoke('file:readText', filePath),
    writeText: (filePath, content) => ipcRenderer.invoke('file:writeText', filePath, content),
  },

  app: {
    isElectron: true,
    dataPath: info.dataPath || null,
    version: info.version || null,
    getInfo: () => ipcRenderer.invoke('app:getInfo'),
    openExternal: (url) => ipcRenderer.invoke('app:openExternal', url),

    onUpdateEvent: (callback) => {
      const listener = (_event, data) => callback(data);
      ipcRenderer.on('updater:event', listener);
      return () => ipcRenderer.removeListener('updater:event', listener);
    },

    installUpdate: () => ipcRenderer.invoke('updater:install'),
  },
});
