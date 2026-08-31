// @ts-nocheck
// Главный процесс Electron (§3.1, §3.2, §3.3).
// Загружает single-file сборку renderer (dist/index.html) и держит весь доступ к диску.

const path = require('path');
const { app, BrowserWindow, dialog, session, ipcMain, shell } = require('electron');

const { createStore, registerStoreHandlers } = require('./storeService.cjs');
const { registerFileHandlers } = require('./fileService.cjs');
const { registerUpdater } = require('./updater.cjs');

const DEV_SERVER_URL = 'http://localhost:5173';

// Имя приложения влияет на каталог userData: %APPDATA%\Promtova
app.setName('Promtova');

/**
 * Единственный источник внешних подключений — шрифты Google.
 * 'unsafe-inline' обязателен: vite-plugin-singlefile инлайнит скрипт и стили
 * прямо в index.html, поэтому без него приложение не запустится.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data:",
  "connect-src 'self'",
].join('; ');

// --- single instance (§3.2) ---
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
}

let mainWindow = null;

const buildInfo = () => ({
  version: app.getVersion(),
  dataPath: path.join(app.getPath('userData'), 'stores.json'),
});

const loadApp = async (win) => {
  if (!app.isPackaged) {
    try {
      await win.loadURL(DEV_SERVER_URL);
      return;
    } catch (error) {
      console.warn('[main] dev-сервер недоступен, грузим собранный index.html:', error.message);
    }
  }
  await win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
};

const createWindow = async () => {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 940,
    minHeight: 640,
    title: 'Промтовая',
    autoHideMenuBar: true,
    backgroundColor: '#0B0D10',
    show: false,
    webPreferences: {
      contextIsolation: true, // обязательно (§3.3)
      sandbox: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());

  await loadApp(mainWindow);

  if (!app.isPackaged) {
    // в dev оставляем возможность открыть инструменты разработчика
    mainWindow.webContents.on('before-input-event', (_event, input) => {
      if (input.type === 'keyDown' && input.key === 'F12') {
        mainWindow.webContents.toggleDevTools();
      }
    });
  }
};

app.on('second-instance', () => {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
});

app.whenReady().then(async () => {
  // --- CSP (§3.3) ---
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [CSP],
      },
    });
  });

  // --- IPC ---
  const store = createStore();
  registerStoreHandlers(ipcMain, store);
  registerFileHandlers(ipcMain, dialog);

  ipcMain.on('app:getInfoSync', (event) => {
    event.returnValue = buildInfo();
  });
  ipcMain.handle('app:getInfo', () => buildInfo());

  // Открытие внешних ссылок в системном браузере, а не внутри окна приложения.
  ipcMain.handle('app:openExternal', (_event, url) => {
    if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) return;
    return shell.openExternal(url);
  });

  await createWindow();
  if (mainWindow) registerUpdater(mainWindow, { ipcMain, app });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
