// Переименование промпта (§7.3). Открывается кнопкой на карточке или по F2.
import { useEffect, useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { usePromtovaStore, useUIStore } from '../../store/usePromtovaStore';

const RenamePromptModal = () => {
  const { renamePromptId, closeRenamePrompt, pushToast } = useUIStore();
  const { renamePrompt } = usePromtovaStore();
  // подписываемся на строку, а не на объект: поле ввода не сбрасывается при печати
  const currentTitle = usePromtovaStore(
    (s) => (renamePromptId ? s.prompts.find((p) => p.id === renamePromptId)?.title ?? '' : ''),
  );
  const [title, setTitle] = useState('');

  useEffect(() => {
    setTitle(currentTitle);
  }, [currentTitle, renamePromptId]);

  const submit = () => {
    const clean = title.trim();
    if (!renamePromptId || !clean) return;
    renamePrompt(renamePromptId, clean);
    pushToast({ type: 'success', message: 'Промпт переименован' });
    closeRenamePrompt();
  };

  return (
    <Modal
      open={!!renamePromptId}
      onClose={closeRenamePrompt}
      title="Переименовать промпт"
      width="440px"
      footer={
        <>
          <Button variant="ghost" onClick={closeRenamePrompt}>Отмена</Button>
          <Button variant="primary" onClick={submit} disabled={!title.trim()}>
            Переименовать
          </Button>
        </>
      }
    >
      <div>
        <label
          htmlFor="rename-prompt-input"
          className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: 'var(--text-secondary)' }}
        >
          Новое название
        </label>
        <input
          id="rename-prompt-input"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
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
      </div>
    </Modal>
  );
};

export default RenamePromptModal;
