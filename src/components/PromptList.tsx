import { useState, useMemo, useRef, useEffect } from 'react';
import Button from './ui/Button';
import { IconButton } from './ui/Button';
import { usePromtovaStore, useUIStore } from '../store/usePromtovaStore';
import { extractVariables, fuzzyMatch, formatRelative, getPromptText } from '../utils/promtova';
import { folderNameById, folderPath } from '../utils/folders';
import type { Prompt } from '../shared/types';
import { Plus, Star, FileText, X, Check, Zap, ArrowUpDown, Pencil, Type, FolderInput } from 'lucide-react';
import { copyToClipboard } from '../utils/copy';

// =============== Prompt List ===============
const PromptList = () => {
  const {
    prompts,
    folders,
    selectedPromptId,
    selectedFolderId,
    searchQuery,
    activeTagFilters,
    sortBy,
    setSortBy,
    selectPrompt,
    toggleStar,
    deletePrompt,
  } = usePromtovaStore();
  const { pushToast, openRenamePrompt } = useUIStore();
  const [sortOpen, setSortOpen] = useState(false);
  const sortWrapRef = useRef<HTMLDivElement>(null);

  // Закрытие дропдауна сортировки по клику вне — без полноэкранного overlay,
  // который ранее блокировал клики по редактору
  useEffect(() => {
    if (!sortOpen) return;
    const onDown = (e: MouseEvent) => {
      if (sortWrapRef.current && !sortWrapRef.current.contains(e.target as Node)) setSortOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setSortOpen(false); };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onEsc);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onEsc);
    };
  }, [sortOpen]);

  const filtered = useMemo(() => {
    let res = prompts;
    if (selectedFolderId === 'starred') res = res.filter((p) => p.starred);
    else if (selectedFolderId !== 'all') {
      const name = folderNameById(folders, selectedFolderId);
      if (name) res = res.filter((p) => p.folder === name);
    }
    if (activeTagFilters.length > 0) {
      res = res.filter((p) => activeTagFilters.every((t) => p.tags.includes(t)));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      res = res.filter(
        (p) =>
          fuzzyMatch(p.title, q) ||
          fuzzyMatch(getPromptText(p), q) || // поиск по объединённому тексту (§4.1)
          p.tags.some((t) => fuzzyMatch(t, q)),
      );
    }
    res = [...res].sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'created') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === 'usage') return b.usageCount - a.usageCount;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
    return res;
  }, [prompts, folders, selectedFolderId, activeTagFilters, searchQuery, sortBy]);

  const folderTitle =
    selectedFolderId === 'all'
      ? 'Все промпты'
      : selectedFolderId === 'starred'
        ? 'Избранное'
        : folderNameById(folders, selectedFolderId) ?? 'Все промпты';

  const sortLabels: Record<string, string> = {
    updated: 'По обновлению',
    created: 'По созданию',
    title: 'По названию',
    usage: 'По использованию',
  };

  return (
    <section
      className="flex h-full w-[340px] shrink-0 flex-col border-r"
      style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-subtle)' }}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              {folderTitle}
            </h2>
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              {filtered.length} {filtered.length === 1 ? 'промпт' : filtered.length < 5 ? 'промпта' : 'промптов'}
            </p>
          </div>
          <div className="relative" ref={sortWrapRef}>
            <IconButton title="Сортировка" onClick={() => setSortOpen((v) => !v)}>
              <ArrowUpDown size={14} />
            </IconButton>
            {sortOpen && (
                <div
                  className="animate-slide-down absolute right-0 top-10 z-20 w-44 overflow-hidden rounded-lg border"
                  style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', boxShadow: 'var(--shadow-md)' }}
                >
                  {(['updated', 'created', 'title', 'usage'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        setSortBy(s);
                        setSortOpen(false);
                      }}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-[12px] transition-colors"
                      style={{
                        background: sortBy === s ? 'var(--accent-subtle)' : 'transparent',
                        color: sortBy === s ? 'var(--accent-primary)' : 'var(--text-primary)',
                      }}
                      onMouseEnter={(e) => {
                        if (sortBy !== s) (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)';
                      }}
                      onMouseLeave={(e) => {
                        if (sortBy !== s) (e.currentTarget as HTMLElement).style.background = 'transparent';
                      }}
                    >
                      {sortLabels[s]}
                      {sortBy === s && <Check size={12} />}
                    </button>
                  ))}
                </div>
            )}
          </div>
        </div>

        {/* Tag filters */}
        {activeTagFilters.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Фильтры:
            </span>
            {activeTagFilters.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10.5px] font-mono"
                style={{ background: 'var(--accent-subtle)', color: 'var(--accent-primary)' }}
              >
                #{t}
                <button
                  onClick={() => usePromtovaStore.getState().toggleTagFilter(t)}
                  className="rounded-sm hover:bg-white/10"
                >
                  <X size={10} />
                </button>
              </span>
            ))}
            <button
              onClick={() => usePromtovaStore.getState().clearTagFilters()}
              className="text-[10px] underline"
              style={{ color: 'var(--text-muted)' }}
            >
              Сбросить
            </button>
          </div>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2.5 pb-3">
        {filtered.length === 0 ? (
          <div className="mt-12 flex flex-col items-center justify-center px-6 text-center">
            <div
              className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <FileText size={22} style={{ color: 'var(--accent-primary)' }} />
            </div>
            <p className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              {searchQuery || activeTagFilters.length > 0 ? 'Ничего не найдено' : 'Список пуст'}
            </p>
            <p className="mt-1.5 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
              {searchQuery || activeTagFilters.length > 0
                ? 'Попробуйте изменить запрос или фильтры'
                : 'Создайте свой первый промпт, чтобы начать'}
            </p>
            {!searchQuery && activeTagFilters.length === 0 && (
              <Button
                variant="primary"
                size="md"
                className="mt-4"
                onClick={() => {
                  const s = usePromtovaStore.getState();
                  const target =
                    s.selectedFolderId === 'all' || s.selectedFolderId === 'starred'
                      ? 'Development'
                      : folderNameById(s.folders, s.selectedFolderId) ?? 'Development';
                  const id = s.createPrompt(target);
                  selectPrompt(id);
                }}
              >
                <Plus size={13} /> Создать промпт
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {filtered.map((p) => (
              <PromptCard
                key={p.id}
                prompt={p}
                active={selectedPromptId === p.id}
                onClick={() => selectPrompt(p.id)}
                onStar={() => toggleStar(p.id)}
                onRename={() => openRenamePrompt(p.id)}
                onDelete={() => {
                  if (confirm(`Удалить "${p.title}"?`)) {
                    deletePrompt(p.id);
                    pushToast({ type: 'warning', message: 'Промпт удалён' });
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer stats */}
      <div
        className="flex items-center justify-between border-t px-4 py-2 text-[10.5px]"
        style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
      >
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Star size={10} /> {prompts.filter((p) => p.starred).length}
          </span>
          <span>·</span>
          <span>{prompts.reduce((s, p) => s + p.usageCount, 0)} копий</span>
        </div>
        <span className="font-mono">{filtered.length}/{prompts.length}</span>
      </div>
    </section>
  );
};

const PromptCard = ({
  prompt,
  active,
  onClick,
  onStar,
  onDelete,
  onRename,
}: {
  prompt: Prompt;
  active: boolean;
  onClick: () => void;
  onStar: () => void;
  onDelete: () => void;
  onRename: () => void;
}) => {
  const vars = useMemo(() => extractVariables(getPromptText(prompt)), [prompt]);
  return (
    <div
      onClick={onClick}
      className="group relative cursor-pointer rounded-lg border p-3 transition-all"
      style={{
        background: active ? 'var(--accent-subtle)' : 'var(--bg-elevated)',
        borderColor: active ? 'var(--accent-primary)' : 'var(--border-subtle)',
      }}
      onMouseEnter={(e) => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)';
          (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-primary)';
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)';
          (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)';
        }
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <h3
          className="line-clamp-1 flex-1 text-[13px] font-semibold"
          style={{ color: active ? 'var(--accent-primary)' : 'var(--text-primary)' }}
        >
          {prompt.title}
        </h3>
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStar();
            }}
            className="rounded p-1"
            style={{ color: prompt.starred ? 'var(--accent-primary)' : 'var(--text-muted)' }}
            title="В избранное"
          >
            <Star size={12} fill={prompt.starred ? 'currentColor' : 'none'} />
          </button>
          {/* Переименовать (§7.3) */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRename();
            }}
            className="rounded p-1"
            style={{ color: 'var(--text-muted)' }}
            title="Переименовать (F2)"
            aria-label="Переименовать"
          >
            <Pencil size={12} />
          </button>
          <button
            onClick={async (e) => {
              e.stopPropagation();
              const ok = await copyToClipboard(prompt.title);
              useUIStore.getState().pushToast({ type: ok ? 'success' : 'error', message: ok ? 'Название скопировано' : 'Не удалось скопировать' });
            }}
            className="rounded p-1"
            style={{ color: 'var(--text-muted)' }}
            title="Копировать название"
            aria-label="Копировать название"
          >
            <Type size={12} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="rounded p-1"
            style={{ color: 'var(--text-muted)' }}
            title="Удалить"
          >
            <X size={12} />
          </button>
        </div>
      </div>
      <p
        className="mt-1 line-clamp-2 text-[11.5px] leading-relaxed"
        style={{ color: 'var(--text-secondary)' }}
      >
        {prompt.preview || prompt.content.slice(0, 100)}
      </p>
      {/* Переместить в папку */}
      <div className="mt-2 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <FolderInput size={10} style={{ color: 'var(--text-muted)' }} />
        <select
          value={prompt.folder}
          onChange={(e) => {
            usePromtovaStore.getState().movePromptToFolder(prompt.id, e.target.value);
            useUIStore.getState().pushToast({ type: 'success', message: `Перемещён в «${e.target.value}»` });
          }}
          aria-label="Переместить в папку"
          title="Переместить в папку"
          className="max-w-[130px] rounded border px-1 py-0.5 text-[10px] outline-none"
          style={{ background: 'var(--bg-active)', color: 'var(--text-secondary)', borderColor: 'var(--border-subtle)' }}
        >
          {usePromtovaStore.getState().folders.map((f) => (
            <option key={f.id} value={f.name}>{folderPath(usePromtovaStore.getState().folders, f.id)}</option>
          ))}
        </select>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1">
          {prompt.tags.slice(0, 3).map((t) => (
            <span
              key={t}
              className="rounded px-1.5 py-0.5 text-[9.5px] font-mono"
              style={{
                background: active ? 'rgba(255,107,53,0.15)' : 'var(--bg-active)',
                color: 'var(--accent-primary)',
              }}
            >
              #{t}
            </span>
          ))}
          {vars.length > 0 && (
            <span
              className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9.5px] font-mono"
              style={{ background: 'var(--bg-active)', color: 'var(--text-muted)' }}
            >
              <Zap size={8} /> {vars.length}
            </span>
          )}
        </div>
        <span className="text-[9.5px] font-mono" style={{ color: 'var(--text-muted)' }}>
          {formatRelative(prompt.updatedAt)}
        </span>
      </div>
    </div>
  );
};

export default PromptList;
