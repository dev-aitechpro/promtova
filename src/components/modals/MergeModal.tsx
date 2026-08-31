// Диалог объединения баз при импорте (§5.1): разрешение конфликтов по каждому промпту.
import { useEffect, useMemo, useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { usePromtovaStore, useUIStore } from '../../store/usePromtovaStore';
import { conflictKey, detectConflicts, type MergeConflict } from '../../utils/importExport';
import type { MergeAction } from '../../shared/types';
import { AlertTriangle, ArrowRight } from 'lucide-react';

const ACTIONS: { value: MergeAction; label: string }[] = [
  { value: 'skip', label: 'Пропустить' },
  { value: 'rename', label: 'Переименовать' },
  { value: 'overwrite', label: 'Заменить' },
  { value: 'duplicate', label: 'Дублировать' },
];

const MergeModal = () => {
  const { mergeImport, closeMerge, pushToast } = useUIStore();
  const { prompts, applyImport } = usePromtovaStore();
  const [conflicts, setConflicts] = useState<MergeConflict[]>([]);

  useEffect(() => {
    if (!mergeImport) return;
    setConflicts(detectConflicts(mergeImport.prompts, usePromtovaStore.getState().prompts));
  }, [mergeImport]);

  const conflictKeys = useMemo(() => new Set(conflicts.map((c) => c.key)), [conflicts]);

  const newOnly = useMemo(() => {
    if (!mergeImport) return [];
    return mergeImport.prompts.filter((p) => !conflictKeys.has(conflictKey(p)));
  }, [mergeImport, conflictKeys]);

  if (!mergeImport) return null;

  const setAction = (key: string, action: MergeAction) =>
    setConflicts((cs) => cs.map((c) => (c.key === key ? { ...c, action } : c)));
  const setAll = (action: MergeAction) =>
    setConflicts((cs) => cs.map((c) => ({ ...c, action })));

  const apply = () => {
    const result = applyImport(mergeImport.prompts, conflicts, mergeImport.folders);
    const parts = [`Импортировано: ${result.imported}`];
    if (result.replaced) parts.push(`заменено: ${result.replaced}`);
    if (result.skipped) parts.push(`пропущено: ${result.skipped}`);
    if (result.foldersCreated) parts.push(`создано папок: ${result.foldersCreated}`);
    pushToast({ type: 'success', message: parts.join(' · ') });
    closeMerge();
  };

  return (
    <Modal
      open={!!mergeImport}
      onClose={closeMerge}
      title="Объединение баз"
      width="620px"
      footer={
        <>
          <Button variant="ghost" onClick={closeMerge}>Отмена</Button>
          <Button variant="primary" onClick={apply}>Применить</Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Сводка */}
        <div
          className="flex items-center gap-4 rounded-lg border px-3 py-2.5"
          style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-subtle)' }}
        >
          <div>
            <div className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              {mergeImport.prompts.length}
            </div>
            <div className="text-[10.5px]" style={{ color: 'var(--text-muted)' }}>в файле</div>
          </div>
          <div>
            <div className="text-[15px] font-semibold" style={{ color: 'var(--status-warning)' }}>
              {conflicts.length}
            </div>
            <div className="text-[10.5px]" style={{ color: 'var(--text-muted)' }}>совпадений</div>
          </div>
          <div>
            <div className="text-[15px] font-semibold" style={{ color: 'var(--status-success)' }}>
              {newOnly.length}
            </div>
            <div className="text-[10.5px]" style={{ color: 'var(--text-muted)' }}>новых</div>
          </div>
          {mergeImport.folders.length > 0 && (
            <div className="ml-auto text-[11px]" style={{ color: 'var(--text-muted)' }}>
              папок в файле: {mergeImport.folders.length}
            </div>
          )}
        </div>

        {mergeImport.errors.length > 0 && (
          <div
            className="flex items-start gap-2 rounded-md border px-3 py-2"
            style={{ background: 'rgba(217,164,65,0.08)', borderColor: 'rgba(217,164,65,0.35)' }}
          >
            <AlertTriangle size={13} style={{ color: 'var(--status-warning)', marginTop: 2 }} />
            <div className="text-[11.5px]" style={{ color: 'var(--text-secondary)' }}>
              {mergeImport.errors.slice(0, 3).map((e, i) => (
                <div key={i}>{e}</div>
              ))}
              {mergeImport.errors.length > 3 && (
                <div style={{ color: 'var(--text-muted)' }}>
                  …и ещё {mergeImport.errors.length - 3}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Конфликты */}
        {conflicts.length > 0 && (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span
                className="text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: 'var(--text-secondary)' }}
              >
                Совпадения (заголовок + папка)
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setAll('skip')}
                  className="rounded px-2 py-0.5 text-[10.5px] transition-colors"
                  style={{ color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}
                >
                  Все пропустить
                </button>
                <button
                  onClick={() => setAll('overwrite')}
                  className="rounded px-2 py-0.5 text-[10.5px] transition-colors"
                  style={{ color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}
                >
                  Все заменить
                </button>
                <button
                  onClick={() => conflicts[0] && setAll(conflicts[0].action)}
                  className="rounded px-2 py-0.5 text-[10.5px] transition-colors"
                  style={{ color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}
                  title="Применить действие первой строки ко всем"
                >
                  Применить ко всем
                </button>
              </div>
            </div>

            <div className="max-h-[240px] space-y-1.5 overflow-y-auto pr-1">
              {conflicts.map((c) => (
                <div
                  key={c.key}
                  className="rounded-md border px-2.5 py-2"
                  style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-subtle)' }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="min-w-0 flex-1 truncate text-[12.5px] font-medium"
                      style={{ color: 'var(--text-primary)' }}
                      title={c.incoming.title}
                    >
                      {c.incoming.title}
                    </span>
                    <span className="shrink-0 text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                      {c.incoming.folder}
                    </span>
                    <select
                      value={c.action}
                      onChange={(e) => setAction(c.key, e.target.value as MergeAction)}
                      aria-label={`Действие для «${c.incoming.title}»`}
                      className="shrink-0 rounded border px-1.5 py-0.5 text-[11px] outline-none"
                      style={{
                        background: 'var(--bg-elevated)',
                        color: 'var(--text-primary)',
                        borderColor: 'var(--border-primary)',
                      }}
                    >
                      {ACTIONS.map((a) => (
                        <option key={a.value} value={a.value}>{a.label}</option>
                      ))}
                    </select>
                  </div>
                  <div
                    className="mt-1 flex items-center gap-1.5 text-[10.5px]"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <ArrowRight size={10} />
                    {c.action === 'overwrite'
                      ? 'заменит существующий промпт (id и счётчик сохранятся)'
                      : c.action === 'rename'
                        ? 'будет добавлен как «(копия N)»'
                        : c.action === 'duplicate'
                          ? 'будет добавлен как новый промпт'
                          : 'существующий промпт останется без изменений'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {newOnly.length > 0 && (
          <p className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
            Остальные {newOnly.length} промптов не конфликтуют и будут добавлены как новые.
          </p>
        )}

        <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
          Текущая база: {prompts.length} промптов.
        </p>
      </div>
    </Modal>
  );
};

export default MergeModal;
