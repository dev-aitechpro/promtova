// @ts-nocheck
// Нативные диалоги и чтение/запись файлов импорта-экспорта (§6).
// Выполняется только в main-процессе; renderer не получает прямого доступа к fs.

const fs = require('fs/promises');

const registerFileHandlers = (ipcMain, dialog) => {
  ipcMain.handle('file:openDialog', async (_event, opts = {}) => {
    const result = await dialog.showOpenDialog({
      title: opts.title,
      filters: opts.filters,
      defaultPath: opts.defaultPath,
      properties: opts.properties && opts.properties.length ? opts.properties : ['openFile'],
    });
    return { canceled: !!result.canceled, filePaths: result.filePaths || [] };
  });

  ipcMain.handle('file:saveDialog', async (_event, opts = {}) => {
    const result = await dialog.showSaveDialog({
      title: opts.title,
      filters: opts.filters,
      defaultPath: opts.defaultPath,
    });
    return { canceled: !!result.canceled, filePath: result.filePath || null };
  });

  ipcMain.handle('file:readText', async (_event, filePath) => {
    return fs.readFile(filePath, 'utf8');
  });

  ipcMain.handle('file:writeText', async (_event, filePath, content) => {
    await fs.writeFile(filePath, content, 'utf8');
  });
};

module.exports = { registerFileHandlers };
