import { describe, it, expect } from 'vitest';
import {
  normalizeFolders,
  sortFolders,
  getSiblings,
  getDescendantIds,
  countPromptsInFolders,
  folderPath,
  folderNameById,
} from './folders';
import type { Folder, Prompt } from '../shared/types';

const folder = (over: Partial<Folder> = {}): Folder => ({
  id: 'f1',
  name: 'Dev',
  parent: null,
  children: [],
  icon: 'Code2',
  color: '#4A8EC9',
  order: 0,
  ...over,
});

describe('normalizeFolders (§3.6)', () => {
  it('присваивает id папкам без id', () => {
    const out = normalizeFolders([
      { name: 'Dev', parent: null, children: [], order: 0 },
      { name: 'Prod', parent: null, children: [], order: 1 },
    ] as unknown as Folder[]);
    expect(out.every((f) => !!f.id)).toBe(true);
    expect(new Set(out.map((f) => f.id)).size).toBe(2);
  });

  it('переводит parent-название в parent-id', () => {
    const out = normalizeFolders([
      { id: 'root', name: 'Root', parent: null, children: ['Child'], order: 0 },
      { id: 'child', name: 'Child', parent: 'Root', children: [], order: 0 },
    ] as unknown as Folder[]);
    const child = out.find((f) => f.id === 'child')!;
    expect(child.parent).toBe('root');
  });

  it('пересобирает children из parent', () => {
    const out = normalizeFolders([
      { id: 'root', name: 'Root', parent: null, children: ['child'], order: 0 },
      { id: 'child', name: 'Child', parent: 'root', children: [], order: 0 },
      { id: 'gchild', name: 'G', parent: 'child', children: [], order: 0 },
    ] as unknown as Folder[]);
    expect(out.find((f) => f.id === 'root')!.children).toEqual(['child']);
    expect(out.find((f) => f.id === 'child')!.children).toEqual(['gchild']);
  });

  it('обнуляет parent, ссылающийся на несуществующую папку', () => {
    const out = normalizeFolders([
      { id: 'a', name: 'A', parent: 'ghost', children: [], order: 0 },
    ] as unknown as Folder[]);
    expect(out[0].parent).toBeNull();
  });

  it('защищает от самоссылки и циклов', () => {
    const out = normalizeFolders([
      { id: 'a', name: 'A', parent: 'a', children: [], order: 0 },
    ] as unknown as Folder[]);
    expect(out[0].parent).toBeNull();
  });

  it('перенумеровывает order внутри группы сиблингов', () => {
    const out = normalizeFolders([
      { id: 'a', name: 'A', parent: null, children: [], order: 7 },
      { id: 'b', name: 'B', parent: null, children: [], order: 3 },
      { id: 'c', name: 'C', parent: 'a', children: [], order: 9 },
    ] as unknown as Folder[]);
    const roots = out.filter((f) => !f.parent).sort((x, y) => x.order - y.order);
    expect(roots.map((f) => f.id)).toEqual(['b', 'a']);
    expect(roots.map((f) => f.order)).toEqual([0, 1]);
    expect(out.find((f) => f.id === 'c')!.order).toBe(0);
  });
});

describe('sortFolders (§7.1)', () => {
  it('сортирует по order, а не по порядку в массиве', () => {
    const input = [folder({ id: 'a', order: 2 }), folder({ id: 'b', order: 0 }), folder({ id: 'c', order: 1 })];
    expect(sortFolders(input).map((f) => f.id)).toEqual(['b', 'c', 'a']);
  });
});

describe('getSiblings', () => {
  it('возвращает только папок заданного родителя, отсортированных', () => {
    const folders = [
      folder({ id: 'r1', parent: null, order: 1 }),
      folder({ id: 'r2', parent: null, order: 0 }),
      folder({ id: 'c1', parent: 'r1', order: 0 }),
    ];
    expect(getSiblings(folders, null).map((f) => f.id)).toEqual(['r2', 'r1']);
    expect(getSiblings(folders, 'r1').map((f) => f.id)).toEqual(['c1']);
  });
});

describe('getDescendantIds', () => {
  it('обходит поддерево рекурсивно', () => {
    const folders = [
      folder({ id: 'root', parent: null }),
      folder({ id: 'c1', parent: 'root' }),
      folder({ id: 'c2', parent: 'root' }),
      folder({ id: 'g1', parent: 'c1' }),
    ];
    expect(getDescendantIds(folders, 'root').sort()).toEqual(['c1', 'c2', 'g1']);
  });

  it('не зацикливается при кольцевой ссылке', () => {
    const folders = [
      folder({ id: 'a', parent: 'b', children: ['b'] }),
      folder({ id: 'b', parent: 'a', children: ['a'] }),
    ];
    expect(() => getDescendantIds(folders, 'a')).not.toThrow();
  });
});

describe('countPromptsInFolders (§8.6)', () => {
  it('считает промпты только указанных папок', () => {
    const prompts = [
      { folder: 'Dev' },
      { folder: 'Dev' },
      { folder: 'Marketing' },
    ] as unknown as Prompt[];
    expect(countPromptsInFolders(prompts, new Set(['Dev']))).toBe(2);
  });
});

describe('folderPath / folderNameById', () => {
  it('строит путь через разделитель', () => {
    const folders = [
      folder({ id: 'root', name: 'Root', parent: null }),
      folder({ id: 'c', name: 'Child', parent: 'root' }),
    ];
    expect(folderPath(folders, 'c')).toBe('Root / Child');
    expect(folderNameById(folders, 'c')).toBe('Child');
    expect(folderNameById(folders, 'nope')).toBeNull();
  });
});
