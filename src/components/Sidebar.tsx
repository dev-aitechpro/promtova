import { useState, useEffect, useMemo, useRef } from 'react';
import Button from './ui/Button';
import { IconButton } from './ui/Button';
import FolderContextMenu from './FolderContextMenu';
import { usePromtovaStore, useUIStore } from '../store/usePromtovaStore';
import { cn } from '../utils/cn';
import { readFileAsText } from '../utils/promtova';
import { parseImportFile } from '../utils/importExport';
import { isElectron, openTextFile } from '../utils/fileBridge';
import { folderNameById, getFolderIcon, getSiblings } from '../utils/folders';
import { FOCUS_SEARCH_EVENT } from '../hooks/useGlobalHotkeys';
import type { Folder } from '../shared/types';
import {
  Plus, Search, Star, Settings, Download, Upload, FileText, X, Sparkles, Hash,
  Keyboard, Folder as FolderIcon, ArrowUp, ArrowDown, ChevronRight,
} from 'lucide-react';

// =============== Sidebar ===============
const Sidebar = () => {
  const {
    folders,
    prompts,
    selectedFolderId,
    searchQuery,
    tags,
    activeTagFilters,
    selectFolder,
    setSearchQuery,
    selectPrompt,
    moveFolderUp,
    moveFolderDown,
    toggleTagFilter,
  } = usePromtovaStore();
  const { openSettings, openExport, openFolderModal, openShortcuts, openTagModal, openDeleteFolder, openMerge, pushToast } =
    useUIStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null);

  // фокус на поиске по глобальному хоткею (§8.1)
  useEffect(() => {
    const onFocus = () => searchRef.current?.focus();
    window.addEventListener(FOCUS_SEARCH_EVENT, onFocus);
    return () => window.removeEventListener(FOCUS_SEARCH_EVENT, onFocus);
  }, []);

  const counts = useMemo(() => {
    const all = prompts.length;
    const starred = prompts.filter((p) => p.starred).length;
    const byFolder: Record<string, number> = {};
    prompts.forEach((p) => {
      byFolder[p.folder] = (byFolder[p.folder] || 0) + 1;
    });
    return { all, starred, byFolder };
  }, [prompts]);

  /** Текущая папка как название (для создания промпта и импорта). */
  const currentFolderName = () => {
    if (selectedFolderId === 'all' || selectedFolderId === 'starred') return 'Development';
    return folderNameById(folders, selectedFolderId) ?? 'Development';
  };

  const handleNewPrompt = () => {
    const id = usePromtovaStore.getState().createPrompt(currentFolderName());
    selectPrompt(id);
  };

  /** Общий разбор импортируемого текста → диалог объединения баз (§5.1). */
  const importText = (text: string, titleHint: string) => {
    const parsed = parseImportFile(text, currentFolderName(), titleHint);
    if (parsed.prompts.length === 0) {
      pushToast({ type: 'error', message: parsed.errors[0] ?? 'Не удалось разобрать файл' });
      return;
    }
    openMerge(parsed);
  };

  // Веб-режим: скрытый <input type="file">
  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await readFileAsText(file);
      importText(text, file.name.replace(/\.(md|txt|prmt|json)$/i, ''));
    } catch {
      pushToast({ type: 'error', message: 'Ошибка чтения файла' });
    }
    e.target.value = '';
  };

  // Electron: нативный диалог открытия файла (§6)
  const handleImportClick = async () => {
    if (!isElectron()) {
      fileInputRef.current?.click();
      return;
    }
    try {
      const picked = await openTextFile();
      if (!picked) return; // пользователь отменил диалог
      importText(picked.text, picked.name.replace(/\.(md|txt|prmt|json)$/i, ''));
    } catch {
      pushToast({ type: 'error', message: 'Ошибка чтения файла' });
    }
  };

  // ============ Дерево папок (§3, §7.1) ============
  const FolderRow = ({ folder, depth }: { folder: Folder; depth: number }) => {
    const Icon = getFolderIcon(folder);
    const children = getSiblings(folders, folder.id);
    const hasChildren = children.length > 0;
    const isOpen = expanded[folder.id] ?? true;
    const isActive = selectedFolderId === folder.id;
    const count = counts.byFolder[folder.name] || 0;

    return (
      <div>
        <div
          role="treeitem"
          aria-expanded={hasChildren ? isOpen : undefined}
          aria-selected={isActive}
          tabIndex={0}
          className="group flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 text-[12.5px] transition-colors"
          style={{
            paddingLeft: 8 + depth * 12,
            background: isActive ? 'var(--accent-subtle)' : 'transparent',
            color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
          }}
          onClick={() => {
            selectFolder(folder.id);
            if (hasChildren) setExpanded((s) => ({ ...s, [folder.id]: !isOpen }));
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              selectFolder(folder.id);
            }
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            setMenu({ id: folder.id, x: e.clientX, y: e.clientY });
          }}
          onMouseEnter={(e) => {
            if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)';
          }}
          onMouseLeave={(e) => {
            if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent';
          }}
        >
          {hasChildren ? (
            <span
              className="flex shrink-0 items-center transition-transform"
              style={{ transform: isOpen ? 'rotate(90deg)' : 'none', color: 'var(--text-muted)' }}
            >
              <ChevronRight size={11} />
            </span>
          ) : (
            <span className="w-[11px] shrink-0" />
          )}
          <span style={{ color: folder.color || 'var(--text-muted)' }}>
            <Icon size={13} />
          </span>
          <span className="flex-1 truncate font-medium">{folder.name}</span>

          {/* счётчик */}
          {count > 0 && (
            <span
              className="rounded px-1.5 py-0 text-[10px] font-mono"
              style={{
                background: isActive ? 'rgba(255,107,53,0.15)' : 'var(--bg-elevated)',
                color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)',
              }}
            >
              {count}
            </span>
          )}

          {/* действия: вверх / вниз / удалить (§3.2) */}
          <span className="ml-0.5 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              className="rounded p-0.5"
              title="Переместить вверх"
              aria-label="Переместить вверх"
              onClick={(e) => {
                e.stopPropagation();
                moveFolderUp(folder.id);
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-active)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              style={{ color: 'var(--text-muted)' }}
            >
              <ArrowUp size={11} />
            </button>
            <button
              className="rounded p-0.5"
              title="Переместить вниз"
              aria-label="Переместить вниз"
              onClick={(e) => {
                e.stopPropagation();
                moveFolderDown(folder.id);
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-active)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              style={{ color: 'var(--text-muted)' }}
            >
              <ArrowDown size={11} />
            </button>
            <button
              className="rounded p-0.5"
              title="Удалить папку"
              aria-label="Удалить папку"
              onClick={(e) => {
                e.stopPropagation();
                openDeleteFolder(folder.id);
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-active)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              style={{ color: 'var(--text-muted)' }}
            >
              <X size={11} />
            </button>
          </span>
        </div>

        {isOpen &&
          children.map((c) => <FolderRow key={c.id} folder={c} depth={depth + 1} />)}
      </div>
    );
  };

  const rootFolders = getSiblings(folders, null);

  return (
    <aside
      className="flex h-full w-[260px] shrink-0 flex-col border-r"
      style={{ background: 'var(--bg-sidebar)', borderColor: 'var(--border-subtle)' }}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: 'var(--accent-primary)' }}
          >
            <Sparkles size={16} color="#fff" strokeWidth={2.5} />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-[15px] font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Промтовая
            </span>
            <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
              v1.2.0 · MIT
            </span>
          </div>
        </div>

        <div
          className="mt-3 flex items-center gap-2 rounded-md border px-2.5 py-1.5"
          style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-subtle)' }}
        >
          <FolderIcon size={13} style={{ color: 'var(--accent-primary)' }} />
          <span className="text-[12px] font-medium" style={{ color: 'var(--text-primary)' }}>
            Моя база
          </span>
          <span className="ml-auto text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
            {prompts.length}
          </span>
        </div>
      </div>

      {/* New prompt button */}
      <div className="px-4">
        <Button variant="primary" size="md" className="w-full" onClick={handleNewPrompt}>
          <Plus size={15} strokeWidth={2.5} /> Новый промпт
        </Button>
      </div>

      {/* Search */}
      <div className="px-4 pt-3">
        <div
          className="flex items-center gap-2 rounded-md border px-2.5 py-1.5 transition-colors focus-within:border-[var(--accent-primary)]"
          style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-subtle)' }}
        >
          <Search size={13} style={{ color: 'var(--text-muted)' }} />
          <input
            ref={searchRef}
            type="text"
            placeholder="Поиск промптов..."
            aria-label="Поиск промптов"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-[12.5px] outline-none"
            style={{ color: 'var(--text-primary)' }}
          />
          <kbd
            className="rounded px-1.5 py-0.5 font-mono text-[9px]"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
          >
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Navigation */}
      <nav className="mt-4 flex-1 overflow-y-auto px-2">
        <NavItem
          icon={<FileText size={14} />}
          label="Все промпты"
          count={counts.all}
          active={selectedFolderId === 'all'}
          onClick={() => selectFolder('all')}
        />
        <NavItem
          icon={<Star size={14} />}
          label="Избранное"
          count={counts.starred}
          active={selectedFolderId === 'starred'}
          onClick={() => selectFolder('starred')}
        />
        {/* §8.2: пункт больше не открывает окно горячих клавиш */}
        <NavItem
          icon={<Hash size={14} />}
          label="По тегам"
          count={activeTagFilters.length || undefined}
          onClick={openTagModal}
        />

        <div className="my-3 h-px" style={{ background: 'var(--border-subtle)' }} />

        {/* Folders */}
        <div className="mb-1.5 flex items-center justify-between px-2.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Папки
          </span>
          <button
            onClick={() => openFolderModal(null)}
            className="rounded p-0.5 transition-colors hover:bg-white/5"
            style={{ color: 'var(--text-secondary)' }}
            title="Создать папку"
            aria-label="Создать папку"
          >
            <Plus size={13} />
          </button>
        </div>

        <div role="tree" aria-label="Папки">
          {rootFolders.map((f) => (
            <FolderRow key={f.id} folder={f} depth={0} />
          ))}
        </div>

        <button
          onClick={() => openFolderModal(null)}
          className="mt-1 flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-[12px] transition-colors"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <Plus size={12} /> Новая папка
        </button>

        <div className="my-3 h-px" style={{ background: 'var(--border-subtle)' }} />

        {/* Tags — показываем все, а не первые 12 */}
        <div className="mb-1.5 flex items-center justify-between px-2.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Теги
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5 px-2.5 pb-3">
          {tags.map((t) => {
            const active = activeTagFilters.includes(t.name);
            return (
              <button
                key={t.id}
                onClick={() => toggleTagFilter(t.name)}
                aria-pressed={active}
                className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10.5px] font-mono transition-colors"
                style={{
                  background: active ? 'var(--accent-subtle)' : 'var(--bg-elevated)',
                  color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  border: `1px solid ${active ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                }}
              >
                <span style={{ color: 'var(--accent-primary)' }}>#</span>{t.name}
                <span style={{ color: 'var(--text-muted)' }}>{t.count}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div
        className="flex items-center justify-between border-t px-2 py-2"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <IconButton title="Настройки" onClick={openSettings}><Settings size={15} /></IconButton>
        <IconButton title="Импорт" onClick={handleImportClick}><Upload size={15} /></IconButton>
        <IconButton title="Экспорт" onClick={openExport}><Download size={15} /></IconButton>
        <IconButton title="Горячие клавиши" onClick={openShortcuts}><Keyboard size={15} /></IconButton>
        <input ref={fileInputRef} type="file" accept=".prmt,.json,.md,.txt" className="hidden" onChange={handleFileInput} />
        <span
          className="ml-1 truncate rounded px-1.5 py-0.5 text-[9px] font-mono"
          style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
          title="Лицензия MIT · © Pavel K. / Neurocode"
        >
          MIT
        </span>
      </div>

      {menu && (
        <FolderContextMenu
          folderId={menu.id}
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu(null)}
        />
      )}
    </aside>
  );
};

const NavItem = ({
  icon,
  label,
  count,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  count?: number;
  active?: boolean;
  onClick: () => void;
}) => (
  <div
    className={cn('mb-0.5 flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-[12.5px] transition-colors')}
    style={{
      background: active ? 'var(--accent-subtle)' : 'transparent',
      color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
    }}
    onClick={onClick}
    onMouseEnter={(e) => {
      if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)';
    }}
    onMouseLeave={(e) => {
      if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent';
    }}
  >
    {icon}
    <span className="flex-1 font-medium">{label}</span>
    {count !== undefined && (
      <span
        className="rounded px-1.5 py-0 text-[10px] font-mono"
        style={{
          background: active ? 'rgba(255,107,53,0.15)' : 'var(--bg-elevated)',
          color: active ? 'var(--accent-primary)' : 'var(--text-muted)',
        }}
      >
        {count}
      </span>
    )}
  </div>
);

export default Sidebar;
