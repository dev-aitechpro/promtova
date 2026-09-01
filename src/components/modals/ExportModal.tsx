import { useMemo, useState } from 'react';
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
  const store = usePromtovaStore();
  const { prompts, folders } = store;
  const [scope, setScope] = useState<'all' | 'selected' | 'one'>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());

  const selection = useMemo(() => {
    const allData = store.exportData();
    if (scope === 'one') {
      const prompt = prompts.find((p) => p.id === store.selectedPromptId);
      const ids = new Set(prompt ? [prompt.id] : []);
      return { ...allData, prompts: prompt ? [prompt] : [], folders: [] as Folder[], allowedPromptIds: ids, filename: `${prompt?.title || 'prompt'}.prmt` };
    }

    const excluded = new Set<string>();
    excludedIds.forEach((id) => {
      excluded.add(id);
      getDescendantIds(folders, id).forEach((child) => excluded.add(child));
    });

    const allowedFolders = scope === 'selected'
      ? (() => {
          const ids = new Set<string>();
          selectedIds.forEach((id) => {
            ids.add(id);
            getDescendantIds(folders, id).forEach((child) => ids.add(child));
          });
          return folders.filter((folder) => ids.has(folder.id));
        })()
      : folders.filter((folder) => !excluded.has(folder.id));

    const allowedFolderIds = new Set(allowedFolders.map((folder) => folder.id));
    const allowedPromptIds = new Set(
      prompts.filter((prompt) => prompt.folderId ? allowedFolderIds.has(prompt.folderId) : allowedFolders.some((folder) => folder.name === prompt.folder)).map((prompt) => prompt.id),
    );
    const scopedPrompts = prompts.filter((prompt) => allowedPromptIds.has(prompt.id));

    const versions = allData.versions.filter((version) => allowedPromptIds.has(version.promptId));
    const runs = allData.runs.filter((run) => allowedPromptIds.has(run.promptId));
    const referencedTemplateIds = new Set(scopedPrompts.map((prompt) => prompt.templateId).filter((id): id is string => Boolean(id)));
    const referencedBlockIds = new Set(scopedPrompts.flatMap((prompt) => (prompt.blockRefs ?? []).map((ref) => ref.blockId)));
    const modelIds = new Set(runs.map((run) => run.modelProfileId).filter((id): id is string => Boolean(id)));

    return {
      ...allData,
      prompts: scopedPrompts,
      folders: allowedFolders,
      versions,
      runs,
      templates: scope === 'all' ? allData.templates : allData.templates.filter((template) => referencedTemplateIds.has(template.id)),
      blocks: scope === 'all' ? allData.blocks : allData.blocks.filter((block) => referencedBlockIds.has(block.id)),
      modelProfiles: scope === 'all' ? allData.modelProfiles : allData.modelProfiles.filter((profile) => modelIds.has(profile.id)),
      allowedPromptIds,
      filename: scope === 'selected'
        ? `promtova-selected-${new Date().toISOString().slice(0, 10)}.prmt`
        : `promtova-all-${new Date().toISOString().slice(0, 10)}.prmt`,
    };
  }, [store, scope, selectedIds, excludedIds, folders, prompts]);

  const toggle = (setValue: React.Dispatch<React.SetStateAction<Set<string>>>, id: string) => {
    setValue((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleExport = async () => {
    if (scope === 'selected' && selectedIds.size === 0) {
      pushToast({ type: 'warning', message: 'Выберите хотя бы одну папку' });
      return;
    }
    if (selection.prompts.length === 0 && selection.folders.length === 0) {
      pushToast({ type: 'warning', message: 'Нечего экспортировать' });
      return;
    }
    const { allowedPromptIds: _, filename, ...data } = selection;
    const payload: ExportData = buildExportData(data.prompts, data.folders, {
      versions: data.versions,
      templates: data.templates,
      blocks: data.blocks,
      modelProfiles: data.modelProfiles,
      runs: data.runs,
    });
    const saved = await saveTextFile(filename, JSON.stringify(payload, null, 2));
    if (!saved) return;
    pushToast({ type: 'success', message: `Экспортировано: ${data.prompts.length} промптов${data.folders.length ? `, папок: ${data.folders.length}` : ''}` });
    closeExport();
  };

  const FolderTree = ({ parent, active }: { parent: string | null; active: Set<string> }) => {
    const siblings = getSiblings(folders, parent);
    return (
      <div className="space-y-1">
        {siblings.map((folder) => {
          const checked = active.has(folder.id);
          return (
            <div key={folder.id}>
              <label className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-[11.5px] hover:bg-[var(--bg-hover)]">
                <span onClick={() => toggle(active === selectedIds ? setSelectedIds : setExcludedIds, folder.id)} className="flex h-3.5 w-3.5 items-center justify-center rounded border" style={{ background: checked ? 'var(--accent-primary)' : 'transparent', borderColor: checked ? 'var(--accent-primary)' : 'var(--border-primary)' }}>
                  {checked && <Check size={10} color="#fff" strokeWidth={3} />}
                </span>
                <span className="truncate" style={{ color: 'var(--text-primary)' }}>{folder.name}</span>
                <span className="font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>{folderPath(folders, folder.id)}</span>
              </label>
              {getSiblings(folders, folder.id).length > 0 && <FolderTree parent={folder.id} active={active} />}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Modal open={exportOpen} onClose={closeExport} title="Экспорт промптов" width="560px" footer={<><Button variant="ghost" onClick={closeExport}>Отмена</Button><Button variant="primary" onClick={handleExport}><Download size={13} /> Скачать .prmt</Button></>}>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <RadioRow active={scope === 'all'} onClick={() => setScope('all')} title="Все папки" desc={`${selection.prompts.length} промптов, ${selection.folders.length} папок`} />
          {scope === 'all' && folders.length > 0 && <div className="ml-6 rounded-md border p-2" style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-subtle)' }}><div className="mb-1.5 flex items-center justify-between"><span className="text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>Исключить папки</span><button onClick={() => setExcludedIds(new Set())} className="text-[10px] underline" style={{ color: 'var(--text-muted)' }}>Сбросить</button></div><FolderTree parent={null} active={excludedIds} /><p className="mt-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>Папка и её подпапки исключаются.</p></div>}
          <RadioRow active={scope === 'selected'} onClick={() => setScope('selected')} title="Выбранные папки" desc={selectedIds.size ? `${selection.prompts.length} промптов, ${selection.folders.length} папок` : 'выберите папки ниже'} />
          {scope === 'selected' && <div className="ml-6 rounded-md border p-2" style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-subtle)' }}><div className="mb-1.5 flex items-center justify-between"><span className="text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>Отметьте папки</span><span className="flex gap-2"><button onClick={() => setSelectedIds(new Set(folders.map((f) => f.id)))} className="text-[10px] underline" style={{ color: 'var(--text-muted)' }}>Все</button><button onClick={() => setSelectedIds(new Set())} className="text-[10px] underline" style={{ color: 'var(--text-muted)' }}>Сбросить</button></span></div><FolderTree parent={null} active={selectedIds} /></div>}
          <RadioRow active={scope === 'one'} onClick={() => setScope('one')} title="Текущий промпт" desc={store.selectedPromptId ? (prompts.find((p) => p.id === store.selectedPromptId)?.title ?? 'ничего не выбрано') : 'ничего не выбрано'} disabled={!store.selectedPromptId} />
        </div>
        <div className="rounded-md border p-3 text-[11px]" style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}><strong style={{ color: 'var(--text-secondary)' }}>Формат .prmt 2.0</strong> — промпты, папки, версии, шаблоны, блоки, модели, запуски и оценки. Связанные сущности сохраняются вместе с промптами.</div>
      </div>
    </Modal>
  );
};

const RadioRow = ({ active, onClick, title, desc, disabled }: { active: boolean; onClick: () => void; title: string; desc: string; disabled?: boolean }) => (
  <button onClick={onClick} disabled={disabled} className="flex w-full items-center gap-2.5 rounded-md border px-3 py-2.5 text-left" style={{ background: active ? 'var(--accent-subtle)' : 'var(--bg-panel)', borderColor: active ? 'var(--accent-primary)' : 'var(--border-subtle)', opacity: disabled ? 0.4 : 1 }}>
    <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2" style={{ borderColor: active ? 'var(--accent-primary)' : 'var(--border-primary)' }}>{active && <div className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--accent-primary)' }} />}</div>
    <div className="flex-1"><p className="text-[12.5px] font-medium" style={{ color: 'var(--text-primary)' }}>{title}</p><p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{desc}</p></div>
  </button>
);

export default ExportModal;
