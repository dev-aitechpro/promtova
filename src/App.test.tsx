// Smoke-тест: приложение собирается в рантайме и ключевые сценарии работают.
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import App from './App';
import { usePromtovaStore, useUIStore } from './store/usePromtovaStore';
import { resetMemoryStorage } from './storage/nativeStorage';

const resetStores = () => {
  // Сбрасываем in-memory адаптер нативного хранилища вместо localStorage (§4.1 ТЗ).
  resetMemoryStorage();
  usePromtovaStore.setState({
    prompts: usePromtovaStore.getState().prompts,
    selectedFolderId: 'all',
    searchQuery: '',
    activeTagFilters: [],
    editorMode: 'edit',
    sortBy: 'updated',
    isDirty: false,
  });
  useUIStore.setState({
    settingsOpen: false,
    exportOpen: false,
    folderModalOpen: false,
    tagModalOpen: false,
    shortcutsOpen: false,
    themeEditorOpen: false,
    renameFolderId: null,
    renamePromptId: null,
    deleteFolderId: null,
    mergeImport: null,
    toasts: [],
  });
};

describe('App (smoke)', () => {
  it('рендерит трёхколоночный интерфейс без ошибок', () => {
    resetStores();
    render(<App />);
    expect(screen.getByText('Промтовая')).toBeInTheDocument();
    expect(screen.getByText('Моя база')).toBeInTheDocument();
    // «Все промпты» встречается и в сайдбаре, и в заголовке списка — проверяем хотя бы одну
    expect(screen.getAllByText('Все промпты').length).toBeGreaterThan(0);
    expect(screen.getByText('Избранное')).toBeInTheDocument();
  });

  it('показывает сид-промпты и папки', () => {
    resetStores();
    render(<App />);
    // заголовок промпта виден и в списке, и в редакторе
    expect(screen.getAllByText('Code Review Assistant').length).toBeGreaterThan(0);
    // названия папок видны в дереве сайдбара
    expect(screen.getAllByText('Development').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Marketing').length).toBeGreaterThan(0);
  });

  it('редактор показывает выбранный промпт', () => {
    resetStores();
    render(<App />);
    const header = screen.getByPlaceholderText('Название промпта');
    expect(header).toHaveValue('Code Review Assistant');
  });
});

describe('горячие клавиши (§8.1)', () => {
  it('⌘N создаёт новый промпт', () => {
    resetStores();
    render(<App />);
    const before = usePromtovaStore.getState().prompts.length;
    fireEvent.keyDown(window, { key: 'n', metaKey: true });
    expect(usePromtovaStore.getState().prompts.length).toBe(before + 1);
  });

  it('⌘K не создаёт промпт (только фокус поиска)', () => {
    resetStores();
    render(<App />);
    const before = usePromtovaStore.getState().prompts.length;
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    expect(usePromtovaStore.getState().prompts.length).toBe(before);
  });

  it('F2 открывает модал переименования промпта', () => {
    resetStores();
    render(<App />);
    fireEvent.keyDown(window, { key: 'F2' });
    expect(useUIStore.getState().renamePromptId).not.toBeNull();
  });

  it('Esc закрывает открытую модалку', () => {
    resetStores();
    render(<App />);
    useUIStore.getState().openShortcuts();
    expect(useUIStore.getState().shortcutsOpen).toBe(true);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(useUIStore.getState().shortcutsOpen).toBe(false);
  });
});

describe('папки в UI (§3)', () => {
  it('кнопка создания папки открывает модал', () => {
    resetStores();
    render(<App />);
    fireEvent.click(screen.getByTitle('Создать папку'));
    expect(useUIStore.getState().folderModalOpen).toBe(true);
    // модал содержит выбор родителя (§3.1)
    expect(screen.getByLabelText('Родительская папка')).toBeInTheDocument();
  });

  it('контекстное меню папки открывается по правому клику', () => {
    resetStores();
    render(<App />);
    const folders = usePromtovaStore.getState().folders;
    const dev = folders.find((f) => f.name === 'Development')!;
    const tree = screen.getByRole('tree', { name: 'Папки' });
    const row = within(tree).getByText('Development').closest('[role="treeitem"]')!;
    fireEvent.contextMenu(row, { clientX: 100, clientY: 100 });
    expect(screen.getByRole('menu', { name: `Действия с папкой «${dev.name}»` })).toBeInTheDocument();
    expect(screen.getByText('Создать подпапку')).toBeInTheDocument();
  });
});

describe('шаблонный режим в UI (§4.1)', () => {
  it('переключатель «Шаблонный» доступен и переключает режим', () => {
    resetStores();
    // используем сид-промпт с шаблонным режимом
    const template = usePromtovaStore.getState().prompts.find((p) => p.useTemplate)!;
    expect(template).toBeTruthy();
    usePromtovaStore.getState().selectPrompt(template.id);
    render(<App />);
    expect(screen.getByLabelText('System Prompt')).toBeInTheDocument();
    expect(screen.getByLabelText('Context')).toBeInTheDocument();
    expect(screen.getByLabelText('Output format')).toBeInTheDocument();
  });
});
