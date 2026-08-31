import { describe, it, expect, beforeEach } from 'vitest';
import { usePromtovaStore } from './usePromtovaStore';
import { normalizeFolders } from '../utils/folders';
import { extractVariables, getPromptText } from '../utils/promtova';
import { detectConflicts } from '../utils/importExport';
import type { Folder, Prompt } from '../shared/types';

const prompt = (over: Partial<Prompt> = {}): Prompt => ({
  id: 'p1',
  title: 'T',
  tags: [],
  preview: '',
  path: 'Dev/T',
  content: 'text',
  vars: {},
  starred: false,
  folder: 'Dev',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  usageCount: 0,
  ...over,
});

const folder = (over: Partial<Folder> = {}): Folder => ({
  id: 'f1',
  name: 'Dev',
  parent: null,
  children: [],
  icon: 'Folder',
  color: '#FF6B35',
  order: 0,
  ...over,
});

const reset = (prompts: Prompt[] = [], folders: Folder[] = []) => {
  usePromtovaStore.setState({
    prompts,
    folders: normalizeFolders(folders),
    tags: [],
    selectedPromptId: prompts[0]?.id ?? null,
    selectedFolderId: 'all',
    searchQuery: '',
    activeTagFilters: [],
    editorMode: 'edit',
    sortBy: 'updated',
    isDirty: false,
    lastSavedAt: null,
    autosave: true,
    editorFontSize: 13,
  });
};

const s = () => usePromtovaStore.getState();

beforeEach(() => reset());

describe('createFolder (§3.1)', () => {
  it('создаёт корневую папку с иконкой и цветом', () => {
    s().createFolder('Dev', { icon: 'Code2', color: '#123456' });
    const f = s().folders[0];
    expect(f.name).toBe('Dev');
    expect(f.icon).toBe('Code2');
    expect(f.color).toBe('#123456');
    expect(f.parent).toBeNull();
  });

  it('создаёт подпапку и обновляет children родителя', () => {
    s().createFolder('Root');
    const root = s().folders[0];
    s().createFolder('Child', { parent: root.id });
    const child = s().folders.find((f) => f.name === 'Child')!;
    expect(child.parent).toBe(root.id);
    expect(s().folders.find((f) => f.id === root.id)!.children).toContain(child.id);
  });

  it('не создаёт дубль имени в той же группе', () => {
    s().createFolder('Dev');
    s().createFolder('Dev');
    expect(s().folders.filter((f) => f.name === 'Dev')).toHaveLength(1);
  });

  it('разрешает одинаковые имена в разных группах', () => {
    s().createFolder('Root');
    const root = s().folders[0];
    s().createFolder('Sub', { parent: root.id });
    s().createFolder('Sub');
    expect(s().folders.filter((f) => f.name === 'Sub')).toHaveLength(2);
  });
});

describe('renameFolder (§3.1)', () => {
  it('переименовывает и обновляет folder/path у промптов', () => {
    reset([prompt({ id: 'p1', folder: 'Dev', path: 'Dev/T' })], [folder({ id: 'root', name: 'Dev' })]);
    s().renameFolder('root', 'Development');
    expect(s().folders[0].name).toBe('Development');
    expect(s().prompts[0].folder).toBe('Development');
    expect(s().prompts[0].path).toBe('Development/T');
  });

  it('НЕ ломает иерархию — parent/children хранят id', () => {
    reset(
      [],
      [
        folder({ id: 'root', name: 'Root' }),
        folder({ id: 'c', name: 'Child', parent: 'root' }),
      ],
    );
    s().renameFolder('root', 'Renamed');
    const child = s().folders.find((f) => f.id === 'c')!;
    expect(child.parent).toBe('root'); // связь жива
    expect(s().folders.find((f) => f.id === 'root')!.children).toContain('c');
  });
});

describe('deleteFolder (§3.1, §8.6)', () => {
  it('каскадно удаляет поддерево папок и их промпты', () => {
    reset(
      [
        prompt({ id: 'p1', folder: 'Root' }),
        prompt({ id: 'p2', folder: 'Child' }),
        prompt({ id: 'p3', folder: 'Grand' }),
        prompt({ id: 'p4', folder: 'Other' }),
      ],
      [
        folder({ id: 'root', name: 'Root', order: 0 }),
        folder({ id: 'c', name: 'Child', parent: 'root', order: 0 }),
        folder({ id: 'g', name: 'Grand', parent: 'c', order: 0 }),
        folder({ id: 'o', name: 'Other', order: 1 }),
      ],
    );
    s().deleteFolder('root');
    expect(s().folders.map((f) => f.id)).toEqual(['o']);
    expect(s().prompts.map((p) => p.id)).toEqual(['p4']);
  });

  it('countFolderPrompts считает промпты всего поддерева', () => {
    reset(
      [prompt({ id: 'p1', folder: 'Root' }), prompt({ id: 'p2', folder: 'Child' }), prompt({ id: 'p3', folder: 'Other' })],
      [
        folder({ id: 'root', name: 'Root' }),
        folder({ id: 'c', name: 'Child', parent: 'root' }),
        folder({ id: 'o', name: 'Other', order: 1 }),
      ],
    );
    expect(s().countFolderPrompts('root')).toBe(2);
    expect(s().countFolderPrompts('o')).toBe(1);
  });
});

describe('moveFolderUp / moveFolderDown (§3.2)', () => {
  const three = () =>
    reset(
      [],
      [
        folder({ id: 'a', name: 'A', order: 0 }),
        folder({ id: 'b', name: 'B', order: 1 }),
        folder({ id: 'c', name: 'C', order: 2 }),
      ],
    );

  it('перемещает вверх только среди сиблингов', () => {
    three();
    s().moveFolderUp('c');
    const order = s().folders.slice().sort((x, y) => x.order - y.order).map((f) => f.id);
    expect(order).toEqual(['a', 'c', 'b']);
  });

  it('перемещает вниз', () => {
    three();
    s().moveFolderDown('a');
    const order = s().folders.slice().sort((x, y) => x.order - y.order).map((f) => f.id);
    expect(order).toEqual(['b', 'a', 'c']);
  });

  it('no-op на границах списка (идемпотентность)', () => {
    three();
    s().moveFolderUp('a');
    s().moveFolderUp('a');
    expect(s().folders.slice().sort((x, y) => x.order - y.order).map((f) => f.id)).toEqual(['a', 'b', 'c']);
    s().moveFolderDown('c');
    s().moveFolderDown('c');
    expect(s().folders.slice().sort((x, y) => x.order - y.order).map((f) => f.id)).toEqual(['a', 'b', 'c']);
  });

  it('не выводит order за пределы группы', () => {
    three();
    s().moveFolderUp('b');
    s().moveFolderDown('b');
    s().moveFolderUp('b');
    expect(s().folders.map((f) => f.order).sort()).toEqual([0, 1, 2]);
  });
});

describe('updatePrompt (§4.1)', () => {
  it('пересчитывает preview по объединённому шаблонному тексту', () => {
    reset([prompt({ id: 'p1', system: 'SYS', context: '', output: 'OUT', useTemplate: true, content: 'старый' })]);
    s().updatePrompt('p1', { context: 'НОВЫЙ КОНТЕКСТ' });
    expect(s().prompts[0].preview).toContain('НОВЫЙ КОНТЕКСТ');
  });

  it('пересчитывает теги при изменении промпта', () => {
    reset([prompt({ id: 'p1', tags: ['a'] })]);
    s().updatePrompt('p1', { tags: ['b', 'c'] });
    expect(s().tags.map((t) => t.name).sort()).toEqual(['b', 'c']);
  });
});

describe('переменные (§4.2)', () => {
  it('setVar записывает значение', () => {
    reset([prompt({ id: 'p1', content: 'Hi {{Name}}' })]);
    s().setVar('p1', 'Name', 'Мир');
    expect(s().prompts[0].vars.Name).toBe('Мир');
  });

  it('pruneVars удаляет значения, которых нет в тексте', () => {
    reset([prompt({ id: 'p1', content: 'Hi {{Name}}', vars: { Name: 'A', Old: 'B' } })]);
    s().pruneVars('p1');
    expect(s().prompts[0].vars).toEqual({ Name: 'A' });
  });

  it('pruneVars работает по объединённому шаблонному тексту', () => {
    reset([
      prompt({ id: 'p1', content: 'x', system: '{{A}}', context: '{{B}}', useTemplate: true, vars: { A: '1', B: '2', C: '3' } }),
    ]);
    s().pruneVars('p1');
    expect(Object.keys(s().prompts[0].vars).sort()).toEqual(['A', 'B']);
    expect(extractVariables(getPromptText(s().prompts[0])).sort()).toEqual(['A', 'B']);
  });
});

describe('updateFolderStyle (§3.4)', () => {
  it('меняет иконку и цвет папки', () => {
    reset([], [folder({ id: 'root', name: 'Root' })]);
    s().updateFolderStyle('root', { icon: 'Rocket', color: '#00FF00' });
    expect(s().folders[0].icon).toBe('Rocket');
    expect(s().folders[0].color).toBe('#00FF00');
  });
});

describe('applyImport (§5.1, §5.2)', () => {
  it('добавляет новые промпты и создаёт отсутствующие папки', () => {
    reset([prompt({ id: 'p1', title: 'Old', folder: 'Dev' })], [folder({ id: 'f', name: 'Dev' })]);
    const incoming = [prompt({ id: 'i1', title: 'New', folder: 'Marketing' })];
    const res = s().applyImport(incoming, [], [folder({ id: 'nf', name: 'Marketing', order: 1 })]);
    expect(res.imported).toBe(1);
    expect(res.foldersCreated).toBe(1);
    expect(s().folders.map((f) => f.name).sort()).toEqual(['Dev', 'Marketing']);
  });

  it('не создаёт дубли существующих папок', () => {
    reset([], [folder({ id: 'f', name: 'Dev' })]);
    const res = s().applyImport([], [], [folder({ id: 'x', name: 'Dev' })]);
    expect(res.foldersCreated).toBe(0);
    expect(s().folders).toHaveLength(1);
  });

  it('учитывает выбранное действие при конфликте', () => {
    reset([prompt({ id: 'e1', title: 'Same', folder: 'Dev', content: 'старый' })], [folder({ id: 'f', name: 'Dev' })]);
    const incoming = [prompt({ id: 'i1', title: 'Same', folder: 'Dev', content: 'новый' })];
    const conflicts = detectConflicts(incoming, s().prompts);
    conflicts[0].action = 'overwrite';
    const res = s().applyImport(incoming, conflicts, []);
    expect(res.replaced).toBe(1);
    expect(s().prompts[0].content).toBe('новый');
  });

  it('пересчитывает теги после импорта', () => {
    reset([], []);
    s().applyImport([prompt({ id: 'i1', tags: ['imported'] })], [], []);
    expect(s().tags.map((t) => t.name)).toEqual(['imported']);
  });
});

describe('промпты (§4.3)', () => {
  it('createPrompt даёт уникальный id при быстрых вызовах подряд', () => {
    reset();
    const ids = [s().createPrompt('Dev'), s().createPrompt('Dev'), s().createPrompt('Dev')];
    expect(new Set(ids).size).toBe(3);
  });

  it('duplicatePrompt создаёт копию с новым id', () => {
    reset([prompt({ id: 'p1', title: 'Orig' })]);
    s().duplicatePrompt('p1');
    const titles = s().prompts.map((p) => p.title);
    expect(titles).toContain('Orig');
    expect(titles).toContain('Orig (копия)');
    expect(new Set(s().prompts.map((p) => p.id)).size).toBe(2);
  });

  it('renamePrompt обновляет заголовок и путь', () => {
    reset([prompt({ id: 'p1', title: 'Old', folder: 'Dev', path: 'Dev/Old' })]);
    s().renamePrompt('p1', 'New');
    expect(s().prompts[0].title).toBe('New');
    expect(s().prompts[0].path).toBe('Dev/New');
  });
});
