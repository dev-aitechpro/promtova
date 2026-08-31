import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { useUIStore } from '../../store/usePromtovaStore';

const ShortcutsModal = () => {
  const { shortcutsOpen, closeShortcuts } = useUIStore();

  // Список синхронизирован с фактически реализованными обработчиками
  // (src/hooks/useGlobalHotkeys.ts) — см. §8.1.
  const shortcuts = [
    { keys: ['⌘', 'K'], desc: 'Фокус на поиске' },
    { keys: ['⌘', 'F'], desc: 'Фокус на поиске (альтернатива ⌘K)' },
    { keys: ['⌘', 'N'], desc: 'Создать новый промпт' },
    { keys: ['⌘', 'S'], desc: 'Сохранить' },
    { keys: ['⌘', 'C'], desc: 'Копировать промпт' },
    { keys: ['⌘', '⇧', 'C'], desc: 'Копировать с подстановкой переменных' },
    { keys: ['F2'], desc: 'Переименовать выбранный промпт' },
    { keys: ['Esc'], desc: 'Закрыть окно или контекстное меню' },
    { keys: ['ПКМ'], desc: 'Контекстное меню папки' },
  ];

  return (
    <Modal
      open={shortcutsOpen}
      onClose={closeShortcuts}
      title="Горячие клавиши"
      width="480px"
      footer={<Button variant="primary" onClick={closeShortcuts}>Понятно</Button>}
    >
      <div className="space-y-1.5">
        {shortcuts.map((s, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-md border px-3 py-2"
            style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-subtle)' }}
          >
            <span className="text-[12.5px]" style={{ color: 'var(--text-primary)' }}>{s.desc}</span>
            <div className="flex items-center gap-1">
              {s.keys.map((k, j) => (
                <kbd
                  key={j}
                  className="rounded px-1.5 py-0.5 font-mono text-[10.5px]"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
                >
                  {k}
                </kbd>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
};

export default ShortcutsModal;
