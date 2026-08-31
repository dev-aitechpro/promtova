import { useEffect } from 'react';
import { usePromtovaStore, useThemeStore, applyTheme } from './store/usePromtovaStore';
import { useGlobalHotkeys } from './hooks/useGlobalHotkeys';

import Sidebar from './components/Sidebar';
import PromptList from './components/PromptList';
import Editor from './components/Editor';
import ToastStack from './components/ToastStack';

import SettingsModal from './components/modals/SettingsModal';
import ExportModal from './components/modals/ExportModal';
import FolderModal from './components/modals/FolderModal';
import ShortcutsModal from './components/modals/ShortcutsModal';
import ThemeEditorModal from './components/modals/ThemeEditorModal';
import RenameFolderModal from './components/modals/RenameFolderModal';
import RenamePromptModal from './components/modals/RenamePromptModal';
import ConfirmDeleteFolderModal from './components/modals/ConfirmDeleteFolderModal';
import TagModal from './components/modals/TagModal';
import MergeModal from './components/modals/MergeModal';

export default function App() {
  const { currentTheme, customThemes } = useThemeStore();
  const { selectPrompt, selectedPromptId } = usePromtovaStore();

  // Горячие клавиши регистрируются один раз на всё приложение (§8.1)
  useGlobalHotkeys();

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
      <RenameFolderModal />
      <RenamePromptModal />
      <ConfirmDeleteFolderModal />
      <TagModal />
      <MergeModal />

      <ToastStack />
    </div>
  );
}
