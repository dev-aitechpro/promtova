import { useEffect, useMemo, useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { usePromtovaStore, useUIStore } from '../../store/usePromtovaStore';
import { conflictKey, detectConflicts, type MergeConflict } from '../../utils/importExport';
import type { MergeAction } from '../../shared/types';
import { AlertTriangle } from 'lucide-react';

const ACTIONS: { value: MergeAction; label: string }[] = [
  { value: 'skip', label: 'Пропустить' },
  { value: 'rename', label: 'Переименовать' },
  { value: 'overwrite', label: 'Заменить' },
  { value: 'duplicate', label: 'Дублировать' },
];

export default function MergeModal() {
  const { mergeImport, closeMerge, pushToast } = useUIStore();
  const store = usePromtovaStore();
  const [conflicts, setConflicts] = useState<MergeConflict[]>([]);

  useEffect(() => {
    if (!mergeImport) return;
    setConflicts(detectConflicts(mergeImport.prompts, store.prompts));
  }, [mergeImport, store.prompts]);

  const conflictKeys = useMemo(() => new Set(conflicts.map((item) => item.key)), [conflicts]);
  const newOnly = useMemo(() => mergeImport?.prompts.filter((prompt) => !conflictKeys.has(conflictKey(prompt))) ?? [], [mergeImport, conflictKeys]);

  if (!mergeImport) return null;

  const apply = () => {
    const result = store.applyImport(mergeImport.prompts, conflicts, mergeImport.folders, mergeImport);
    const parts = [`Импортировано: ${result.imported}`];
    if (result.replaced) parts.push(`заменено: ${result.replaced}`);
    if (result.skipped) parts.push(`пропущено: ${result.skipped}`);
    if (result.foldersCreated) parts.push(`создано папок: ${result.foldersCreated}`);
    pushToast({ type: 'success', message: parts.join(' · ') });
    closeMerge();
  };

  return (
    <Modal open title="Объединение баз" onClose={closeMerge} width="620px" footer={<><Button variant="ghost" onClick={closeMerge}>Отмена</Button><Button variant="primary" onClick={apply}>Применить</Button></>}>
      <div className="space-y-4">
        <div className="flex items-center gap-5 rounded-lg border p-3" style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-subtle)' }}>
          <Stat value={mergeImport.prompts.length} label="промптов" />
          <Stat value={conflicts.length} label="конфликтов" />
          <Stat value={newOnly.length} label="новых" />
          <div className="ml-auto text-[11px]" style={{ color: 'var(--text-muted)' }}>
            {mergeImport.folders.length} папок · {mergeImport.versions.length} версий · {mergeImport.templates.length} шаблонов · {mergeImport.blocks.length} блоков · {mergeImport.modelProfiles.length} моделей · {mergeImport.runs.length} запусков
          </div>
        </div>

        {mergeImport.errors.length > 0 && (
          <div className="flex items-start gap-2 rounded-md border px-3 py-2 text-[11.5px]" style={{ background: 'rgba(217,164,65,0.08)', borderColor: 'rgba(217,164,65,0.35)', color: 'var(--text-secondary)' }}>
            <AlertTriangle size={13} style={{ color: 'var(--status-warning)', marginTop: 2 }} />
            <div>{mergeImport.errors.slice(0, 4).map((error) => <div key={error}>{error}</div>)}</div>
          </div>
        )}

        {conflicts.length > 0 && <div className="space-y-2">
          <div className="flex items-center justify-between"><span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Конфликты по заголовку и папке</span><div className="flex gap-1"><button className="rounded border px-2 py-1 text-[10px]" onClick={() => setConflicts((items) => items.map((item) => ({ ...item, action: 'skip' })))}>Все пропустить</button><button className="rounded border px-2 py-1 text-[10px]" onClick={() => setConflicts((items) => items.map((item) => ({ ...item, action: 'overwrite' })))}>Все заменить</button></div></div>
          <div className="max-h-64 space-y-1.5 overflow-y-auto">
            {conflicts.map((item) => <div key={item.key} className="flex items-center gap-2 rounded border p-2" style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-subtle)' }}><span className="min-w-0 flex-1 truncate text-[12px]" style={{ color: 'var(--text-primary)' }}>{item.incoming.title}</span><span className="shrink-0 text-[10px]" style={{ color: 'var(--text-muted)' }}>{item.incoming.folder}</span><select value={item.action} onChange={(event) => setConflicts((items) => items.map((candidate) => candidate.key === item.key ? { ...candidate, action: event.target.value as MergeAction } : candidate))} className="rounded border px-1.5 py-1 text-[10px]" style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', borderColor: 'var(--border-primary)' }}>{ACTIONS.map((action) => <option key={action.value} value={action.value}>{action.label}</option>)}</select></div>)}
          </div>
        </div>}
        {newOnly.length > 0 && <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{newOnly.length} промптов будут добавлены без конфликтов. Все версии, шаблоны, блоки, модели и запуски из файла 2.0 также будут импортированы.</p>}
      </div>
    </Modal>
  );
}

const Stat = ({ value, label }: { value: number; label: string }) => <div><div className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>{value}</div><div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{label}</div></div>;
