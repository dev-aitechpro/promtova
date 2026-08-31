// Просмотр и фильтрация по тегам (§8.2). Раньше пункт «По тегам» открывал окно хоткеев.
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { usePromtovaStore, useUIStore } from '../../store/usePromtovaStore';
import { Check, Hash, X } from 'lucide-react';

const TagModal = () => {
  const { tagModalOpen, closeTagModal } = useUIStore();
  const { tags, activeTagFilters, toggleTagFilter, clearTagFilters, selectFolder } = usePromtovaStore();

  return (
    <Modal
      open={tagModalOpen}
      onClose={closeTagModal}
      title="Теги"
      width="520px"
      footer={
        <>
          <Button
            variant="ghost"
            onClick={() => {
              clearTagFilters();
            }}
            disabled={activeTagFilters.length === 0}
          >
            Сбросить фильтры
          </Button>
          <Button variant="primary" onClick={closeTagModal}>Готово</Button>
        </>
      }
    >
      {tags.length === 0 ? (
        <p className="py-6 text-center text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
          Тегов пока нет. Добавьте их в редакторе промпта.
        </p>
      ) : (
        <>
          <p className="mb-3 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
            Выберите теги для фильтрации базы. Активные фильтры объединяются по «И».
          </p>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => {
              const active = activeTagFilters.includes(t.name);
              return (
                <button
                  key={t.id}
                  onClick={() => toggleTagFilter(t.name)}
                  aria-pressed={active}
                  className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-mono transition-colors"
                  style={{
                    background: active ? 'var(--accent-subtle)' : 'var(--bg-panel)',
                    color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    border: `1px solid ${active ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                  }}
                >
                  {active ? <Check size={11} /> : <Hash size={11} />}
                  {t.name}
                  <span style={{ color: 'var(--text-muted)' }}>{t.count}</span>
                </button>
              );
            })}
          </div>

          {activeTagFilters.length > 0 && (
            <div
              className="mt-4 flex flex-wrap items-center gap-1.5 border-t pt-3"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Активные:</span>
              {activeTagFilters.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-mono"
                  style={{ background: 'var(--accent-subtle)', color: 'var(--accent-primary)' }}
                >
                  #{t}
                  <button onClick={() => toggleTagFilter(t)} aria-label={`Убрать ${t}`}>
                    <X size={10} />
                  </button>
                </span>
              ))}
              <button
                onClick={() => {
                  clearTagFilters();
                  selectFolder('all');
                  closeTagModal();
                }}
                className="ml-auto text-[11px] underline"
                style={{ color: 'var(--text-muted)' }}
              >
                показать все промпты
              </button>
            </div>
          )}
        </>
      )}
    </Modal>
  );
};

export default TagModal;
