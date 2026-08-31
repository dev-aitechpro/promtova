import { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { usePromtovaStore, useUIStore } from '../../store/usePromtovaStore';
import { buildExportData } from '../../utils/importExport';
import { saveTextFile } from '../../utils/fileBridge';
import { folderNameById, folderPath, getDescendantIds } from '../../utils/folders';
import type { ExportData, Folder } from '../../shared/types';
import { Download } from 'lucide-react';

const ExportModal = () => {
  const { exportOpen, closeExport, pushToast } = useUIStore();
  const { prompts, folders } = usePromtovaStore();
  const [scope, setScope] = useState<'all' | 'folder' | 'one'>('all');
  const [folderSel, setFolderSel] = useState(folders[0]?.id || '');
  const selectedPrompt = usePromtovaStore((s) => s.prompts.find((p) => p.id === s.selectedPromptId));

  const folderSelName = folderNameById(folders, folderSel) ?? '';
  const folderCount = prompts.filter((p) => p.folder === folderSelName).length;

  const handleExport = async () => {
    let data: typeof prompts;
    let foldersOut: Folder[] = [];

    if (scope === 'all') {
      data = prompts;
      foldersOut = folders;
    } else if (scope === 'folder') {
      data = prompts.filter((p) => p.folder === folderSelName);
      // папка вместе со всем поддеревом (§5.2)
      const ids = new Set([folderSel, ...getDescendantIds(folders, folderSel)]);
      foldersOut = folders.filter((f) => ids.has(f.id));
    } else {
      data = selectedPrompt ? [selectedPrompt] : [];
    }

    const payload: ExportData = buildExportData(data, foldersOut);

    const filename =
      scope === 'all'
        ? `promtova-all-${new Date().toISOString().slice(0, 10)}.prmt`
        : scope === 'folder'
          ? `promtova-${folderSelName || 'folder'}-${new Date().toISOString().slice(0, 10)}.prmt`
          : `${selectedPrompt?.title || 'prompt'}.prmt`;

    // В Electron — нативный диалог сохранения, в вебе — download (§6)
    const saved = await saveTextFile(filename, JSON.stringify(payload, null, 2));
    if (!saved) return; // пользователь отменил диалог
    pushToast({
      type: 'success',
      message: `Экспортировано: ${data.length} промптов${foldersOut.length ? `, папок: ${foldersOut.length}` : ''}`,
    });
    closeExport();
  };

  return (
    <Modal
      open={exportOpen}
      onClose={closeExport}
      title="Экспорт промптов"
      width="520px"
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
              title="Все промпты"
              desc={`${prompts.length} шт.`}
            />
            <RadioRow
              active={scope === 'folder'}
              onClick={() => setScope('folder')}
              title="Выбранная папка"
              desc={`${folderCount} шт. из «${folderSelName || '—'}»`}
            >
              {scope === 'folder' && (
                <select
                  value={folderSel}
                  onChange={(e) => setFolderSel(e.target.value)}
                  aria-label="Папка для экспорта"
                  className="ml-2 rounded-md border px-2 py-1 text-[11.5px] outline-none"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', borderColor: 'var(--border-primary)' }}
                >
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>{folderPath(folders, f.id)}</option>
                  ))}
                </select>
              )}
            </RadioRow>
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
          Промтовой. Содержит полные данные промптов (включая шаблонный режим system/context/output),
          переменные, теги, счётчики и структуру папок (иерархию, иконки и цвета).
          Импортируется через боковую панель — при импорте предлагается разрешить совпадения.
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
