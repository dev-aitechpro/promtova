import { useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { usePromtovaStore, useThemeStore, applyTheme } from './store/usePromtovaStore';
import { useGlobalHotkeys } from './hooks/useGlobalHotkeys';
import { useStoresHydrated } from './hooks/useStoresHydrated';

import Sidebar from './components/Sidebar';
import PromptList from './components/PromptList';
import Editor from './components/Editor';
import ToastStack from './components/ToastStack';
import UpdateBanner from './components/UpdateBanner';

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

/** Загрузочный экран на время чтения файла данных (§2.4). */
const Splash = () => (
  <div
    className="flex h-screen w-screen flex-col items-center justify-center gap-3"
    style={{ background: 'var(--bg-primary)' }}
  >
    <div
      className="flex h-12 w-12 items-center justify-center rounded-2xl"
      style={{ background: 'var(--accent-primary)' }}
    >
      <Sparkles size={24} color="#fff" strokeWidth={2.5} />
    </div>
    <p className="text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>
      Загрузка базы промптов…
    </p>
  </div>
);

export default function App() {
  const { currentTheme, customThemes } = useThemeStore();
  const { selectPrompt, selectedPromptId } = usePromtovaStore();
  const hydrated = useStoresHydrated();

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

  // До завершения гидрации не рендерим интерфейс, чтобы seed не перезатёр данные
  if (!hydrated) return <Splash />;

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
      <UpdateBanner />
    </div>
  );
}
