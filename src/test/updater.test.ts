// Тесты автообновления (§3.4, §5.6 ТЗ). Проверяем, что события electron-updater
// транслируются в renderer каналом 'updater:event'. autoUpdater подаётся как
// инъекция (третий аргумент registerUpdater), чтобы не тянуть реальный electron-updater.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerUpdater, CHECK_INTERVAL_MS } from '../../electron/updater.cjs';

const sent: Array<{ channel: string; data: unknown }> = [];
const handlers: Record<string, (info: unknown) => void> = {};

const makeAutoUpdater = () => ({
  autoDownload: false,
  autoInstallOnAppQuit: false,
  on: (event: string, cb: (info: unknown) => void) => {
    handlers[event] = cb;
  },
  checkForUpdates: vi.fn(async () => ({})),
  quitAndInstall: vi.fn(),
});

describe('updater — IPC-события автообновления (§3.4, §5.6)', () => {
  beforeEach(() => {
    sent.length = 0;
    for (const k of Object.keys(handlers)) delete handlers[k];
  });

  const makeWin = () => ({
    isDestroyed: () => false,
    webContents: {
      send: (channel: string, data: unknown) => sent.push({ channel, data }),
      isDestroyed: () => false,
    },
    once: () => undefined,
  });

  it('CHECK_INTERVAL_MS = 4 часа', () => {
    expect(CHECK_INTERVAL_MS).toBe(4 * 60 * 60 * 1000);
  });

  it('update-available → updater:event', () => {
    const win = makeWin();
    const autoUpdater = makeAutoUpdater();
    const ctrl = registerUpdater(win, { ipcMain: { handle: vi.fn() }, app: { isPackaged: true } }, autoUpdater);
    handlers['update-available']({ version: '1.3.0' });
    expect(sent).toContainEqual({
      channel: 'updater:event',
      data: { event: 'update-available', payload: { version: '1.3.0' } },
    });
    ctrl.stop();
  });

  it('update-downloaded → updater:event с версией', () => {
    const win = makeWin();
    const autoUpdater = makeAutoUpdater();
    const ctrl = registerUpdater(win, { ipcMain: { handle: vi.fn() }, app: { isPackaged: true } }, autoUpdater);
    handlers['update-downloaded']({ version: '1.3.0' });
    expect(sent).toContainEqual({
      channel: 'updater:event',
      data: { event: 'update-downloaded', payload: { version: '1.3.0' } },
    });
    ctrl.stop();
  });

  it('error → updater:event с сообщением', () => {
    const win = makeWin();
    const autoUpdater = makeAutoUpdater();
    const ctrl = registerUpdater(win, { ipcMain: { handle: vi.fn() }, app: { isPackaged: true } }, autoUpdater);
    handlers['error'](new Error('no network'));
    expect(sent).toContainEqual({
      channel: 'updater:event',
      data: { event: 'error', payload: { message: 'no network' } },
    });
    ctrl.stop();
  });

  it('download-progress → updater:event с процентом', () => {
    const win = makeWin();
    const autoUpdater = makeAutoUpdater();
    const ctrl = registerUpdater(win, { ipcMain: { handle: vi.fn() }, app: { isPackaged: true } }, autoUpdater);
    handlers['download-progress']({ percent: 55 });
    expect(sent).toContainEqual({
      channel: 'updater:event',
      data: { event: 'download-progress', payload: { percent: 55 } },
    });
    ctrl.stop();
  });

  it('checking-for-update → updater:event', () => {
    const win = makeWin();
    const autoUpdater = makeAutoUpdater();
    const ctrl = registerUpdater(win, { ipcMain: { handle: vi.fn() }, app: { isPackaged: true } }, autoUpdater);
    handlers['checking-for-update'](undefined);
    expect(sent).toContainEqual({ channel: 'updater:event', data: { event: 'checking' } });
    ctrl.stop();
  });

  it('при isPackaged=false проверка не запускается', () => {
    const win = makeWin();
    const autoUpdater = makeAutoUpdater();
    const ctrl = registerUpdater(win, { ipcMain: { handle: vi.fn() }, app: { isPackaged: false } }, autoUpdater);
    expect(autoUpdater.checkForUpdates).not.toHaveBeenCalled();
    ctrl.stop();
  });

  it('installUpdate через ipcMain.handle вызывает quitAndInstall', async () => {
    const ipcMain = { handle: vi.fn() };
    const win = makeWin();
    const autoUpdater = makeAutoUpdater();
    const ctrl = registerUpdater(win, { ipcMain, app: { isPackaged: true } }, autoUpdater);
    const installHandler = ipcMain.handle.mock.calls.find((c) => c[0] === 'updater:install')?.[1];
    expect(typeof installHandler).toBe('function');
    await (installHandler as () => Promise<void>)();
    expect(autoUpdater.quitAndInstall).toHaveBeenCalled();
    ctrl.stop();
  });
});
