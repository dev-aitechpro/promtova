import { describe, it, expect } from 'vitest';
import {
  normalizePrompt,
  normalizeFolder,
  parseImportFile,
  detectConflicts,
  applyMerge,
  buildExportData,
  conflictKey,
} from './importExport';
import type { Prompt } from '../shared/types';

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

describe('normalizePrompt (§5.3)', () => {
  it('отбрасывает мусорные записи', () => {
    expect(normalizePrompt(null)).toBeNull();
    expect(normalizePrompt({})).toBeNull();
    expect(normalizePrompt('строка')).toBeNull();
  });

  it('заполняет значения по умолчанию', () => {
    const p = normalizePrompt({ title: 'X' })!;
    expect(p.title).toBe('X');
    expect(p.tags).toEqual([]);
    expect(p.vars).toEqual({});
    expect(p.useTemplate).toBe(false);
    expect(p.folder).toBe('Development');
  });

  it('принимает fallback-папку', () => {
    expect(normalizePrompt({ title: 'X' }, 'Marketing')!.folder).toBe('Marketing');
  });

  it('переводит числовой id в строку', () => {
    expect(normalizePrompt({ title: 'X', id: 42 })!.id).toBe('42');
  });

  it('сохраняет шаблонный режим', () => {
    const p = normalizePrompt({ title: 'X', system: 'S', useTemplate: true })!;
    expect(p.useTemplate).toBe(true);
    expect(p.system).toBe('S');
  });

  it('отфильтровывает нестроковые теги и переменные', () => {
    const p = normalizePrompt({ title: 'X', tags: ['a', 5] as never[], vars: { a: '1', b: 2 } as never })!;
    expect(p.tags).toEqual(['a']);
    expect(p.vars).toEqual({ a: '1' });
  });
});

describe('normalizeFolder', () => {
  it('отбрасывает записи без названия', () => {
    expect(normalizeFolder({})).toBeNull();
  });

  it('подставляет дефолтные иконку и цвет', () => {
    const f = normalizeFolder({ name: 'Dev' })!;
    expect(f.icon).toBe('Folder');
    expect(f.color).toBe('#FF6B35');
  });
});

describe('parseImportFile', () => {
  it('разбирает .prmt с промптами и папками', () => {
    const json = JSON.stringify({
      version: '1.1',
      prompts: [{ title: 'A', content: 'x' }, { title: 'B' }],
      folders: [{ id: 'f1', name: 'Dev', parent: null, children: [], order: 0 }],
    });
    const res = parseImportFile(json);
    expect(res.prompts).toHaveLength(2);
    expect(res.folders).toHaveLength(1);
    expect(res.errors).toHaveLength(0);
  });

  it('сообщает об ошибке при некорректном JSON', () => {
    const res = parseImportFile('{ не json');
    expect(res.prompts).toHaveLength(0);
    expect(res.errors[0]).toContain('JSON');
  });

  it('сообщает об ошибке, если нет массива prompts', () => {
    const res = parseImportFile(JSON.stringify({ foo: 1 }));
    expect(res.errors[0]).toContain('prompts');
  });

  it('не падает на битых записях, а считает их', () => {
    const json = JSON.stringify({ prompts: [{ title: 'Ok' }, { content: '' }, null] });
    const res = parseImportFile(json);
    expect(res.prompts).toHaveLength(1);
    expect(res.errors.length).toBeGreaterThan(0);
  });

  it('markdown превращается в один промпт с заголовком из названия файла', () => {
    const res = parseImportFile('# Заголовок\n\nтекст {{Var}}', 'Dev', 'my-prompt');
    expect(res.prompts).toHaveLength(1);
    expect(res.prompts[0].title).toBe('my-prompt');
    expect(res.prompts[0].folder).toBe('Dev');
  });

  it('пустой файл даёт ошибку', () => {
    expect(parseImportFile('   ').errors[0]).toContain('пуст');
  });
});

describe('detectConflicts (§5.1)', () => {
  it('находит совпадение по паре заголовок+папка', () => {
    const existing = [prompt({ id: 'e1', title: 'Same', folder: 'Dev' })];
    const incoming = [prompt({ id: 'i1', title: 'Same', folder: 'Dev' })];
    const conflicts = detectConflicts(incoming, existing);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].action).toBe('skip');
  });

  it('не считает конфликтом разные папки', () => {
    const existing = [prompt({ id: 'e1', title: 'Same', folder: 'Dev' })];
    const incoming = [prompt({ id: 'i1', title: 'Same', folder: 'Marketing' })];
    expect(detectConflicts(incoming, existing)).toHaveLength(0);
  });

  it('не считает конфликтом разные заголовки', () => {
    const existing = [prompt({ id: 'e1', title: 'A', folder: 'Dev' })];
    const incoming = [prompt({ id: 'i1', title: 'B', folder: 'Dev' })];
    expect(detectConflicts(incoming, existing)).toHaveLength(0);
  });

  it('не дублирует одинаковые конфликты', () => {
    const existing = [prompt({ id: 'e1', title: 'A', folder: 'Dev' })];
    const incoming = [prompt({ id: 'i1', title: 'A', folder: 'Dev' }), prompt({ id: 'i2', title: 'A', folder: 'Dev' })];
    expect(detectConflicts(incoming, existing)).toHaveLength(1);
  });
});

describe('applyMerge (§5.1)', () => {
  const existing = [prompt({ id: 'e1', title: 'Same', folder: 'Dev', usageCount: 7 })];

  it('skip — не меняет существующую базу', () => {
    const conflicts = detectConflicts([prompt({ id: 'i1', title: 'Same', folder: 'Dev' })], existing);
    const res = applyMerge(existing, [prompt({ id: 'i1', title: 'Same', folder: 'Dev' })], conflicts);
    expect(res.prompts).toHaveLength(1);
    expect(res.skipped).toBe(1);
    expect(res.imported).toBe(0);
  });

  it('overwrite — заменяет, сохраняя id и счётчик', () => {
    const incoming = [prompt({ id: 'i1', title: 'Same', folder: 'Dev', content: 'НОВЫЙ' })];
    const conflicts = detectConflicts(incoming, existing);
    conflicts[0].action = 'overwrite';
    const res = applyMerge(existing, incoming, conflicts);
    expect(res.replaced).toBe(1);
    const merged = res.prompts.find((p) => p.id === 'e1')!;
    expect(merged.content).toBe('НОВЫЙ');
    expect(merged.usageCount).toBe(7);
  });

  it('rename — добавляет копию с суффиксом', () => {
    const incoming = [prompt({ id: 'i1', title: 'Same', folder: 'Dev' })];
    const conflicts = detectConflicts(incoming, existing);
    conflicts[0].action = 'rename';
    const res = applyMerge(existing, incoming, conflicts);
    expect(res.prompts).toHaveLength(2);
    expect(res.prompts.some((p) => p.title === 'Same (копия 2)')).toBe(true);
  });

  it('duplicate — добавляет новый промпт с новым id', () => {
    const incoming = [prompt({ id: 'i1', title: 'Same', folder: 'Dev' })];
    const conflicts = detectConflicts(incoming, existing);
    conflicts[0].action = 'duplicate';
    const res = applyMerge(existing, incoming, conflicts);
    expect(res.prompts).toHaveLength(2);
    expect(res.imported).toBe(1);
    expect(new Set(res.prompts.map((p) => p.id)).size).toBe(2);
  });

  it('неконфликтующие промпты добавляются как новые', () => {
    const res = applyMerge(existing, [prompt({ id: 'i9', title: 'Unique', folder: 'Dev' })], []);
    expect(res.imported).toBe(1);
    expect(res.prompts).toHaveLength(2);
  });
});

describe('conflictKey / buildExportData (§5.2)', () => {
  it('ключ конфликта не зависит от регистра', () => {
    expect(conflictKey({ title: 'Same', folder: 'Dev' })).toBe(conflictKey({ title: 'same', folder: 'Dev' }));
  });

  it('экспорт содержит версию, дату, промпты и папки', () => {
    const data = buildExportData([prompt()], [{ id: 'f', name: 'Dev', parent: null, children: [], order: 0 }]);
    expect(data.version).toBe('1.1');
    expect(data.prompts).toHaveLength(1);
    expect(data.folders).toHaveLength(1);
    expect(typeof data.exportedAt).toBe('string');
  });
});
