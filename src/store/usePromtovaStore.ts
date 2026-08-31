import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  CustomTheme,
  EditorMode,
  Folder,
  Prompt,
  PromptId,
  SortKey,
  Tag,
} from '../shared/types';
import { seedFolders, seedPrompts } from './seedData';
import { nativeStorage } from '../storage/nativeStorage';
import { extractVariables, getPromptText, newId } from '../utils/promtova';
import { getDescendantIds, getSiblings, normalizeFolders } from '../utils/folders';
import {
  applyMerge,
  normalizeFolder,
  normalizePrompt,
  type MergeConflict,
  type ParsedImport,
} from '../utils/importExport';

export type { CustomTheme };

const recomputeTags = (prompts: Prompt[]): Tag[] => {
  const map = new Map<string, number>();
  prompts.forEach((p) => {
    p.tags.forEach((t) => map.set(t, (map.get(t) || 0) + 1));
  });
  return Array.from(map.entries())
    .map(([name, count]) => ({ id: name.toLowerCase(), name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ru'));
};

const makePreview = (text: string) =>
  text.replace(/[#*`>_\-[\]]/g, '').replace(/\s+/g, ' ').trim().slice(0, 120);

export interface CreateFolderOptions {
  parent?: string | null;
  icon?: string;
  color?: string;
}

/** Переупорядочивает сиблингов и перенумеровывает `order` (идемпотентно). */
const reorderSiblings = (
  folders: Folder[],
  parent: string | null,
  from: number,
  to: number,
): Folder[] => {
  const sibs = getSiblings(folders, parent);
  if (from < 0 || from >= sibs.length) return folders;
  if (to < 0 || to >= sibs.length) return folders;
  const arr = [...sibs];
  const [moved] = arr.splice(from, 1);
  arr.splice(to, 0, moved);
  const orderById = new Map(arr.map((f, i) => [f.id, i]));
  return folders.map((f) => (orderById.has(f.id) ? { ...f, order: orderById.get(f.id)! } : f));
};

interface PromtovaState {
  prompts: Prompt[];
  folders: Folder[];
  tags: Tag[];
  selectedPromptId: PromptId | null;
  selectedFolderId: string; // 'all' | 'starred' | id папки
  searchQuery: string;
  activeTagFilters: string[];
  editorMode: EditorMode;
  sortBy: SortKey;
  isDirty: boolean;
  lastSavedAt: string | null;

  // Настройки редактора (§8.3)
  autosave: boolean;
  editorFontSize: number;

  // CRUD промптов
  selectPrompt: (id: PromptId | null) => void;
  createPrompt: (folder?: string) => PromptId;
  updatePrompt: (id: PromptId, patch: Partial<Prompt>) => void;
  deletePrompt: (id: PromptId) => void;
  duplicatePrompt: (id: PromptId) => void;
  renamePrompt: (id: PromptId, title: string) => void;
  toggleStar: (id: PromptId) => void;
  incrementUsage: (id: PromptId) => void;

  // Переменные (§4.2)
  setVar: (id: PromptId, key: string, value: string) => void;
  pruneVars: (id: PromptId) => void;

  // Папки (§3)
  selectFolder: (folderId: string) => void;
  createFolder: (name: string, opts?: CreateFolderOptions) => void;
  renameFolder: (id: string, newName: string) => void;
  deleteFolder: (id: string) => void;
  moveFolderUp: (id: string) => void;
  moveFolderDown: (id: string) => void;
  updateFolderStyle: (id: string, patch: { icon?: string; color?: string }) => void;
  countFolderPrompts: (id: string) => number;

  // Импорт (§5)
  applyImport: (
    incoming: Prompt[],
    conflicts: MergeConflict[],
    incomingFolders: Folder[],
  ) => { foldersCreated: number; imported: number; skipped: number; replaced: number };

  // Теги
  toggleTagFilter: (tag: string) => void;
  clearTagFilters: () => void;
  addTagToPrompt: (id: PromptId, tag: string) => void;
  removeTagFromPrompt: (id: PromptId, tag: string) => void;

  // UI
  setSearchQuery: (q: string) => void;
  setEditorMode: (m: EditorMode) => void;
  setSortBy: (s: SortKey) => void;
  setDirty: (d: boolean) => void;
  markSaved: () => void;
  setAutosave: (v: boolean) => void;
  setEditorFontSize: (v: number) => void;
}

export const usePromtovaStore = create<PromtovaState>()(
  persist(
    (set, get) => ({
      prompts: seedPrompts,
      folders: normalizeFolders(seedFolders),
      tags: recomputeTags(seedPrompts),
      selectedPromptId: 'seed-1',
      selectedFolderId: 'all',
      searchQuery: '',
      activeTagFilters: [],
      editorMode: 'edit',
      sortBy: 'updated',
      isDirty: false,
      lastSavedAt: new Date().toISOString(),
      autosave: true,
      editorFontSize: 13,

      selectPrompt: (id) => set({ selectedPromptId: id, isDirty: false }),

      createPrompt: (folder = 'Development') => {
        const id = newId();
        const now = new Date().toISOString();
        const newPrompt: Prompt = {
          id,
          title: 'Новый промпт',
          tags: [],
          preview: '',
          path: `${folder}/Новый промпт`,
          content:
            '# Новый промпт\n\nОпишите здесь ваш промпт…\n\nИспользуйте переменные в формате {{имя_переменной}} для подстановки.\n',
          vars: {},
          starred: false,
          folder,
          createdAt: now,
          updatedAt: now,
          usageCount: 0,
        };
        set((s) => ({ prompts: [newPrompt, ...s.prompts], selectedPromptId: id, isDirty: false }));
        return id;
      },

      updatePrompt: (id, patch) => {
        set((s) => {
          const prompts = s.prompts.map((p) => {
            if (p.id !== id) return p;
            const next = { ...p, ...patch, updatedAt: new Date().toISOString() };
            // превью считаем по объединённому тексту (шаблонный режим — §4.1)
            if (
              patch.content !== undefined ||
              patch.system !== undefined ||
              patch.context !== undefined ||
              patch.output !== undefined ||
              patch.useTemplate !== undefined
            ) {
              next.preview = makePreview(getPromptText(next));
            }
            return next;
          });
          return { prompts, tags: recomputeTags(prompts) };
        });
      },

      deletePrompt: (id) => {
        set((s) => {
          const prompts = s.prompts.filter((p) => p.id !== id);
          const wasSelected = s.selectedPromptId === id;
          return {
            prompts,
            tags: recomputeTags(prompts),
            selectedPromptId: wasSelected ? (prompts[0]?.id ?? null) : s.selectedPromptId,
          };
        });
      },

      duplicatePrompt: (id) => {
        const src = get().prompts.find((p) => p.id === id);
        if (!src) return;
        const newIdValue = newId();
        const now = new Date().toISOString();
        const copy: Prompt = {
          ...src,
          id: newIdValue,
          title: `${src.title} (копия)`,
          path: `${src.path} (копия)`,
          starred: false,
          usageCount: 0,
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ prompts: [copy, ...s.prompts], selectedPromptId: newIdValue }));
      },

      renamePrompt: (id, title) => {
        const clean = title.trim();
        if (!clean) return;
        set((s) => ({
          prompts: s.prompts.map((p) =>
            p.id === id
              ? {
                  ...p,
                  title: clean,
                  path: p.path.includes('/') ? `${p.path.split('/')[0]}/${clean}` : clean,
                  updatedAt: new Date().toISOString(),
                }
              : p,
          ),
        }));
      },

      toggleStar: (id) => {
        set((s) => ({
          prompts: s.prompts.map((p) => (p.id === id ? { ...p, starred: !p.starred } : p)),
        }));
      },

      incrementUsage: (id) => {
        set((s) => ({
          prompts: s.prompts.map((p) => (p.id === id ? { ...p, usageCount: p.usageCount + 1 } : p)),
        }));
      },

      setVar: (id, key, value) => {
        set((s) => ({
          prompts: s.prompts.map((p) =>
            p.id === id
              ? { ...p, vars: { ...p.vars, [key]: value }, updatedAt: new Date().toISOString() }
              : p,
          ),
        }));
      },

      /** Удаляет значения переменных, которых больше нет в тексте промпта (§4.2). */
      pruneVars: (id) => {
        set((s) => ({
          prompts: s.prompts.map((p) => {
            if (p.id !== id) return p;
            const used = new Set(extractVariables(getPromptText(p)));
            const vars: Record<string, string> = {};
            Object.entries(p.vars).forEach(([k, v]) => {
              if (used.has(k)) vars[k] = v;
            });
            return { ...p, vars };
          }),
        }));
      },

      // ============ Папки ============

      selectFolder: (folderId) => set({ selectedFolderId: folderId, activeTagFilters: [] }),

      createFolder: (name, opts = {}) => {
        const clean = name.trim();
        if (!clean) return;
        const s = get();
        const parent = opts.parent ?? null;
        // запрещаем дубли имени внутри одной группы
        if (s.folders.some((f) => f.name === clean && (f.parent ?? null) === parent)) return;

        const folder: Folder = {
          id: newId(),
          name: clean,
          parent,
          children: [],
          icon: opts.icon ?? 'Folder',
          color: opts.color ?? '#FF6B35',
          order: getSiblings(s.folders, parent).length,
        };
        // parent/children хранят id — каскад не требуется (§3.1/§3.6)
        const withChild = parent
          ? s.folders.map((f) =>
              f.id === parent ? { ...f, children: [...f.children, folder.id] } : f,
            )
          : s.folders;
        set({ folders: normalizeFolders([...withChild, folder]) });
      },

      renameFolder: (id, newName) => {
        const clean = newName.trim();
        if (!clean) return;
        const s = get();
        const target = s.folders.find((f) => f.id === id);
        if (!target || target.name === clean) return;
        const prompts = s.prompts.map((p) =>
          p.folder === target.name
            ? {
                ...p,
                folder: clean,
                path: p.path.startsWith(target.name) ? p.path.replace(target.name, clean) : p.path,
              }
            : p,
        );
        set({
          prompts,
          tags: recomputeTags(prompts),
          folders: s.folders.map((f) => (f.id === id ? { ...f, name: clean } : f)),
        });
      },

      deleteFolder: (id) => {
        const s = get();
        if (!s.folders.some((f) => f.id === id)) return;
        // каскад по поддереву (§3.1)
        const removedIds = new Set([id, ...getDescendantIds(s.folders, id)]);
        const removedNames = new Set(
          s.folders.filter((f) => removedIds.has(f.id)).map((f) => f.name),
        );
        const prompts = s.prompts.filter((p) => !removedNames.has(p.folder));
        const folders = normalizeFolders(
          s.folders
            .filter((f) => !removedIds.has(f.id))
            .map((f) => ({ ...f, children: f.children.filter((c) => !removedIds.has(c)) })),
        );
        set({
          prompts,
          folders,
          tags: recomputeTags(prompts),
          selectedFolderId: removedIds.has(s.selectedFolderId) ? 'all' : s.selectedFolderId,
        });
      },

      moveFolderUp: (id) => {
        set((s) => {
          const target = s.folders.find((f) => f.id === id);
          if (!target) return s;
          const sibs = getSiblings(s.folders, target.parent ?? null);
          const idx = sibs.findIndex((f) => f.id === id);
          if (idx <= 0) return s;
          return { folders: reorderSiblings(s.folders, target.parent ?? null, idx, idx - 1) };
        });
      },

      moveFolderDown: (id) => {
        set((s) => {
          const target = s.folders.find((f) => f.id === id);
          if (!target) return s;
          const sibs = getSiblings(s.folders, target.parent ?? null);
          const idx = sibs.findIndex((f) => f.id === id);
          if (idx < 0 || idx >= sibs.length - 1) return s;
          return { folders: reorderSiblings(s.folders, target.parent ?? null, idx, idx + 1) };
        });
      },

      updateFolderStyle: (id, patch) => {
        set((s) => ({
          folders: s.folders.map((f) => (f.id === id ? { ...f, ...patch } : f)),
        }));
      },

      countFolderPrompts: (id) => {
        const s = get();
        const ids = new Set([id, ...getDescendantIds(s.folders, id)]);
        const names = new Set(s.folders.filter((f) => ids.has(f.id)).map((f) => f.name));
        return s.prompts.filter((p) => names.has(p.folder)).length;
      },

      // ============ Импорт (§5) ============

      applyImport: (incoming, conflicts, incomingFolders) => {
        const s = get();
        const merged = applyMerge(s.prompts, incoming, conflicts);

        // папки: создаём отсутствующие (§5.2)
        const existingNames = new Set(s.folders.map((f) => f.name));
        const toCreate = incomingFolders.filter((f) => !existingNames.has(f.name));
        let folders = s.folders;
        if (toCreate.length) {
          let nextOrder = getSiblings(s.folders, null).length;
          folders = normalizeFolders([
            ...s.folders,
            ...toCreate.map((f) => ({
              ...f,
              id: f.id && !s.folders.some((x) => x.id === f.id) ? f.id : newId(),
              parent: null as string | null,
              children: [] as string[],
              order: nextOrder++,
            })),
          ]);
        }

        set({ prompts: merged.prompts, folders, tags: recomputeTags(merged.prompts) });
        return {
          foldersCreated: toCreate.length,
          imported: merged.imported,
          skipped: merged.skipped,
          replaced: merged.replaced,
        };
      },

      // ============ Теги ============

      toggleTagFilter: (tag) => {
        set((s) => ({
          activeTagFilters: s.activeTagFilters.includes(tag)
            ? s.activeTagFilters.filter((t) => t !== tag)
            : [...s.activeTagFilters, tag],
        }));
      },

      clearTagFilters: () => set({ activeTagFilters: [] }),

      addTagToPrompt: (id, tag) => {
        const clean = tag.replace(/^#/, '').trim();
        if (!clean) return;
        set((s) => {
          const prompts = s.prompts.map((p) =>
            p.id === id && !p.tags.includes(clean) ? { ...p, tags: [...p.tags, clean] } : p,
          );
          return { prompts, tags: recomputeTags(prompts) };
        });
      },

      removeTagFromPrompt: (id, tag) => {
        set((s) => {
          const prompts = s.prompts.map((p) =>
            p.id === id ? { ...p, tags: p.tags.filter((t) => t !== tag) } : p,
          );
          return { prompts, tags: recomputeTags(prompts) };
        });
      },

      // ============ UI ============

      setSearchQuery: (q) => set({ searchQuery: q }),
      setEditorMode: (m) => set({ editorMode: m }),
      setSortBy: (s) => set({ sortBy: s }),
      setDirty: (d) => set({ isDirty: d }),
      markSaved: () => set({ isDirty: false, lastSavedAt: new Date().toISOString() }),
      setAutosave: (v) => set({ autosave: v }),
      setEditorFontSize: (v) =>
        set({ editorFontSize: Math.min(20, Math.max(10, Math.round(v))) }),
    }),
    {
      name: 'promtova-state',
      version: 2,
      // Нативное хранилище (Electron → файл на диске; веб/тесты → in-memory) (§2.1)
      storage: createJSONStorage(() => nativeStorage),
      partialize: (s) => ({
        prompts: s.prompts,
        folders: s.folders,
        selectedFolderId: s.selectedFolderId,
        editorMode: s.editorMode,
        sortBy: s.sortBy,
        autosave: s.autosave,
        editorFontSize: s.editorFontSize,
      }),
      /** Миграция данных старых версий: числовые id -> строки, названия папок -> id (§3.6, §4.3). */
      migrate: (persisted, version) => {
        const p = (persisted ?? {}) as Record<string, unknown>;
        const prompts = (Array.isArray(p.prompts) ? p.prompts : [])
          .map((x) => normalizePrompt(x))
          .filter((x): x is Prompt => x !== null);
        const folders = normalizeFolders(
          (Array.isArray(p.folders) ? p.folders : [])
            .map(normalizeFolder)
            .filter((x): x is Folder => x !== null),
        );

        // v1 хранил в selectedFolder НАЗВАНИЕ папки — переводим в id
        let selectedFolderId = typeof p.selectedFolder === 'string' ? p.selectedFolder : 'all';
        if (version < 2 && selectedFolderId !== 'all' && selectedFolderId !== 'starred') {
          selectedFolderId = folders.find((f) => f.name === selectedFolderId)?.id ?? 'all';
        }

        return {
          prompts: prompts.length ? prompts : seedPrompts,
          folders: folders.length ? folders : normalizeFolders(seedFolders),
          selectedFolderId,
          editorMode: (p.editorMode as EditorMode) ?? 'edit',
          sortBy: (p.sortBy as SortKey) ?? 'updated',
          autosave: p.autosave !== false,
          editorFontSize:
            typeof p.editorFontSize === 'number'
              ? Math.min(20, Math.max(10, p.editorFontSize))
              : 13,
        };
      },
      /** Теги — производные, пересчитываем после гидрации. */
      merge: (persisted, current) => {
        const merged = { ...current, ...(persisted as Partial<PromtovaState>) };
        merged.tags = recomputeTags(merged.prompts ?? []);
        return merged;
      },
    },
  ),
);

// ============= THEME STORE =============
interface ThemeState {
  currentTheme: string;
  customThemes: CustomTheme[];
  setTheme: (id: string) => void;
  addCustomTheme: (theme: CustomTheme) => void;
  removeCustomTheme: (id: string) => void;
}

const presetThemes = {
  warm: {
    'bg-primary': '#1A0F0A',
    'bg-sidebar': '#1F1308',
    'bg-panel': '#241708',
    'bg-elevated': '#2A1B0C',
    'bg-hover': '#2F1F10',
    'bg-active': '#352414',
    'accent-primary': '#FF9B3D',
    'accent-hover': '#FFAB55',
    'accent-subtle': '#3D2518',
    'text-primary': '#FFE9D2',
    'text-secondary': '#C9A88A',
    'text-muted': '#8A6E58',
    'border-primary': '#3D2A1A',
    'border-subtle': '#2A1B0C',
  },
  ocean: {
    'bg-primary': '#0A1118',
    'bg-sidebar': '#0C141E',
    'bg-panel': '#0F1825',
    'bg-elevated': '#131D2C',
    'bg-hover': '#172233',
    'bg-active': '#1B2739',
    'accent-primary': '#3DA8FF',
    'accent-hover': '#5BB7FF',
    'accent-subtle': '#10243A',
    'text-primary': '#E6F1FF',
    'text-secondary': '#A7BBD0',
    'text-muted': '#6B82A0',
    'border-primary': '#1F2C3F',
    'border-subtle': '#15202E',
  },
  mint: {
    'bg-primary': '#0A1410',
    'bg-sidebar': '#0C1814',
    'bg-panel': '#0F1E18',
    'bg-elevated': '#13261F',
    'bg-hover': '#172D26',
    'bg-active': '#1B352D',
    'accent-primary': '#3DC9A8',
    'accent-hover': '#52D8B8',
    'accent-subtle': '#0F2A22',
    'text-primary': '#E0F5ED',
    'text-secondary': '#A0C7BA',
    'text-muted': '#688A7D',
    'border-primary': '#1E3A30',
    'border-subtle': '#142822',
  },
  lavender: {
    'bg-primary': '#120A18',
    'bg-sidebar': '#160C1E',
    'bg-panel': '#1A0F25',
    'bg-elevated': '#1F132D',
    'bg-hover': '#241736',
    'bg-active': '#291B3F',
    'accent-primary': '#B07AFF',
    'accent-hover': '#C094FF',
    'accent-subtle': '#241636',
    'text-primary': '#EFE3FF',
    'text-secondary': '#B8A5D4',
    'text-muted': '#7C6A95',
    'border-primary': '#2D1F3F',
    'border-subtle': '#1F142A',
  },
  mono: {
    'bg-primary': '#000000',
    'bg-sidebar': '#0A0A0A',
    'bg-panel': '#111111',
    'bg-elevated': '#1A1A1A',
    'bg-hover': '#222222',
    'bg-active': '#2A2A2A',
    'accent-primary': '#FFFFFF',
    'accent-hover': '#E5E5E5',
    'accent-subtle': '#1A1A1A',
    'text-primary': '#FFFFFF',
    'text-secondary': '#B0B0B0',
    'text-muted': '#707070',
    'border-primary': '#2A2A2A',
    'border-subtle': '#1A1A1A',
  },
};

export const applyTheme = (themeId: string, customThemes: CustomTheme[] = []) => {
  const root = document.documentElement;
  root.setAttribute('data-theme', themeId);

  if (themeId.startsWith('custom-')) {
    const theme = customThemes.find((t) => t.id === themeId);
    if (theme) {
      Object.entries(theme.colors).forEach(([k, v]) => {
        root.style.setProperty(`--${k}`, v);
      });
    }
  } else if (Object.prototype.hasOwnProperty.call(presetThemes, themeId)) {
    const preset = (presetThemes as Record<string, Record<string, string>>)[themeId];
    Object.entries(preset).forEach(([k, v]) => {
      root.style.setProperty(`--${k}`, v);
    });
  } else {
    // Для встроенных тёмной/светлой тем убираем инлайн-переопределения
    const allVars = [
      'bg-primary', 'bg-sidebar', 'bg-panel', 'bg-elevated', 'bg-hover', 'bg-active',
      'accent-primary', 'accent-hover', 'accent-subtle',
      'text-primary', 'text-secondary', 'text-muted',
      'border-primary', 'border-subtle',
    ];
    allVars.forEach((v) => root.style.removeProperty(`--${v}`));
  }
};

export const presetThemeIds = ['dark', 'light', 'warm', 'ocean', 'mint', 'lavender', 'mono'];

// ============= UI STORE (modals, toasts) =============
export interface Toast {
  id: number;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

interface UIState {
  settingsOpen: boolean;
  exportOpen: boolean;
  folderModalOpen: boolean;
  tagModalOpen: boolean;
  themeEditorOpen: boolean;
  shortcutsOpen: boolean;

  // целевые объекты для новых модалов
  folderModalParentId: string | null; // предвыбранный родитель (§3.3)
  renameFolderId: string | null; // §3.5
  renamePromptId: PromptId | null; // §7.3
  deleteFolderId: string | null; // §8.6
  mergeImport: ParsedImport | null; // §5.1

  toasts: Toast[];

  openSettings: () => void;
  closeSettings: () => void;
  openExport: () => void;
  closeExport: () => void;
  openFolderModal: (parentId?: string | null) => void;
  closeFolderModal: () => void;
  openTagModal: () => void;
  closeTagModal: () => void;
  openThemeEditor: () => void;
  closeThemeEditor: () => void;
  openShortcuts: () => void;
  closeShortcuts: () => void;
  openRenameFolder: (id: string) => void;
  closeRenameFolder: () => void;
  openRenamePrompt: (id: PromptId) => void;
  closeRenamePrompt: () => void;
  openDeleteFolder: (id: string) => void;
  closeDeleteFolder: () => void;
  openMerge: (data: ParsedImport) => void;
  closeMerge: () => void;

  pushToast: (t: Omit<Toast, 'id'>) => void;
  dismissToast: (id: number) => void;
}

let toastCounter = 0;

export const useUIStore = create<UIState>((set) => ({
  settingsOpen: false,
  exportOpen: false,
  folderModalOpen: false,
  tagModalOpen: false,
  themeEditorOpen: false,
  shortcutsOpen: false,
  folderModalParentId: null,
  renameFolderId: null,
  renamePromptId: null,
  deleteFolderId: null,
  mergeImport: null,
  toasts: [],

  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),
  openExport: () => set({ exportOpen: true }),
  closeExport: () => set({ exportOpen: false }),
  openFolderModal: (parentId = null) => set({ folderModalOpen: true, folderModalParentId: parentId }),
  closeFolderModal: () => set({ folderModalOpen: false, folderModalParentId: null }),
  openTagModal: () => set({ tagModalOpen: true }),
  closeTagModal: () => set({ tagModalOpen: false }),
  openThemeEditor: () => set({ themeEditorOpen: true }),
  closeThemeEditor: () => set({ themeEditorOpen: false }),
  openShortcuts: () => set({ shortcutsOpen: true }),
  closeShortcuts: () => set({ shortcutsOpen: false }),
  openRenameFolder: (id) => set({ renameFolderId: id }),
  closeRenameFolder: () => set({ renameFolderId: null }),
  openRenamePrompt: (id) => set({ renamePromptId: id }),
  closeRenamePrompt: () => set({ renamePromptId: null }),
  openDeleteFolder: (id) => set({ deleteFolderId: id }),
  closeDeleteFolder: () => set({ deleteFolderId: null }),
  openMerge: (data) => set({ mergeImport: data }),
  closeMerge: () => set({ mergeImport: null }),

  pushToast: (t) => {
    const id = ++toastCounter;
    set((s) => ({ toasts: [...s.toasts, { id, ...t }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) }));
    }, 3200);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}));

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      currentTheme: 'dark',
      customThemes: [],
      setTheme: (id) => set({ currentTheme: id }),
      addCustomTheme: (theme) => set((s) => ({ customThemes: [...s.customThemes, theme] })),
      removeCustomTheme: (id) =>
        set((s) => ({
          customThemes: s.customThemes.filter((t) => t.id !== id),
          currentTheme: s.currentTheme === id ? 'dark' : s.currentTheme,
        })),
    }),
    {
      name: 'promtova-theme',
      // Нативное хранилище (Electron → файл на диске; веб/тесты → in-memory) (§2.1)
      storage: createJSONStorage(() => nativeStorage),
    },
  ),
);
