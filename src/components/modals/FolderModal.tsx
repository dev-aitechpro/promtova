// Создание папки: выбор родителя (§3.1), иконки и цвета (§3.4).
import { useEffect, useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { usePromtovaStore, useUIStore } from '../../store/usePromtovaStore';
import { FOLDER_COLORS, FOLDER_ICONS, FOLDER_ICON_KEYS, folderPath, type FolderIconKey } from '../../utils/folders';
import { Plus, Check } from 'lucide-react';

const FolderModal = () => {
  const { folderModalOpen, closeFolderModal, folderModalParentId, pushToast } = useUIStore();
  const { createFolder, folders } = usePromtovaStore();

  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<string | null>(null);
  const [icon, setIcon] = useState<FolderIconKey>('Folder');
  const [color, setColor] = useState('#FF6B35');

  // при открытии сбрасываем форму и учитываем предвыбранного родителя (§3.3)
  useEffect(() => {
    if (!folderModalOpen) return;
    setParentId(folderModalParentId ?? null);
    setName('');
    setIcon('Folder');
    setColor('#FF6B35');
  }, [folderModalOpen, folderModalParentId]);

  const submit = () => {
    const clean = name.trim();
    if (!clean) {
      pushToast({ type: 'warning', message: 'Введите название' });
      return;
    }
    const before = folders.length;
    createFolder(clean, { parent: parentId, icon, color });
    // createFolder молча игнорирует дубликат имени в той же группе
    if (usePromtovaStore.getState().folders.length === before) {
      pushToast({ type: 'warning', message: 'Папка с таким названием уже есть здесь' });
      return;
    }
    pushToast({ type: 'success', message: `Папка «${clean}» создана` });
    setName('');
    closeFolderModal();
  };

  return (
    <Modal
      open={folderModalOpen}
      onClose={closeFolderModal}
      title="Создать папку"
      width="460px"
      footer={
        <>
          <Button variant="ghost" onClick={closeFolderModal}>Отмена</Button>
          <Button variant="primary" onClick={submit}>
            <Plus size={13} /> Создать
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Название */}
        <div>
          <label
            htmlFor="folder-name"
            className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: 'var(--text-secondary)' }}
          >
            Название папки
          </label>
          <input
            id="folder-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
            }}
            placeholder="Например, ChatGPT"
            autoFocus
            className="w-full rounded-md border px-3 py-2 text-[13px] outline-none"
            style={{
              background: 'var(--bg-panel)',
              color: 'var(--text-primary)',
              borderColor: 'var(--border-primary)',
            }}
          />
        </div>

        {/* Родительская папка (§3.1) */}
        <div>
          <label
            htmlFor="folder-parent"
            className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: 'var(--text-secondary)' }}
          >
            Родительская папка
          </label>
          <select
            id="folder-parent"
            value={parentId ?? ''}
            onChange={(e) => setParentId(e.target.value || null)}
            className="w-full rounded-md border px-3 py-2 text-[13px] outline-none"
            style={{
              background: 'var(--bg-panel)',
              color: 'var(--text-primary)',
              borderColor: 'var(--border-primary)',
            }}
          >
            <option value="">Корневая папка</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {folderPath(folders, f.id)}
              </option>
            ))}
          </select>
        </div>

        {/* Иконка (§3.4) */}
        <div>
          <span
            className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: 'var(--text-secondary)' }}
          >
            Иконка
          </span>
          <div className="flex flex-wrap gap-1.5">
            {FOLDER_ICON_KEYS.map((key) => {
              const Icon = FOLDER_ICONS[key];
              const selected = icon === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setIcon(key)}
                  aria-pressed={selected}
                  aria-label={`Иконка ${key}`}
                  title={key}
                  className="flex h-9 w-9 items-center justify-center rounded-md border transition-colors"
                  style={{
                    background: 'var(--bg-panel)',
                    borderColor: selected ? 'var(--accent-primary)' : 'var(--border-subtle)',
                    color: selected ? color : 'var(--text-secondary)',
                    boxShadow: selected ? 'var(--shadow-glow)' : 'none',
                  }}
                >
                  <Icon size={15} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Цвет (§3.4) */}
        <div>
          <span
            className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: 'var(--text-secondary)' }}
          >
            Цвет
          </span>
          <div className="flex flex-wrap gap-1.5">
            {FOLDER_COLORS.map((c) => {
              const selected = color.toLowerCase() === c.toLowerCase();
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-pressed={selected}
                  aria-label={`Цвет ${c}`}
                  title={c}
                  className="flex h-7 w-7 items-center justify-center rounded-full border transition-transform"
                  style={{
                    background: c,
                    borderColor: selected ? 'var(--text-primary)' : 'var(--border-subtle)',
                    transform: selected ? 'scale(1.12)' : 'none',
                  }}
                >
                  {selected && <Check size={12} color="#fff" strokeWidth={3} />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default FolderModal;
