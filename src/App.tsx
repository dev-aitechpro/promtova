import { useEffect, useMemo, useRef, useState } from 'react';
import {
  usePromtovaStore,
  useUIStore,
  useThemeStore,
  applyTheme,
  type CustomTheme,
} from './store/usePromtovaStore';
import { cn } from './utils/cn';
import {
  substituteVariables,
  extractVariables,
  renderMarkdown,
  fuzzyMatch,
  formatRelative,
  countWords,
  countChars,
  downloadFile,
  readFileAsText,
} from './utils/promtova';
import type { Prompt } from './shared/types';
import {
  Plus,
  Search,
  Star,
  Eye,
  Pencil,
  Save,
  Copy,
  CopyPlus,
  Trash2,
  Settings,
  Download,
  Upload,
  FileText,
  ChevronRight,
  X,
  Check,
  AlertCircle,
  CheckCircle2,
  Info,
  AlertTriangle,
  Sparkles,
  Hash,
  Tag as TagIcon,
  Keyboard,
  Folder,
  Zap,
  Megaphone,
  Code2,
  Sun,
  Moon,
  Palette,
  Type,
  Layers,
  ArrowLeft,
  ArrowUpDown,
} from 'lucide-react';

// =============== Toast ===============
const ToastStack = () => {
  const { toasts, dismissToast } = useUIStore();
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="toast-enter pointer-events-auto flex min-w-[280px] max-w-sm items-start gap-3 rounded-lg border px-4 py-3 shadow-lg"
          style={{
            background: 'var(--bg-elevated)',
            borderColor: 'var(--border-primary)',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          {t.type === 'success' && <CheckCircle2 size={18} className="mt-0.5 shrink-0" style={{ color: 'var(--status-success)' }} />}
          {t.type === 'error' && <AlertCircle size={18} className="mt-0.5 shrink-0" style={{ color: 'var(--status-error)' }} />}
          {t.type === 'warning' && <AlertTriangle size={18} className="mt-0.5 shrink-0" style={{ color: 'var(--status-warning)' }} />}
          {t.type === 'info' && <Info size={18} className="mt-0.5 shrink-0" style={{ color: 'var(--status-info)' }} />}
          <span className="flex-1 text-[13px]" style={{ color: 'var(--text-primary)' }}>{t.message}</span>
          <button
            onClick={() => dismissToast(t.id)}
            className="rounded p-0.5 opacity-60 hover:opacity-100"
            style={{ color: 'var(--text-secondary)' }}
            aria-label="Закрыть"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};

// =============== Modal Wrapper ===============
const Modal = ({
  open,
  onClose,
  title,
  children,
  width = '520px',
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: string;
  footer?: React.ReactNode;
}) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 animate-fade-in" style={{ background: 'rgba(0,0,0,0.55)' }}>
      <div
        className="animate-scale-in flex max-h-[90vh] w-full flex-col overflow-hidden rounded-xl border"
        style={{
          width,
          background: 'var(--bg-elevated)',
          borderColor: 'var(--border-primary)',
          boxShadow: 'var(--shadow-lg)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between border-b px-5 py-3.5"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <h2 className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 transition-colors hover:bg-white/5"
            style={{ color: 'var(--text-secondary)' }}
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div
            className="flex items-center justify-end gap-2 border-t px-5 py-3"
            style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-panel)' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

// =============== Button ===============
const Button = ({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}) => {
  const base = 'btn-press inline-flex items-center justify-center gap-1.5 font-medium transition-colors';
  const sizes = {
    sm: 'h-7 px-2.5 text-[12px] rounded-md',
    md: 'h-9 px-3.5 text-[13px] rounded-md',
    lg: 'h-11 px-5 text-[14px] rounded-lg',
  }[size];

  const variants = {
    primary: {
      background: 'var(--primary-button)',
      color: 'var(--primary-button-text)',
    },
    secondary: {
      background: 'var(--secondary-button)',
      color: 'var(--text-primary)',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--text-secondary)',
    },
    danger: {
      background: 'var(--status-error)',
      color: '#fff',
    },
  }[variant];

  return (
    <button
      className={cn(base, sizes, className)}
      style={variants}
      onMouseEnter={(e) => {
        if (variant === 'primary') (e.currentTarget as HTMLElement).style.background = 'var(--primary-button-hover)';
        if (variant === 'secondary') (e.currentTarget as HTMLElement).style.background = 'var(--secondary-button-hover)';
      }}
      onMouseLeave={(e) => {
        if (variant === 'primary') (e.currentTarget as HTMLElement).style.background = 'var(--primary-button)';
        if (variant === 'secondary') (e.currentTarget as HTMLElement).style.background = 'var(--secondary-button)';
      }}
      {...props}
    >
      {children}
    </button>
  );
};

const IconButton = ({
  active,
  title,
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean; title: string }) => (
  <button
    title={title}
    aria-label={title}
    className={cn('btn-press inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors', className)}
    style={{
      background: active ? 'var(--bg-active)' : 'transparent',
      color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
    }}
    onMouseEnter={(e) => {
      if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)';
    }}
    onMouseLeave={(e) => {
      if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent';
    }}
    {...props}
  >
    {children}
  </button>
);

// =============== Sidebar ===============
const Sidebar = () => {
  const {
    folders,
    prompts,
    selectedFolder,
    searchQuery,
    tags,
    selectFolder,
    setSearchQuery,
    selectPrompt,
    deleteFolder,
  } = usePromtovaStore();
  const { openSettings, openExport, openFolderModal, openShortcuts, pushToast } = useUIStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    Development: true,
    Marketing: true,
    Productivity: true,
    Creative: true,
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
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

  const folderIcon = (name: string) => {
    const f = folders.find((f) => f.name === name);
    if (!f?.icon) return Folder;
    return (
      { Code2, Megaphone, Zap, Sparkles, Folder } as Record<string, any>
    )[f.icon] || Folder;
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await readFileAsText(file);
      const isJson = file.name.endsWith('.prmt') || file.name.endsWith('.json');
      const isMd = file.name.endsWith('.md') || file.name.endsWith('.txt');

      if (isJson) {
        const data = JSON.parse(text);
        if (data.prompts && Array.isArray(data.prompts)) {
          const existing = usePromtovaStore.getState().prompts;
          const newOnes: Prompt[] = data.prompts.map((p: any, i: number) => ({
            id: Date.now() + i,
            title: p.title,
            tags: p.tags || [],
            preview: p.preview || '',
            path: p.path || p.title,
            content: p.content,
            vars: p.vars || {},
            starred: !!p.starred,
            folder: p.folder || 'Development',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            usageCount: 0,
          }));
          usePromtovaStore.setState({ prompts: [...newOnes, ...existing] });
          pushToast({ type: 'success', message: `Импортировано: ${newOnes.length} промптов` });
        } else {
          pushToast({ type: 'error', message: 'Неверный формат .prmt' });
        }
      } else if (isMd) {
        const id = Date.now();
        const title = file.name.replace(/\.(md|txt)$/, '');
        // Extract variables
        const varRegex = /\{\{([^}]+)\}\}/g;
        const vars: Record<string, string> = {};
        let m: RegExpExecArray | null;
        while ((m = varRegex.exec(text)) !== null) {
          const key = m[1].trim();
          if (!(key in vars)) vars[key] = '';
        }
        // Extract tags from first heading or front matter
        const tags: string[] = [];
        const frontMatch = text.match(/^---\s*\n([\s\S]*?)\n---/);
        if (frontMatch) {
          const tagLine = frontMatch[1].match(/tags:\s*\[(.*?)\]/);
          if (tagLine) {
            tagLine[1].split(',').forEach((t) => tags.push(t.trim().replace(/['"]/g, '')));
          }
        }
        const newPrompt: Prompt = {
          id,
          title,
          tags,
          preview: text.replace(/[#*`>_\-\[\]]/g, '').replace(/\s+/g, ' ').trim().slice(0, 120),
          path: `Development/${title}`,
          content: text,
          vars,
          starred: false,
          folder: 'Development',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          usageCount: 0,
        };
        usePromtovaStore.setState((s) => ({
          prompts: [newPrompt, ...s.prompts],
          selectedPromptId: id,
        }));
        pushToast({
          type: 'success',
          message: `Импортирован: ${title}${Object.keys(vars).length ? ` · ${Object.keys(vars).length} переменных` : ''}`,
        });
      } else {
        pushToast({ type: 'warning', message: 'Поддерживаются .prmt, .json, .md, .txt' });
      }
    } catch (err) {
      pushToast({ type: 'error', message: 'Ошибка чтения файла' });
    }
    e.target.value = '';
  };

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
              v1.0.0 · MIT
            </span>
          </div>
        </div>

        <div
          className="mt-3 flex items-center gap-2 rounded-md border px-2.5 py-1.5"
          style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-subtle)' }}
        >
          <Folder size={13} style={{ color: 'var(--accent-primary)' }} />
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
        <Button
          variant="primary"
          size="md"
          className="w-full"
          onClick={() => {
            const id = usePromtovaStore.getState().createPrompt(selectedFolder === 'all' || selectedFolder === 'starred' ? 'Development' : selectedFolder);
            selectPrompt(id);
          }}
        >
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
        {/* Quick nav */}
        <NavItem
          icon={<FileText size={14} />}
          label="Все промпты"
          count={counts.all}
          active={selectedFolder === 'all'}
          onClick={() => selectFolder('all')}
        />
        <NavItem
          icon={<Star size={14} />}
          label="Избранное"
          count={counts.starred}
          active={selectedFolder === 'starred'}
          onClick={() => selectFolder('starred')}
        />
        <NavItem
          icon={<Hash size={14} />}
          label="По тегам"
          onClick={() => openShortcuts()}
        />

        <div className="my-3 h-px" style={{ background: 'var(--border-subtle)' }} />

        {/* Folders */}
        <div className="mb-1.5 flex items-center justify-between px-2.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Папки
          </span>
          <button
            onClick={openFolderModal}
            className="rounded p-0.5 transition-colors hover:bg-white/5"
            style={{ color: 'var(--text-secondary)' }}
            title="Создать папку"
          >
            <Plus size={13} />
          </button>
        </div>

        {folders.map((folder) => {
          const Icon = folderIcon(folder.name);
          const isOpen = expandedFolders[folder.name] ?? true;
          const isActive = selectedFolder === folder.name;
          const count = counts.byFolder[folder.name] || 0;
          return (
            <div key={folder.name} className="mb-0.5">
              <div
                className={cn(
                  'group flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 text-[12.5px] transition-colors',
                )}
                style={{
                  background: isActive ? 'var(--accent-subtle)' : 'transparent',
                  color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                }}
                onClick={() => {
                  selectFolder(folder.name);
                  setExpandedFolders((s) => ({ ...s, [folder.name]: !isOpen }));
                }}
                onMouseEnter={(e) => {
                  if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent';
                }}
              >
                <span style={{ color: folder.color || 'var(--text-muted)' }}>
                  <Icon size={13} />
                </span>
                <span className="flex-1 truncate font-medium">{folder.name}</span>
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
                <button
                  className="ml-1 rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Удалить папку "${folder.name}" и все её промпты?`)) {
                      deleteFolder(folder.name);
                      pushToast({ type: 'warning', message: `Папка "${folder.name}" удалена` });
                    }
                  }}
                  title="Удалить папку"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <X size={11} />
                </button>
              </div>
            </div>
          );
        })}

        <button
          onClick={openFolderModal}
          className="mt-1 flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-[12px] transition-colors"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <Plus size={12} /> Новая папка
        </button>

        <div className="my-3 h-px" style={{ background: 'var(--border-subtle)' }} />

        {/* Tags */}
        <div className="mb-1.5 flex items-center justify-between px-2.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Теги
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5 px-2.5 pb-3">
          {tags.slice(0, 12).map((t) => (
            <button
              key={t.id}
              onClick={() => {
                usePromtovaStore.getState().toggleTagFilter(t.name);
              }}
              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10.5px] font-mono transition-colors"
              style={{
                background: 'var(--bg-elevated)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-subtle)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-elevated)')}
            >
              <span style={{ color: 'var(--accent-primary)' }}>#</span>{t.name}
              <span style={{ color: 'var(--text-muted)' }}>{t.count}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div
        className="flex items-center justify-between border-t px-2 py-2"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <IconButton title="Настройки" onClick={openSettings}><Settings size={15} /></IconButton>
        <IconButton title="Импорт" onClick={() => fileInputRef.current?.click()}><Upload size={15} /></IconButton>
        <IconButton title="Экспорт" onClick={openExport}><Download size={15} /></IconButton>
        <IconButton title="Горячие клавиши" onClick={openShortcuts}><Keyboard size={15} /></IconButton>
        <input ref={fileInputRef} type="file" accept=".prmt,.json,.md,.txt" className="hidden" onChange={handleImport} />
        <span
          className="ml-1 truncate rounded px-1.5 py-0.5 text-[9px] font-mono"
          style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
          title="Лицензия MIT · © Pavel K. / Neurocode"
        >
          MIT
        </span>
      </div>
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
    className="mb-0.5 flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-[12.5px] transition-colors"
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

// =============== Prompt List ===============
const PromptList = () => {
  const {
    prompts,
    selectedPromptId,
    selectedFolder,
    searchQuery,
    activeTagFilters,
    sortBy,
    setSortBy,
    selectPrompt,
    toggleStar,
    deletePrompt,
  } = usePromtovaStore();
  const { pushToast } = useUIStore();
  const [sortOpen, setSortOpen] = useState(false);

  const filtered = useMemo(() => {
    let res = prompts;
    if (selectedFolder === 'starred') res = res.filter((p) => p.starred);
    else if (selectedFolder !== 'all') res = res.filter((p) => p.folder === selectedFolder);
    if (activeTagFilters.length > 0) {
      res = res.filter((p) => activeTagFilters.every((t) => p.tags.includes(t)));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      res = res.filter(
        (p) =>
          fuzzyMatch(p.title, q) ||
          fuzzyMatch(p.content, q) ||
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
  }, [prompts, selectedFolder, activeTagFilters, searchQuery, sortBy]);

  const folderTitle = selectedFolder === 'all' ? 'Все промпты' : selectedFolder === 'starred' ? 'Избранное' : selectedFolder;

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
          <div className="relative">
            <IconButton title="Сортировка" onClick={() => setSortOpen((v) => !v)}>
              <ArrowUpDown size={14} />
            </IconButton>
            {sortOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setSortOpen(false)} />
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
              </>
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
                  const id = usePromtovaStore.getState().createPrompt();
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
}: {
  prompt: Prompt;
  active: boolean;
  onClick: () => void;
  onStar: () => void;
  onDelete: () => void;
}) => {
  const vars = useMemo(() => extractVariables(prompt.content), [prompt.content]);
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

// =============== Editor ===============
const Editor = () => {
  const {
    selectedPromptId,
    prompts,
    editorMode,
    setEditorMode,
    updatePrompt,
    markSaved,
    setDirty,
    duplicatePrompt,
    deletePrompt,
    toggleStar,
    incrementUsage,
    updateVar,
    addTagToPrompt,
    removeTagFromPrompt,
    isDirty,
    lastSavedAt,
  } = usePromtovaStore();
  const { pushToast } = useUIStore();
  const [tagInput, setTagInput] = useState('');
  const saveTimerRef = useRef<number | null>(null);

  const prompt = prompts.find((p) => p.id === selectedPromptId);

  // Auto-save with debounce
  useEffect(() => {
    if (!isDirty || !prompt) return;
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      markSaved();
    }, 500);
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [isDirty, prompt, markSaved]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!prompt) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        markSaved();
        pushToast({ type: 'success', message: 'Сохранено' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [prompt, markSaved, pushToast]);

  if (!prompt) {
    return (
      <section
        className="flex h-full flex-1 flex-col items-center justify-center"
        style={{ background: 'var(--bg-primary)' }}
      >
        <div
          className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl"
          style={{
            background: 'linear-gradient(135deg, var(--accent-subtle), var(--bg-elevated))',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <Sparkles size={32} style={{ color: 'var(--accent-primary)' }} strokeWidth={2} />
        </div>
        <h3 className="text-[18px] font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Добро пожаловать в Промтовую
        </h3>
        <p className="mt-2 max-w-sm text-center text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
          IDE для промт-инжиниринга. Выберите промпт слева или создайте новый, чтобы начать работу.
        </p>
        <div className="mt-5 flex items-center gap-2">
          <Button
            variant="primary"
            size="md"
            onClick={() => {
              const id = usePromtovaStore.getState().createPrompt();
              usePromtovaStore.getState().selectPrompt(id);
            }}
          >
            <Plus size={14} /> Новый промпт
          </Button>
          <Button
            variant="secondary"
            size="md"
            onClick={() => useUIStore.getState().openShortcuts()}
          >
            <Keyboard size={13} /> Горячие клавиши
          </Button>
        </div>

        {/* Quick tips */}
        <div className="mt-8 grid max-w-lg grid-cols-3 gap-3">
          {[
            { icon: <Zap size={14} />, title: 'Переменные', desc: '{{имя}} подставляются при копировании' },
            { icon: <Hash size={14} />, title: 'Теги', desc: 'Организуйте и фильтруйте базу' },
            { icon: <Palette size={14} />, title: 'Темы', desc: 'Тёмная, светлая и кастомные' },
          ].map((t, i) => (
            <div
              key={i}
              className="rounded-lg border p-3"
              style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}
            >
              <div className="mb-1.5" style={{ color: 'var(--accent-primary)' }}>{t.icon}</div>
              <p className="text-[11.5px] font-semibold" style={{ color: 'var(--text-primary)' }}>{t.title}</p>
              <p className="mt-0.5 text-[10.5px]" style={{ color: 'var(--text-muted)' }}>{t.desc}</p>
            </div>
          ))}
        </div>
      </section>
    );
  }

  const vars = extractVariables(prompt.content);

  const handleContentChange = (newContent: string) => {
    updatePrompt(prompt.id, { content: newContent });
    setDirty(true);
  };

  const handleTitleChange = (newTitle: string) => {
    updatePrompt(prompt.id, { title: newTitle, path: `${prompt.folder}/${newTitle}` });
    setDirty(true);
  };

  const handleCopy = async (withVars: boolean) => {
    const text = withVars ? substituteVariables(prompt.content, prompt.vars) : prompt.content;
    try {
      await navigator.clipboard.writeText(text);
      incrementUsage(prompt.id);
      pushToast({
        type: 'success',
        message: withVars ? 'Скопировано с подстановкой переменных' : 'Скопировано в буфер обмена',
      });
    } catch {
      pushToast({ type: 'error', message: 'Не удалось скопировать' });
    }
  };

  const handleSave = () => {
    markSaved();
    pushToast({ type: 'success', message: 'Сохранено' });
  };

  const handleDelete = () => {
    if (confirm(`Удалить "${prompt.title}"?`)) {
      deletePrompt(prompt.id);
      pushToast({ type: 'warning', message: 'Промпт удалён' });
    }
  };

  return (
    <section className="flex h-full flex-1 flex-col" style={{ background: 'var(--bg-primary)' }}>
      {/* Editor Header */}
      <header
        className="flex items-center justify-between border-b px-6 py-3.5"
        style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-panel)' }}
      >
        <div className="flex min-w-0 flex-1 flex-col">
          {editorMode === 'edit' ? (
            <input
              type="text"
              value={prompt.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="bg-transparent text-[17px] font-semibold outline-none"
              style={{ color: 'var(--text-primary)' }}
              placeholder="Название промпта"
            />
          ) : (
            <h1 className="truncate text-[17px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              {prompt.title}
            </h1>
          )}
          <div className="mt-0.5 flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
            <Folder size={11} />
            <span>{prompt.folder}</span>
            <ChevronRight size={10} />
            <span className="truncate">{prompt.title}</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <IconButton
            title={prompt.starred ? 'Убрать из избранного' : 'В избранное'}
            active={prompt.starred}
            onClick={() => toggleStar(prompt.id)}
          >
            <Star size={15} fill={prompt.starred ? 'currentColor' : 'none'} />
          </IconButton>

          <div
            className="mx-1 h-5 w-px"
            style={{ background: 'var(--border-subtle)' }}
          />

          <div
            className="flex items-center gap-0.5 rounded-md p-0.5"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
          >
            <button
              onClick={() => setEditorMode('view')}
              className="flex items-center gap-1 rounded px-2 py-1 text-[11.5px] font-medium transition-colors"
              style={{
                background: editorMode === 'view' ? 'var(--bg-active)' : 'transparent',
                color: editorMode === 'view' ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
              title="Только просмотр"
            >
              <Eye size={11} />
            </button>
            <button
              onClick={() => setEditorMode('split')}
              className="flex items-center gap-1 rounded px-2 py-1 text-[11.5px] font-medium transition-colors"
              style={{
                background: editorMode === 'split' ? 'var(--bg-active)' : 'transparent',
                color: editorMode === 'split' ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
              title="Разделённый вид"
            >
              <Layers size={11} />
            </button>
            <button
              onClick={() => setEditorMode('edit')}
              className="flex items-center gap-1 rounded px-2 py-1 text-[11.5px] font-medium transition-colors"
              style={{
                background: editorMode === 'edit' ? 'var(--bg-active)' : 'transparent',
                color: editorMode === 'edit' ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
              title="Только редактирование"
            >
              <Pencil size={11} />
            </button>
          </div>

          <div className="mx-1 h-5 w-px" style={{ background: 'var(--border-subtle)' }} />

          <Button variant="secondary" size="sm" onClick={() => { duplicatePrompt(prompt.id); pushToast({ type: 'info', message: 'Создана копия' }); }}>
            <CopyPlus size={13} /> Копия
          </Button>
          <Button variant="secondary" size="sm" onClick={handleSave}>
            <Save size={13} /> Сохранить
          </Button>
          <Button variant="primary" size="sm" onClick={() => handleCopy(false)}>
            <Copy size={13} /> Копировать
          </Button>
          <IconButton title="Удалить" onClick={handleDelete}>
            <Trash2 size={14} />
          </IconButton>
        </div>
      </header>

      {/* Tags row */}
      <div
        className="flex flex-wrap items-center gap-1.5 border-b px-6 py-2.5"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <TagIcon size={12} style={{ color: 'var(--text-muted)' }} />
        {prompt.tags.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-mono"
            style={{
              background: 'var(--accent-subtle)',
              color: 'var(--accent-primary)',
              border: '1px solid rgba(255,107,53,0.25)',
            }}
          >
            #{t}
            <button
              onClick={() => removeTagFromPrompt(prompt.id, t)}
              className="ml-0.5 rounded-sm hover:bg-white/10"
            >
              <X size={10} />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && tagInput.trim()) {
              addTagToPrompt(prompt.id, tagInput);
              setTagInput('');
            }
          }}
          placeholder="Добавить тег..."
          className="rounded-md px-2 py-0.5 text-[11px] outline-none"
          style={{
            background: 'transparent',
            color: 'var(--text-primary)',
            border: '1px dashed var(--border-primary)',
            minWidth: '110px',
          }}
        />
      </div>

      {/* Variables panel */}
      {vars.length > 0 && (
        <div
          className="border-b px-6 py-3"
          style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-panel)' }}
        >
          <div className="mb-2 flex items-center gap-1.5">
            <Zap size={12} style={{ color: 'var(--accent-primary)' }} />
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
              Переменные ({vars.length})
            </span>
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              · подставляются при копировании с ⌘⇧C
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {vars.map((v) => {
              const defined = prompt.vars[v] !== undefined && prompt.vars[v] !== '';
              return (
                <div
                  key={v}
                  className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5"
                  style={{
                    background: 'var(--bg-elevated)',
                    borderColor: defined ? 'var(--border-subtle)' : 'rgba(229, 107, 111, 0.35)',
                  }}
                >
                  <span
                    className="font-mono text-[11px] font-medium"
                    style={{ color: 'var(--accent-primary)' }}
                  >
                    {`{{${v}}}`}
                  </span>
                  <ArrowLeft size={10} style={{ color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    value={prompt.vars[v] || ''}
                    onChange={(e) => updateVar(prompt.id, v, e.target.value)}
                    placeholder="значение…"
                    className="flex-1 bg-transparent text-[11.5px] outline-none"
                    style={{ color: 'var(--text-primary)' }}
                  />
                  {!defined && (
                    <span
                      className="rounded px-1.5 py-0.5 text-[9px] font-mono"
                      style={{ background: 'rgba(229, 107, 111, 0.15)', color: 'var(--status-error)' }}
                    >
                      не заполнено
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Editor body */}
      <div className="flex flex-1 overflow-hidden">
        {editorMode === 'split' ? (
          <>
            <div className="flex-1 overflow-y-auto border-r" style={{ borderColor: 'var(--border-subtle)' }}>
              <textarea
                value={prompt.content}
                onChange={(e) => handleContentChange(e.target.value)}
                spellCheck={false}
                className="editor-textarea h-full w-full resize-none px-6 py-5 outline-none"
                style={{
                  background: 'var(--editor-bg)',
                  color: 'var(--editor-text)',
                  minHeight: '100%',
                }}
              />
            </div>
            <div className="flex-1 overflow-y-auto" style={{ background: 'var(--bg-primary)' }}>
              <div className="px-6 py-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Превью · Markdown
              </div>
              <div
                className="md-body px-6 pb-5"
                style={{ color: 'var(--editor-text)' }}
                dangerouslySetInnerHTML={{ __html: renderMarkdown(substituteVariables(prompt.content, prompt.vars)) }}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {editorMode === 'edit' ? (
              <textarea
                value={prompt.content}
                onChange={(e) => handleContentChange(e.target.value)}
                spellCheck={false}
                className="editor-textarea h-full w-full resize-none px-6 py-5 outline-none"
                style={{
                  background: 'var(--editor-bg)',
                  color: 'var(--editor-text)',
                  minHeight: '100%',
                }}
              />
            ) : (
              <div
                className="md-body h-full px-6 py-5"
                style={{ color: 'var(--editor-text)' }}
                dangerouslySetInnerHTML={{ __html: renderMarkdown(substituteVariables(prompt.content, prompt.vars)) }}
              />
            )}
          </div>
        )}
      </div>

      {/* Editor footer */}
      <footer
        className="flex items-center justify-between border-t px-6 py-2 text-[10.5px]"
        style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-panel)', color: 'var(--text-muted)' }}
      >
        <div className="flex items-center gap-4">
          <span>
            {countWords(prompt.content)} слов · {countChars(prompt.content)} симв.
          </span>
          <span>·</span>
          <span>{vars.length} переменных</span>
          <span>·</span>
          <span>{prompt.usageCount} использований</span>
        </div>
        <div className="flex items-center gap-2">
          {isDirty ? (
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block h-1.5 w-1.5 rounded-full animate-pulse-dot"
                style={{ background: 'var(--status-warning)' }}
              />
              Не сохранено…
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <Check size={11} style={{ color: 'var(--status-success)' }} />
              Сохранено · {lastSavedAt ? formatRelative(lastSavedAt) : ''}
            </span>
          )}
        </div>
      </footer>
    </section>
  );
};

// =============== Modals ===============
const SettingsModal = () => {
  const { settingsOpen, closeSettings, openShortcuts, openThemeEditor } = useUIStore();
  const { currentTheme, setTheme, customThemes, removeCustomTheme } = useThemeStore();
  const { pushToast } = useUIStore();

  const themes = [
    { id: 'dark', name: 'Тёмный графит', icon: <Moon size={14} />, swatch: ['#0B0D10', '#FF6B35', '#F5F7FA'] },
    { id: 'light', name: 'Светлый айс', icon: <Sun size={14} />, swatch: ['#F8F9FA', '#FF6B35', '#111318'] },
    { id: 'warm', name: 'Тёплый янтарь', icon: <Sparkles size={14} />, swatch: ['#1A0F0A', '#FF9B3D', '#FFE9D2'] },
    { id: 'ocean', name: 'Холодный океан', icon: <Sparkles size={14} />, swatch: ['#0A1118', '#3DA8FF', '#E6F1FF'] },
    { id: 'mint', name: 'Мятная свежесть', icon: <Sparkles size={14} />, swatch: ['#0A1410', '#3DC9A8', '#E0F5ED'] },
    { id: 'lavender', name: 'Лавандовый', icon: <Sparkles size={14} />, swatch: ['#120A18', '#B07AFF', '#EFE3FF'] },
    { id: 'mono', name: 'Монохром', icon: <Sparkles size={14} />, swatch: ['#000000', '#FFFFFF', '#FFFFFF'] },
  ];

  return (
    <Modal
      open={settingsOpen}
      onClose={closeSettings}
      title="Настройки"
      width="640px"
      footer={
        <>
          <Button variant="ghost" onClick={openShortcuts}>Горячие клавиши</Button>
          <Button variant="ghost" onClick={openThemeEditor}>Создать тему</Button>
          <Button variant="primary" onClick={closeSettings}>Готово</Button>
        </>
      }
    >
      <div className="space-y-5">
        <section>
          <h3 className="mb-2.5 text-[12px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            Тема оформления
          </h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {themes.map((t) => {
              const active = currentTheme === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setTheme(t.id);
                    applyTheme(t.id, customThemes);
                  }}
                  className="group flex items-center gap-2.5 rounded-lg border p-2.5 text-left transition-all"
                  style={{
                    background: active ? 'var(--accent-subtle)' : 'var(--bg-panel)',
                    borderColor: active ? 'var(--accent-primary)' : 'var(--border-subtle)',
                  }}
                  onMouseEnter={(e) => {
                    if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)';
                  }}
                  onMouseLeave={(e) => {
                    if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--bg-panel)';
                  }}
                >
                  <div className="flex shrink-0 overflow-hidden rounded" style={{ border: '1px solid var(--border-subtle)' }}>
                    {t.swatch.map((c, i) => (
                      <div key={i} className="h-7 w-2" style={{ background: c }} />
                    ))}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>{t.name}</p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{active ? 'Активна' : 'Применить'}</p>
                  </div>
                  {active && <Check size={14} style={{ color: 'var(--accent-primary)' }} />}
                </button>
              );
            })}
          </div>

          {customThemes.length > 0 && (
            <div className="mt-3 space-y-1.5">
              <h4 className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Кастомные темы
              </h4>
              {customThemes.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                  style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-subtle)' }}
                >
                  <div className="flex items-center gap-2">
                    <Palette size={13} style={{ color: 'var(--accent-primary)' }} />
                    <span className="text-[12.5px] font-medium" style={{ color: 'var(--text-primary)' }}>{t.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="secondary" size="sm" onClick={() => { setTheme(t.id); applyTheme(t.id, customThemes); }}>Применить</Button>
                    <IconButton title="Удалить" onClick={() => { removeCustomTheme(t.id); if (currentTheme === t.id) applyTheme('dark', customThemes); }}>
                      <Trash2 size={13} />
                    </IconButton>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h3 className="mb-2.5 text-[12px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            Редактор
          </h3>
          <div className="space-y-2">
            <SettingRow
              icon={<Save size={13} />}
              title="Автосохранение"
              desc="Сохранять изменения каждые 500 мс"
              control={<Toggle defaultChecked />}
            />
            <SettingRow
              icon={<Type size={13} />}
              title="Шрифт редактора"
              desc="JetBrains Mono · 13px"
              control={<span className="font-mono text-[11px]" style={{ color: 'var(--text-muted)' }}>Aa Bb Cc</span>}
            />
            <SettingRow
              icon={<Layers size={13} />}
              title="Формат файлов"
              desc=".prmt (JSON), .md, .txt"
              control={<span className="font-mono text-[11px]" style={{ color: 'var(--text-muted)' }}>.prmt</span>}
            />
          </div>
        </section>

        <section>
          <h3 className="mb-2.5 text-[12px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            Данные
          </h3>
          <div className="space-y-2">
            <SettingRow
              icon={<Download size={13} />}
              title="Расположение"
              desc="~/.promtova/data/"
              control={
                <Button variant="secondary" size="sm" onClick={() => pushToast({ type: 'info', message: 'Открытие папки…' })}>
                  Открыть
                </Button>
              }
            />
            <SettingRow
              icon={<AlertTriangle size={13} />}
              title="Сбросить все данные"
              desc="Удалить все промпты и настройки"
              control={
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    if (confirm('Удалить ВСЕ промпты и сбросить настройки? Это действие необратимо.')) {
                      localStorage.clear();
                      location.reload();
                    }
                  }}
                >
                  Сбросить
                </Button>
              }
            />
          </div>
        </section>

        <section
          className="rounded-md border p-3 text-[11px]"
          style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
        >
          <strong style={{ color: 'var(--text-secondary)' }}>Промтовая</strong> · v1.0.0 · MIT License<br />
          © Pavel K. / Neurocode · {new Date().getFullYear()}
        </section>
      </div>
    </Modal>
  );
};

const SettingRow = ({
  icon,
  title,
  desc,
  control,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  control: React.ReactNode;
}) => (
  <div
    className="flex items-center justify-between gap-3 rounded-md border px-3 py-2.5"
    style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-subtle)' }}
  >
    <div className="flex min-w-0 items-start gap-2.5">
      <div className="mt-0.5 shrink-0" style={{ color: 'var(--accent-primary)' }}>{icon}</div>
      <div className="min-w-0">
        <p className="truncate text-[12.5px] font-medium" style={{ color: 'var(--text-primary)' }}>{title}</p>
        <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{desc}</p>
      </div>
    </div>
    <div className="shrink-0">{control}</div>
  </div>
);

const Toggle = ({ defaultChecked }: { defaultChecked?: boolean }) => {
  const [on, setOn] = useState(!!defaultChecked);
  return (
    <button
      onClick={() => setOn((v) => !v)}
      className="relative h-5 w-9 rounded-full transition-colors"
      style={{
        background: on ? 'var(--accent-primary)' : 'var(--bg-active)',
      }}
    >
      <span
        className="absolute top-0.5 h-4 w-4 rounded-full transition-all"
        style={{
          background: '#fff',
          left: on ? '18px' : '2px',
        }}
      />
    </button>
  );
};

const ExportModal = () => {
  const { exportOpen, closeExport, pushToast } = useUIStore();
  const { prompts, folders } = usePromtovaStore();
  const [scope, setScope] = useState<'all' | 'folder' | 'one'>('all');
  const [folderSel, setFolderSel] = useState(folders[0]?.name || 'Development');
  const selectedPrompt = usePromtovaStore((s) => s.prompts.find((p) => p.id === s.selectedPromptId));

  const handleExport = () => {
    let data;
    if (scope === 'all') data = prompts;
    else if (scope === 'folder') data = prompts.filter((p) => p.folder === folderSel);
    else data = selectedPrompt ? [selectedPrompt] : [];

    const exportObj = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      app: 'Промтовая',
      prompts: data.map((p) => ({
        title: p.title,
        tags: p.tags,
        preview: p.preview,
        path: p.path,
        content: p.content,
        vars: p.vars,
        starred: p.starred,
        folder: p.folder,
      })),
    };

    const filename =
      scope === 'all'
        ? `promtova-all-${new Date().toISOString().slice(0, 10)}.prmt`
        : scope === 'folder'
        ? `promtova-${folderSel}-${new Date().toISOString().slice(0, 10)}.prmt`
        : `${selectedPrompt?.title || 'prompt'}.prmt`;

    downloadFile(filename, JSON.stringify(exportObj, null, 2));
    pushToast({ type: 'success', message: `Экспортировано: ${data.length} промптов` });
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
              desc={`${prompts.filter((p) => p.folder === folderSel).length} шт. из "${folderSel}"`}
            >
              {scope === 'folder' && (
                <select
                  value={folderSel}
                  onChange={(e) => setFolderSel(e.target.value)}
                  className="ml-2 rounded-md border px-2 py-1 text-[11.5px] outline-none"
                  style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', borderColor: 'var(--border-primary)' }}
                >
                  {folders.map((f) => (
                    <option key={f.name} value={f.name}>{f.name}</option>
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
          <strong style={{ color: 'var(--text-secondary)' }}>Формат .prmt</strong> — собственный JSON-формат Промтовой. Содержит метаданные, переменные и связи. Импортируется через боковую панель.
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

const FolderModal = () => {
  const { folderModalOpen, closeFolderModal, pushToast } = useUIStore();
  const { createFolder } = usePromtovaStore();
  const [name, setName] = useState('');

  return (
    <Modal
      open={folderModalOpen}
      onClose={closeFolderModal}
      title="Создать папку"
      width="440px"
      footer={
        <>
          <Button variant="ghost" onClick={closeFolderModal}>Отмена</Button>
          <Button
            variant="primary"
            onClick={() => {
              if (!name.trim()) {
                pushToast({ type: 'warning', message: 'Введите название' });
                return;
              }
              createFolder(name.trim());
              pushToast({ type: 'success', message: `Папка "${name}" создана` });
              setName('');
              closeFolderModal();
            }}
          >
            <Plus size={13} /> Создать
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            Название папки
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && name.trim()) {
                createFolder(name.trim());
                pushToast({ type: 'success', message: `Папка "${name}" создана` });
                setName('');
                closeFolderModal();
              }
            }}
            placeholder="Например, ChatGPT"
            autoFocus
            className="w-full rounded-md border px-3 py-2 text-[13px] outline-none"
            style={{ background: 'var(--bg-panel)', color: 'var(--text-primary)', borderColor: 'var(--border-primary)' }}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            Иконка и цвет
          </label>
          <div className="flex flex-wrap gap-1.5">
            {[
              { icon: <Folder size={14} />, color: '#FF6B35' },
              { icon: <Code2 size={14} />, color: '#4A8EC9' },
              { icon: <Megaphone size={14} />, color: '#FF6B35' },
              { icon: <Zap size={14} />, color: '#35C98A' },
              { icon: <Sparkles size={14} />, color: '#C678DD' },
              { icon: <FileText size={14} />, color: '#D9A441' },
            ].map((opt, i) => (
              <button
                key={i}
                className="flex h-9 w-9 items-center justify-center rounded-md border transition-colors"
                style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-subtle)', color: opt.color }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--bg-panel)')}
              >
                {opt.icon}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
};

const ShortcutsModal = () => {
  const { shortcutsOpen, closeShortcuts } = useUIStore();

  const shortcuts = [
    { keys: ['⌘', 'K'], desc: 'Фокус на поиске' },
    { keys: ['⌘', 'N'], desc: 'Создать новый промпт' },
    { keys: ['⌘', 'S'], desc: 'Сохранить' },
    { keys: ['⌘', 'C'], desc: 'Копировать промпт' },
    { keys: ['⌘', '⇧', 'C'], desc: 'Копировать с подстановкой переменных' },
    { keys: ['⌘', 'F'], desc: 'Фокус на поиске' },
    { keys: ['Esc'], desc: 'Закрыть модальное окно' },
    { keys: ['F2'], desc: 'Переименовать' },
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

const ThemeEditorModal = () => {
  const { themeEditorOpen, closeThemeEditor, pushToast } = useUIStore();
  const { addCustomTheme, customThemes } = useThemeStore();
  const [name, setName] = useState('Моя тема');
  const [colors, setColors] = useState<Record<string, string>>({
    'bg-primary': '#0B0D10',
    'bg-sidebar': '#0E1014',
    'bg-panel': '#111419',
    'bg-elevated': '#15181E',
    'bg-hover': '#191D23',
    'bg-active': '#1C2027',
    'accent-primary': '#FF6B35',
    'accent-hover': '#FF7847',
    'accent-subtle': '#3D2518',
    'text-primary': '#F5F7FA',
    'text-secondary': '#A7ADB7',
    'text-muted': '#737A86',
    'border-primary': '#242932',
    'border-subtle': '#1B1F26',
  });

  useEffect(() => {
    if (!themeEditorOpen) return;
    // preview: keep current built-in dark as base; live color edits applied via inline styles
  }, [themeEditorOpen]);

  const colorFields: Array<{ key: string; label: string; group: string }> = [
    { key: 'bg-primary', label: 'Основной фон', group: 'Базовые' },
    { key: 'bg-sidebar', label: 'Sidebar', group: 'Базовые' },
    { key: 'bg-panel', label: 'Панель', group: 'Базовые' },
    { key: 'bg-elevated', label: 'Elevated', group: 'Базовые' },
    { key: 'bg-hover', label: 'Hover', group: 'Базовые' },
    { key: 'bg-active', label: 'Active', group: 'Базовые' },
    { key: 'text-primary', label: 'Основной текст', group: 'Текст' },
    { key: 'text-secondary', label: 'Второстепенный', group: 'Текст' },
    { key: 'text-muted', label: 'Приглушённый', group: 'Текст' },
    { key: 'accent-primary', label: 'Основной акцент', group: 'Акценты' },
    { key: 'accent-hover', label: 'Акцент hover', group: 'Акценты' },
    { key: 'accent-subtle', label: 'Акцент subtle', group: 'Акценты' },
    { key: 'border-primary', label: 'Граница', group: 'Границы' },
    { key: 'border-subtle', label: 'Тонкая граница', group: 'Границы' },
  ];

  const groups = Array.from(new Set(colorFields.map((f) => f.group)));

  return (
    <Modal
      open={themeEditorOpen}
      onClose={closeThemeEditor}
      title="Редактор темы"
      width="640px"
      footer={
        <>
          <Button variant="ghost" onClick={closeThemeEditor}>Отмена</Button>
          <Button
            variant="primary"
            onClick={() => {
              const id = `custom-${Date.now()}`;
              const theme: CustomTheme = { id, name: name.trim() || 'Без названия', isCustom: true, colors };
              addCustomTheme(theme);
              applyTheme(id, [...customThemes, theme]);
              pushToast({ type: 'success', message: 'Тема создана' });
              closeThemeEditor();
            }}
          >
            <Check size={13} /> Сохранить
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            Название темы
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-[13px] outline-none"
            style={{ background: 'var(--bg-panel)', color: 'var(--text-primary)', borderColor: 'var(--border-primary)' }}
          />
        </div>

        {groups.map((g) => (
          <div key={g}>
            <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              {g}
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {colorFields
                .filter((f) => f.group === g)
                .map((f) => (
                  <div key={f.key} className="flex items-center gap-2 rounded-md border px-2.5 py-1.5" style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-subtle)' }}>
                    <input
                      type="color"
                      value={colors[f.key]}
                      onChange={(e) => {
                        const newColors = { ...colors, [f.key]: e.target.value };
                        setColors(newColors);
                        // Live preview
                        const root = document.documentElement;
                        root.style.setProperty(`--${f.key}`, e.target.value);
                      }}
                      className="h-6 w-6 cursor-pointer rounded border-0"
                      style={{ background: 'transparent' }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-[11.5px] font-medium" style={{ color: 'var(--text-primary)' }}>{f.label}</p>
                      <input
                        type="text"
                        value={colors[f.key]}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) {
                            setColors({ ...colors, [f.key]: v });
                            document.documentElement.style.setProperty(`--${f.key}`, v);
                          }
                        }}
                        className="w-full bg-transparent font-mono text-[10px] outline-none"
                        style={{ color: 'var(--text-muted)' }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
};

// =============== App ===============
export default function App() {
  const { currentTheme, customThemes } = useThemeStore();
  const { selectPrompt, selectedPromptId } = usePromtovaStore();

  // Apply theme
  useEffect(() => {
    applyTheme(currentTheme, customThemes);
  }, [currentTheme, customThemes]);

  // Auto-select first prompt on load
  useEffect(() => {
    if (selectedPromptId === null) {
      const first = usePromtovaStore.getState().prompts[0];
      if (first) selectPrompt(first.id);
    }
  }, [selectedPromptId, selectPrompt]);

  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      <Sidebar />
      <PromptList />
      <Editor />
      <SettingsModal />
      <ExportModal />
      <FolderModal />
      <ShortcutsModal />
      <ThemeEditorModal />
      <ToastStack />
    </div>
  );
}
