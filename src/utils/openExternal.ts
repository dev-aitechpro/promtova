// Открытие внешней ссылки: в Electron — через мост (shell.openExternal),
// в веб-режиме/тестах — через window.open. Позволяет не «уводить» окно приложения.

export const openExternal = (url: string): void => {
  const app = window.promtova?.app;
  if (app && app.openExternal) {
    void app.openExternal(url);
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
};
