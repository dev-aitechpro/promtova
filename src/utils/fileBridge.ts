// Работа с файлами: нативные диалоги в Electron, download/<input> в веб-режиме (§6).
// Формат данных и функции buildExportData / parseImportFile остаются прежними.
import { downloadFile } from './promtova';
import type { NativeFileFilter } from '../types/electron';

export const isElectron = (): boolean =>
  typeof window !== 'undefined' && !!window.promtova?.file;

export const EXPORT_FILTERS: NativeFileFilter[] = [
  { name: 'База Промтовой (.prmt)', extensions: ['prmt'] },
  { name: 'JSON', extensions: ['json'] },
];

export const IMPORT_FILTERS: NativeFileFilter[] = [
  { name: 'База Промтовой', extensions: ['prmt', 'json'] },
  { name: 'Markdown / текст', extensions: ['md', 'txt'] },
];

/** Сохраняет текст в файл. В Electron — через системный диалог, иначе — download. */
export const saveTextFile = async (
  filename: string,
  content: string,
  filters: NativeFileFilter[] = EXPORT_FILTERS,
): Promise<boolean> => {
  const file = typeof window !== 'undefined' ? window.promtova?.file : undefined;
  if (!file) {
    downloadFile(filename, content);
    return true;
  }
  const target = await file.showSaveDialog({
    title: 'Сохранить файл',
    defaultPath: filename,
    filters,
  });
  if (!target) return false; // пользователь отменил
  await file.writeText(target, content);
  return true;
};

export interface PickedFile {
  name: string;
  text: string;
}

/**
 * Читает текстовый файл. В Electron — через диалог открытия.
 * В веб-режиме возвращает null: вызывающий код открывает скрытый <input type="file">.
 */
export const openTextFile = async (
  filters: NativeFileFilter[] = IMPORT_FILTERS,
): Promise<PickedFile | null> => {
  const file = typeof window !== 'undefined' ? window.promtova?.file : undefined;
  if (!file) return null;

  const paths = await file.showOpenDialog({
    title: 'Выбрать файл',
    filters,
    properties: ['openFile'],
  });
  if (!paths || paths.length === 0) return null;

  const filePath = paths[0];
  const text = await file.readText(filePath);
  const name = filePath.split(/[\\/]/).pop() || filePath;
  return { name, text };
};
