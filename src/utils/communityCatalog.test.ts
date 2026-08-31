// Тесты загрузки каталога промтов из репозитория (§ обновление базы).
import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchCommunityCatalog, COMMUNITY_CATALOG_URL } from './communityCatalog';
import type { PromtovaApi } from '../types/electron';

type Bridge = { promtova?: PromtovaApi };

const clearBridge = () => {
  delete (window as unknown as Bridge).promtova;
};

afterEach(() => {
  clearBridge();
  vi.restoreAllMocks();
});

describe('fetchCommunityCatalog — мост Electron (main-процесс)', () => {
  it('возвращает текст каталога, если мост ответил ok', async () => {
    const fetchFn = vi.fn(async () => ({ ok: true, text: '{"version":"1.0","prompts":[]}' }));
    (window as unknown as Bridge).promtova = {
      catalog: { fetch: fetchFn as never },
    } as unknown as PromtovaApi;
    expect(await fetchCommunityCatalog()).toBe('{"version":"1.0","prompts":[]}');
  });

  it('возвращает null, если мост ответил ошибкой', async () => {
    (window as unknown as Bridge).promtova = {
      catalog: { fetch: (async () => ({ ok: false, error: 'HTTP 404' })) as never },
    } as unknown as PromtovaApi;
    expect(await fetchCommunityCatalog()).toBeNull();
  });
});

describe('fetchCommunityCatalog — веб-фолбэк (fetch)', () => {
  it('без моста делает обычный fetch к raw-URL и возвращает текст', async () => {
    const res = { ok: true, text: async () => 'payload' };
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(res as Response);
    expect(await fetchCommunityCatalog()).toBe('payload');
    expect(spy).toHaveBeenCalledWith(COMMUNITY_CATALOG_URL);
  });

  it('при сетевой ошибке возвращает null, не падает', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    expect(await fetchCommunityCatalog()).toBeNull();
  });
});
