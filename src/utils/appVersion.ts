// Единый источник версии для UI. В Electron берём из main-процесса
// (app.getVersion() → package.json), в вебе — фолбэк на константу.
export const FALLBACK_VERSION = '2.0.0';

export const getAppVersion = (): string => {
  if (typeof window !== 'undefined') {
    const v = (window as unknown as { promtova?: { app?: { version?: string | null } } }).promtova?.app?.version;
    if (typeof v === 'string' && v) return v;
  }
  return FALLBACK_VERSION;
};
