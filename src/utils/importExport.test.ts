import { describe, expect, it } from 'vitest';
import {
  applyMerge,
  buildExportData,
  conflictKey,
  detectConflicts,
  normalizeFolder,
  normalizePrompt,
  parseImportFile,
} from './importExport';

const prompt = (overrides: Record<string, unknown> = {}) => ({
  id: 'p1',
  title: 'Test prompt',
  description: '',
  folder: 'Dev',
  tags: [],
  content: 'Hello',
  variables: {},
  ...overrides,
});

describe('normalizePrompt (§5.3)', () => {
  it('отбрасывает мусорные записи', () => {
    expect(normalizePrompt(null)).toBeNull();
    expect(normalizePrompt({ title: '' })).toBeNull();
  });
  it('заполняет значения по умолчанию', () => {
    const result = normalizePrompt({ title: 'Hello', content: 'World' });
    expect(result?.title).toBe('Hello');
    expect(result?.folder).toBe('');
    expect(result?.tags).toEqual([]);
    expect(result?.variables).toEqual({});
  });
  it('принимает fallback-папку', () => {
    expect(normalizePrompt({ title: 'Hello' }, 'Dev')?.folder).toBe('Dev');
  });
  it('переводит числовой id в строку', () => {
    expect(normalizePrompt({ id: 123, title: 'Hello' })?.id).toBe('123');
  });
  it('сохраняет шаблонный режим', () => {
    expect(normalizePrompt({ title: 'Hello', isTemplate: true })?.isTemplate).toBe(true);
  });
  it('отфильтровывает нестроковые теги и переменные', () => {
    const result = normalizePrompt({
      title: 'Hello',
      tags: ['a', 1, null],
      variables: { good: 'x', bad: 123 },
    });
    expect(result?.tags).toEqual(['a']);
    expect(result?.variables).toEqual({ good: 'x' });
  });
});

describe('normalizeFolder', () => {
  it('отбрасывает записи без названия', () => {
    expect(normalizeFolder(null)).toBeNull();
    expect(normalizeFolder({ name: '' })).toBeNull();
  });
  it('подставляет дефолтные иконку и цвет', () => {
    const result = normalizeFolder({ name: 'Dev' });
    expect(result?.name).toBe('Dev');
    expect(result?.icon).toBeTruthy();
    expect(result?.color).toBeTruthy();
  });
});

describe('parseImportFile', () => {
  it('разбирает .prmt с промптами и папками', async () => {
    const file = new File([JSON.stringify({ prompts: [prompt()], folders: [{ name: 'Dev' }] })], 'x.prmt');
    const result = await parseImportFile(file);
    expect(result.prompts).toHaveLength(1);
    expect(result.folders).toHaveLength(1);
  });
  it('сообщает об ошибке при некорректном JSON', async () => {
    const file = new File(['{bad'], 'x.prmt');
    await expect(parseImportFile(file)).rejects.toThrow();
  });
  it('сообщает об ошибке, если нет массива prompts', async () => {
    const file = new File([JSON.stringify({ folders: [] })], 'x.prmt');
    await expect(parseImportFile(file)).rejects.toThrow();
  });
  it('не падает на битых записях, а считает их', async () => {
    const file = new File([JSON.stringify({ prompts: [prompt(), null, {}], folders: [] })], 'x.prmt');
    const result = await parseImportFile(file);
    expect(result.prompts).toHaveLength(1);
    expect(result.errors).toBeGreaterThan(0);
  });
  it('markdown превращается в один промпт с заголовком из названия файла', async () => {
    const file = new File(['# Hello\nWorld'], 'my-prompt.md');
    const result = await parseImportFile(file);
    expect(result.prompts).toHaveLength(1);
    expect(result.prompts[0].title).toBe('my-prompt');
  });
  it('пустой файл даёт ошибку', async () => {
    const file = new File([''], 'x.prmt');
    await expect(parseImportFile(file)).rejects.toThrow();
  });
});

describe('detectConflicts (§5.1)', () => {
  it('находит совпадение по паре заголовок+папка', () => {
    expect(detectConflicts([prompt()], [prompt({ id: 'p2' })])).toHaveLength(1);
  });
  it('не считает конфликтом разные папки', () => {
    expect(detectConflicts([prompt()], [prompt({ id: 'p2', folder: 'Other' })])).toHaveLength(0);
  });
  it('не считает конфликтом разные заголовки', () => {
    expect(detectConflicts([prompt()], [prompt({ id: 'p2', title: 'Other' })])).toHaveLength(0);
  });
  it('не дублирует одинаковые конфликты', () => {
    const result = detectConflicts([prompt()], [prompt({ id: 'p2' }), prompt({ id: 'p3' })]);
    expect(result).toHaveLength(2);
  });
});

describe('applyMerge (§5.1)', () => {
  const existing = [prompt()];
  it('skip — не меняет существующую базу', () => {
    const res = applyMerge(existing, [prompt({ id: 'p2' })], [], 'skip');
    expect(res.prompts).toHaveLength(1);
    expect(res.imported).toBe(0);
  });
  it('overwrite — заменяет, сохраняя id и счётчик', () => {
    const res = applyMerge(existing, [prompt({ id: 'p2', content: 'New' })], [], 'overwrite');
    expect(res.prompts).toHaveLength(1);
    expect(res.prompts[0].id).toBe('p1');
    expect(res.prompts[0].content).toBe('New');
    expect(res.imported).toBe(1);
  });
  it('rename — добавляет копию с суффиксом', () => {
    const res = applyMerge(existing, [prompt({ id: 'p2' })], [], 'rename');
    expect(res.prompts).toHaveLength(2);
    expect(res.prompts[1].title).not.toBe('Test prompt');
  });
  it('duplicate — добавляет новый промпт с новым id', () => {
    const res = applyMerge(existing, [prompt({ id: 'p2' })], [], 'duplicate');
    expect(res.prompts).toHaveLength(2);
    expect(res.prompts[1].id).not.toBe('p1');
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

  it('экспорт содержит актуальную схему, дату, промпты и папки', () => {
    const data = buildExportData([prompt()], [{ id: 'f', name: 'Dev', parent: null, children: [], order: 0 }]);
    expect(data.version).toBe('2.0');
    expect(data.prompts).toHaveLength(1);
    expect(data.folders).toHaveLength(1);
    expect(typeof data.exportedAt).toBe('string');
  });
});
