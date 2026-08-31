// Подтверждение удаления папки с учётом поддерева (§8.6). Заменяет нативный confirm().
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { usePromtovaStore, useUIStore } from '../../store/usePromtovaStore';
import { getDescendantIds } from '../../utils/folders';
import { AlertTriangle, Trash2 } from 'lucide-react';

const plural = (n: number, one: string, few: string, many: string) => {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
};

const ConfirmDeleteFolderModal = () => {
  const { deleteFolderId, closeDeleteFolder, pushToast } = useUIStore();
  const { folders, deleteFolder, countFolderPrompts } = usePromtovaStore();

  const folder = folders.find((f) => f.id === deleteFolderId);
  const subfolderCount = deleteFolderId ? getDescendantIds(folders, deleteFolderId).length : 0;
  const promptCount = deleteFolderId ? countFolderPrompts(deleteFolderId) : 0;

  const confirm = () => {
    if (!deleteFolderId || !folder) return;
    deleteFolder(deleteFolderId);
    pushToast({ type: 'warning', message: `Папка «${folder.name}» удалена` });
    closeDeleteFolder();
  };

  return (
    <Modal
      open={!!deleteFolderId}
      onClose={closeDeleteFolder}
      title="Удалить папку"
      width="460px"
      footer={
        <>
          <Button variant="ghost" onClick={closeDeleteFolder}>Отмена</Button>
          <Button variant="danger" onClick={confirm}>
            <Trash2 size={13} /> Удалить
          </Button>
        </>
      }
    >
      <div className="flex gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{ background: 'rgba(229,107,111,0.12)', color: 'var(--status-error)' }}
        >
          <AlertTriangle size={18} />
        </div>
        <div className="min-w-0">
          <p className="text-[13px]" style={{ color: 'var(--text-primary)' }}>
            Удалить папку <strong>«{folder?.name ?? ''}»</strong>?
          </p>
          <p className="mt-1.5 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
            Будет удалено{' '}
            <strong style={{ color: 'var(--status-error)' }}>
              {promptCount} {plural(promptCount, 'промпт', 'промпта', 'промптов')}
            </strong>
            {subfolderCount > 0 && (
              <>
                {' '}и{' '}
                <strong style={{ color: 'var(--status-error)' }}>
                  {subfolderCount} {plural(subfolderCount, 'вложенная папка', 'вложенные папки', 'вложенных папок')}
                </strong>
              </>
            )}
            .
          </p>
          <p className="mt-2 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
            Действие необратимо. Перед удалением можно выгрузить базу через «Экспорт».
          </p>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmDeleteFolderModal;
