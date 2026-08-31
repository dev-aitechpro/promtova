// Переименование папки (§3.5). Доступно из контекстного меню.
import { useEffect, useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { usePromtovaStore, useUIStore } from '../../store/usePromtovaStore';

const RenameFolderModal = () => {
  const { renameFolderId, closeRenameFolder, pushToast } = useUIStore();
  const { renameFolder } = usePromtovaStore();
  // подписываемся на строку, а не на объект: поле ввода не сбрасывается при печати
  const currentName = usePromtovaStore(
    (s) => (renameFolderId ? s.folders.find((f) => f.id === renameFolderId)?.name ?? '' : ''),
  );
  const [name, setName] = useState('');

  // при открытии подставляем текущее название
  useEffect(() => {
    setName(currentName);
  }, [currentName, renameFolderId]);

  const submit = () => {
    const clean = name.trim();
    if (!renameFolderId || !clean) return;
    if (currentName === clean) {
      closeRenameFolder();
      return;
    }
    renameFolder(renameFolderId, clean);
    pushToast({ type: 'success', message: `Папка переименована в «${clean}»` });
    closeRenameFolder();
  };

  return (
    <Modal
      open={!!renameFolderId}
      onClose={closeRenameFolder}
      title="Переименовать папку"
      width="440px"
      footer={
        <>
          <Button variant="ghost" onClick={closeRenameFolder}>Отмена</Button>
          <Button variant="primary" onClick={submit} disabled={!name.trim()}>
            Переименовать
          </Button>
        </>
      }
    >
      <div>
        <label
          htmlFor="rename-folder-input"
          className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: 'var(--text-secondary)' }}
        >
          Новое название
        </label>
        <input
          id="rename-folder-input"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
          }}
          autoFocus
          className="w-full rounded-md border px-3 py-2 text-[13px] outline-none"
          style={{
            background: 'var(--bg-panel)',
            color: 'var(--text-primary)',
            borderColor: 'var(--border-primary)',
          }}
        />
        <p className="mt-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
          Связи с подпапками и промптами сохраняются — они привязаны к идентификатору папки.
        </p>
      </div>
    </Modal>
  );
};

export default RenameFolderModal;
