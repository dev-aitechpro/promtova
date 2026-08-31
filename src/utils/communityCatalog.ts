// Загрузка каталога промтов из репозитория.
// В Electron — через мост (main-процесс обходит renderer-CSP 'connect-src self').
// В веб-режиме/тестах — обычный fetch к raw-URL, на ошибку — прозрачный null.
import type { CatalogFetchResult } from '../types/electron';

export const COMMUNITY_CATALOG_URL =
  'https://raw.githubusercontent.com/dev-aitechpro/promtova/main/community-prompts.json';

/** Скачивает каталог и возвращает его текст или null при любой ошибке. */
export const fetchCommunityCatalog = async (): Promise<string | null> => {
  const api = typeof window !== 'undefined' ? window.promtova?.catalog : undefined;
  if (api && api.fetch) {
    const result: CatalogFetchResult = await api.fetch();
    return result.ok ? result.text : null;
  }
  try {
    const res = await fetch(COMMUNITY_CATALOG_URL);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
};
