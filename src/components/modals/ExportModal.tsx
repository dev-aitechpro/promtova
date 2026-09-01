import { useState, useMemo } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { usePromtovaStore, useUIStore } from '../../store/usePromtovaStore';
import { buildExportData } from '../../utils/importExport';
import { saveTextFile } from '../../utils/fileBridge';
import { folderPath, getDescendantIds, getSiblings } from '../../utils/folders';
import type { ExportData, Folder, Prompt } from '../../shared/types';
import { Download, Check } from 'lucide-react';

const ExportModal = () => {
  const { exportOpen, closeExport, pushToast } = useUIStore();
  const { prompts, folders } = usePromtovaStore();
  const [scope, setScope] = useState<'all' | 'selected' | 'one'>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
  const selectedPrompt = usePromtovaStore((s) => s.prompts.find((p) => p.id === s.selectedPromptId));

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleExcluded = (id: string) => {
    setExcludedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const { foldersOut, promptsOut, filename } = useMemo(() => {
    if (scope === 'one') {
      const data = selectedPrompt ? [selectedPrompt] : [];
      return { foldersOut: [] as Folder[], promptsOut: data, filename: `${selectedPrompt?.title || 'prompt'}.prmt` };
    }
    if (scope === 'selected') {
      if (selectedIds.size === 0) return { foldersOut: [] as Folder[], promptsOut: [] as Prompt[], filename: `promtova-selected-${new Date().toISOString().slice(0, 10)}.prmt` };
      const expanded = new Set<string>();
      selectedIds.forEach((id) => {
        expanded.add(id);
        getDescendantIds(folders, id).forEach((d) => expanded.add(d));
      });
      const foldersOut = folders.filter((f) => expanded.has(f.id));
      const names = new Set(foldersOut.map((f) => f.name));
      const promptsOut = prompts.filter((p) => names.has(p.folder));
      return { foldersOut, promptsOut, filename: `promtova-selected-${new Date().toISOString().slice(0, 10)}.prmt` };
    }
    // scope === 'all' with exclusions
    const excludedExpanded = new Set<string>();
    excludedIds.forEach((id) => {
      excludedExpanded.add(id);
      getDescendantIds(folders, id).forEach((d) => excludedExpanded.add(d));
    });
    const foldersOut = folders.filter((f) => !excludedExpanded.has(f.id));
    const excludedNames = new Set(folders.filter((f) => excludedExpanded.has(f.id)).map((f) => f.name));
    const promptsOut = prompts.filter((p) => !excludedNames.has(p.folder));
    return { foldersOut, promptsOut, filename: `promtova-all-${new Date().toISOString().slice(0, 10)}.prmt` };
  }, [scope, selectedIds, excludedIds, folders, prompts, selectedPrompt]);

  const handleExport = async () => {
    if (scope === 'selected' && selectedIds.size === 0) {
      pushToast({ type: 'warning', message: 'Выберите хотя бы одну папку' });
      return;
    }
    if (promptsOut.length === 0 && foldersOut.length === 0) {
      pushToast({ type: 'warning', message: 'Нечего экспортировать' });
      return;
    }
    const payload: ExportData = buildExportData(promptsOut, foldersOut);
    const saved = await saveTextFile(filename, JSON.stringify(payload, null, 2));
    if (!saved) return;
    pushToast({
      type: 'success',
      message: `Экспортировано: ${promptsOut.length} промптов${foldersOut.length ? `, папок: ${foldersOut.length}` : ''}`,
    });
    closeExport();
  };

  const FolderTreeCheck = ({ parent, checkedSet, onToggle, label }: { parent: string | null; checkedSet: Set<string>; onToggle: (id: string) => void; label: string }) => {
    const sibs = getSiblings(folders, parent);
    if (sibs.length === 0) return null;
    return (
      <div className="space-y-1">
        {sibs.map((f) => {
          const checked = checkedSet.has(f.id);
          const children = getSiblings(folders, f.id);
          return (
            <div key={f.id}>
              <label
                className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-[11.5px] hover:bg-[var(--bg-hover)]"
                style={{ marginLeft: parent ? 12 : 0 }}
              >
                <span
                  onClick={(e) => {
                    e.preventDefault();
                    onToggle(f.id);
                  }}
                  className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border"
                  style={{
                    background: checked ? 'var(--accent-primary)' : 'transparent',
                    borderColor: checked ? 'var(--accent-primary)' : 'var(--border-primary)',
                  }}
                >
                  {checked && <Check size={10} color="#fff" strokeWidth={3} />}
                </span>
                <input type="checkbox" checked={checked} onChange={() => onToggle(f.id)} className="hidden" />
                <span className="truncate" style={{ color: 'var(--text-primary)' }}>{f.name}</span>
                <span className="font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>{folderPath(folders, f.id)}</span>
                <span className="ml-auto font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  {prompts.filter((p) => {
                    const ids = new Set([f.id, ...getDescendantIds(folders, f.id)]);
                    const names = new Set(folders.filter((x) => ids.has(x.id)).map((x) => x.name));
                    return names.has(p.folder);
                  }).length}
                </span>
              </label>
              {children.length > 0 && (
                <FolderTreeCheck parent={f.id} checkedSet={checkedSet} onToggle={onToggle} label={label} />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Modal
      open={exportOpen}
      onClose={closeExport}
      title="Экспорт промптов"
      width="560px"
      footer={
        <>
          <Button variant="ghost" onClick={closeExport}>Отмена</Button>
          <Button variant="primary" onClick={handleExport}><Download size={13} /> Скачать .prmt</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="mb-2 text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>Что экспортировать?</p>
          <div className="space-y-1.5">
            <RadioRow
              active={scope === 'all'}
              onClick={() => setScope('all')}
              title="Все папки"
              desc={`${promptsOut.length} промптов, ${foldersOut.length} папок${excludedIds.size ? ` · исключено папок: ${excludedIds.size}` : ''}`}
            />
            {scope === 'all' && folders.length > 0 && (
              <div className="ml-6 rounded-md border p-2" style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-subtle)' }}>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>Исключить папки (например, premium)</span>
                  <button
                    onClick={() => setExcludedIds(new Set())}
                    className="text-[10px] underline"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Сбросить
                  </button>
                </div>
                <div className="max-h-40 overflow-y-auto pr-1">
                  <FolderTreeCheck parent={null} checkedSet={excludedIds} onToggle={toggleExcluded} label="exclude" />
                </div>
                <p className="mt-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>Отмеченные папки и их подпапки не попадут в файл.</p>
              </div>
            )}
            <RadioRow
              active={scope === 'selected'}
              onClick={() => setScope('selected')}
              title="Выбранные папки"
              desc={selectedIds.size === 0 ? 'выберите папки ниже' : `${promptsOut.length} промптов, ${foldersOut.length} папок`}
            />
            {scope === 'selected' && (
              <div className="ml-6 rounded-md border p-2" style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-subtle)' }}>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>Отметьте папки для экспорта</span>
                  <span className="flex gap-1">
                    <button onClick={() => setSelectedIds(new Set(folders.map((f) => f.id)))} className="text-[10px] underline" style={{ color: 'var(--text-muted)' }}>Все</button>
                    <button onClick={() => setSelectedIds(new Set())} className="text-[10px] underline" style={{ color: 'var(--text-muted)' }}>Сбросить</button>
                  </span>
                </div>
                <div className="max-h-48 overflow-y-auto pr-1">
                  <FolderTreeCheck parent={null} checkedSet={selectedIds} onToggle={toggleSelected} label="selected" />
                </div>
                <p className="mt-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>Выбранные папки и их подпапки попадут в файл вместе с промптами.</p>
              </div>
            )}
            <RadioRow
              active={scope === 'one'}
              onClick={() => setScope('one')}
              title="Текущий промпт"
              desc={selectedPrompt ? `"${selectedPrompt.title}"` : 'ничего не выбрано'}
              disabled={!selectedPrompt}
            />
          </div>
        </div>

        <div
          className="rounded-md border p-3 text-[11px]"
          style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
        >
          <strong style={{ color: 'var(--text-secondary)' }}>Формат .prmt</strong> — собственный JSON-формат
          Промтовой. Содержит промпты, переменные, теги и структуру папок (иерархию, иконки, цвета).
          При импорте предлагается разрешить совпадения. Исключённые папки (premium) не попадут в файл.
        </div>
      </div>
    </Modal>
  );
};

const RadioRow = ({
  active,
  onClick,
  title,
  desc,
  disabled,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  desc: string;
  disabled?: boolean;
  children?: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="flex w-full items-center gap-2.5 rounded-md border px-3 py-2.5 text-left transition-colors"
    style={{
      background: active ? 'var(--accent-subtle)' : 'var(--bg-panel)',
      borderColor: active ? 'var(--accent-primary)' : 'var(--border-subtle)',
      opacity: disabled ? 0.4 : 1,
    }}
  >
    <div
      className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2"
      style={{ borderColor: active ? 'var(--accent-primary)' : 'var(--border-primary)' }}
    >
      {active && <div className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--accent-primary)' }} />}
    </div>
    <div className="flex-1">
      <p className="text-[12.5px] font-medium" style={{ color: 'var(--text-primary)' }}>{title}</p>
      <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{desc}</p>
    </div>
    {children}
  </button>
);

export default ExportModal;
