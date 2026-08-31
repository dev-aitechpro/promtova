// Глобальные горячие клавиши (§8.1). Регистрируются один раз в App.
import { useEffect } from 'react';
import { usePromtovaStore, useUIStore } from '../store/usePromtovaStore';
import { copyToClipboard, promptTextForCopy } from '../utils/copy';
import { folderNameById } from '../utils/folders';

export const FOCUS_SEARCH_EVENT = 'promtova:focus-search';
export const CLOSE_MENUS_EVENT = 'promtova:close-menus';

export const focusSearch = () => window.dispatchEvent(new Event(FOCUS_SEARCH_EVENT));
export const closeMenus = () => window.dispatchEvent(new Event(CLOSE_MENUS_EVENT));

const isEditable = (el: EventTarget | null): boolean => {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
};

/** Закрывает самую «верхнюю» открытую модалку. */
const closeTopModal = () => {
  const ui = useUIStore.getState();
  if (ui.mergeImport) return ui.closeMerge();
  if (ui.renameFolderId) return ui.closeRenameFolder();
  if (ui.renamePromptId) return ui.closeRenamePrompt();
  if (ui.deleteFolderId) return ui.closeDeleteFolder();
  if (ui.folderModalOpen) return ui.closeFolderModal();
  if (ui.tagModalOpen) return ui.closeTagModal();
  if (ui.exportOpen) return ui.closeExport();
  if (ui.settingsOpen) return ui.closeSettings();
  if (ui.shortcutsOpen) return ui.closeShortcuts();
  if (ui.themeEditorOpen) return ui.closeThemeEditor();
};

export const useGlobalHotkeys = () => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      // Esc — закрыть контекстные меню и верхнюю модалку
      if (e.key === 'Escape') {
        closeMenus();
        closeTopModal();
        return;
      }

      // F2 — переименовать выбранный промпт
      if (e.key === 'F2') {
        const { selectedPromptId } = usePromtovaStore.getState();
        if (selectedPromptId) {
          e.preventDefault();
          useUIStore.getState().openRenamePrompt(selectedPromptId);
        }
        return;
      }

      if (!mod) return;

      // ⌘K / ⌘F — фокус на поиске
      if (key === 'k' || key === 'f') {
        e.preventDefault();
        focusSearch();
        return;
      }

      // ⌘N — новый промпт
      if (key === 'n') {
        e.preventDefault();
        const s = usePromtovaStore.getState();
        const target =
          s.selectedFolderId === 'all' || s.selectedFolderId === 'starred'
            ? 'Development'
            : folderNameById(s.folders, s.selectedFolderId) ?? 'Development';
        const id = s.createPrompt(target);
        s.selectPrompt(id);
        useUIStore.getState().pushToast({ type: 'success', message: 'Создан новый промпт' });
        return;
      }

      // ⌘S — сохранить
      if (key === 's') {
        e.preventDefault();
        usePromtovaStore.getState().markSaved();
        useUIStore.getState().pushToast({ type: 'success', message: 'Сохранено' });
        return;
      }

      // ⌘C / ⌘⇧C — копировать без/с подстановкой переменных (§7.2)
      if (key === 'c') {
        if (isEditable(e.target)) return; // не мешаем нативному копированию из полей
        e.preventDefault();
        const s = usePromtovaStore.getState();
        const p = s.prompts.find((x) => x.id === s.selectedPromptId);
        if (!p) return;
        const substitute = e.shiftKey;
        void copyToClipboard(promptTextForCopy(p, substitute)).then((ok) => {
          s.incrementUsage(p.id);
          useUIStore.getState().pushToast({
            type: ok ? 'success' : 'error',
            message: ok
              ? substitute
                ? 'Скопировано с подстановкой переменных'
                : 'Промпт скопирован'
              : 'Не удалось скопировать',
          });
        });
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
};
