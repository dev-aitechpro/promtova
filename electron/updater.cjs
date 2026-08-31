// @ts-nocheck
// Автообновление через electron-updater (§3.4).
// События уходят в renderer каналом 'updater:event'; установка — по запросу пользователя.

const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000; // 4 часа

const registerUpdater = (win, { ipcMain, app }, autoUpdaterOverride) => {
  let autoUpdater;
  try {
    // electron-updater есть только в упакованной сборке — отсутствие не должно ронять запуск.
    // autoUpdaterOverride используется в тестах (юнит без реального electron-updater).
    autoUpdater = autoUpdaterOverride ?? require('electron-updater').autoUpdater;
  } catch (error) {
    console.warn('[updater] electron-updater недоступен, обновления отключены:', error.message);
    return { check: () => {} };
  }

  const send = (event, payload) => {
    if (win && !win.isDestroyed()) win.webContents.send('updater:event', { event, payload });
  };

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => send('checking'));
  autoUpdater.on('update-available', (info) => send('update-available', { version: info && info.version }));
  autoUpdater.on('download-progress', (progress) =>
    send('download-progress', { percent: progress && progress.percent }),
  );
  autoUpdater.on('update-downloaded', (info) =>
    send('update-downloaded', { version: info && info.version }),
  );
  autoUpdater.on('error', (error) =>
    // отсутствие сети/канала — не ошибка приложения: работаем дальше
    send('error', { message: (error && error.message) || String(error) }),
  );

  ipcMain.handle('updater:install', () => {
    autoUpdater.quitAndInstall();
  });

  const check = () => {
    if (!app.isPackaged) return Promise.resolve(null);
    return autoUpdater.checkForUpdates().catch((error) => {
      send('error', { message: (error && error.message) || String(error) });
      return null;
    });
  };

  // проверка при старте и далее по расписанию
  setTimeout(check, 3000);
  const timer = setInterval(check, CHECK_INTERVAL_MS);

  win.once('closed', () => clearInterval(timer));

  return { check, stop: () => clearInterval(timer) };
};

module.exports = { registerUpdater, CHECK_INTERVAL_MS };
