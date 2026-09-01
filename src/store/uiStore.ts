import { create } from 'zustand';
import type { PromptId } from '../shared/types';
import type { ParsedImport } from '../utils/importExport';

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
  folderModalParentId: string | null;
  renameFolderId: string | null;
  renamePromptId: PromptId | null;
  deleteFolderId: string | null;
  mergeImport: ParsedImport | null;
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
  pushToast: (toast: Omit<Toast, 'id'>) => void;
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
  pushToast: (toast) => {
    const id = ++toastCounter;
    set((state) => ({ toasts: [...state.toasts, { id, ...toast }] }));
    globalThis.setTimeout(() => set((state) => ({ toasts: state.toasts.filter((item) => item.id !== id) })), 3200);
  },
  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((item) => item.id !== id) })),
}));
