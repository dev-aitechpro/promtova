import { describe, it, expect } from 'vitest';
import {
  substituteVariables,
  extractVariables,
  renderMarkdown,
  fuzzyMatch,
  getPromptText,
  newId,
  sanitizeUrl,
} from './promtova';
import type { Prompt } from '../shared/types';

const basePrompt = (over: Partial<Prompt> = {}): Prompt => ({
  id: 'p1',
  title: 'T',
  tags: [],
  preview: '',
  path: 'Development/T',
  content: 'Hello {{Name}}',
  vars: {},
  starred: false,
  folder: 'Development',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  usageCount: 0,
  ...over,
});

describe('substituteVariables', () => {
  it('подставляет значения переменных', () => {
    expect(substituteVariables('Hi {{Name}}!', { Name: 'Мир' })).toBe('Hi Мир!');
  });

  it('оставляет плейсхолдер, если значение пустое', () => {
    expect(substituteVariables('Hi {{Name}}', { Name: '' })).toBe('Hi {{Name}}');
  });

  it('игнорирует пробелы внутри скобок', () => {
    expect(substituteVariables('Hi {{ Name }}', { Name: 'A' })).toBe('Hi A');
  });
});

describe('extractVariables', () => {
  it('возвращает уникальные имена без пробелов', () => {
    expect(extractVariables('{{A}} {{B}} {{ A }}')).toEqual(['A', 'B']);
  });

  it('возвращает пустой массив, если переменных нет', () => {
    expect(extractVariables('просто текст')).toEqual([]);
  });
});

describe('getPromptText (§4.1)', () => {
  it('обычный режим — это content', () => {
    expect(getPromptText(basePrompt({ content: 'abc' }))).toBe('abc');
  });

  it('шаблонный режим — склейка system/context/output', () => {
    const p = basePrompt({
      content: 'НЕ ИСПОЛЬЗУЕТСЯ',
      system: 'SYS',
      context: 'CTX',
      output: 'OUT',
      useTemplate: true,
    });
    expect(getPromptText(p)).toBe('SYS\n\nCTX\n\nOUT');
  });

  it('шаблонный режим пропускает пустые блоки', () => {
    const p = basePrompt({ system: 'SYS', context: '', output: '   ', useTemplate: true });
    expect(getPromptText(p)).toBe('SYS');
  });
});

describe('renderMarkdown', () => {
  it('рендерит заголовки, жирный текст и код', () => {
    const html = renderMarkdown('# Заголовок\n\n**жирный** и `код`');
    expect(html).toContain('<h1>Заголовок</h1>');
    expect(html).toContain('<strong>жирный</strong>');
    expect(html).toContain('<code>код</code>');
  });

  it('подсвечивает переменные как var-token', () => {
    expect(renderMarkdown('значение {{Name}}')).toContain('class="var-token"');
  });

  it('экранирует HTML-разметку во вводе', () => {
    const html = renderMarkdown('<script>alert(1)</script>');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  // §8.4
  it('НЕ создаёт ссылку с javascript: схемой', () => {
    const html = renderMarkdown('[клик](javascript:alert(1))');
    expect(html).not.toContain('<a ');
    expect(html).not.toContain('href="javascript');
  });

  it('НЕ создаёт ссылку с data: схемой', () => {
    expect(renderMarkdown('[x](data:text/html;base64,PHNjcmlwdD4=)')).not.toContain('<a ');
  });

  it('экранирует кавычки в href — атрибут не «выбивается»', () => {
    const html = renderMarkdown('[x](https://a.ru" onmouseover="alert(1))');
    expect(html).toContain('<a ');
    expect(html).not.toContain('onmouseover="');
    expect(html).toContain('&quot;');
  });

  it('разрешает безопасные схемы', () => {
    expect(renderMarkdown('[a](https://a.ru)')).toContain('href="https://a.ru"');
    expect(renderMarkdown('[m](mailto:a@b.ru)')).toContain('href="mailto:a@b.ru"');
  });
});

describe('sanitizeUrl', () => {
  it('пропускает http/https/mailto/относительные', () => {
    expect(sanitizeUrl('https://a.ru')).toBe('https://a.ru');
    expect(sanitizeUrl('http://a.ru')).toBe('http://a.ru');
    expect(sanitizeUrl('mailto:a@b.ru')).toBe('mailto:a@b.ru');
    expect(sanitizeUrl('/local/path')).toBe('/local/path');
    expect(sanitizeUrl('#anchor')).toBe('#anchor');
  });

  it('блокирует опасные схемы', () => {
    expect(sanitizeUrl('javascript:alert(1)')).toBeNull();
    expect(sanitizeUrl('JaVaScRiPt:alert(1)')).toBeNull();
    expect(sanitizeUrl('data:text/html,x')).toBeNull();
    expect(sanitizeUrl('vbscript:msgbox')).toBeNull();
  });
});

describe('fuzzyMatch', () => {
  it('находит подстроку без учёта регистра', () => {
    expect(fuzzyMatch('Привет Мир', 'мир')).toBe(true);
  });

  it('находит разбросанные символы по порядку', () => {
    expect(fuzzyMatch('Code Review Assistant', 'cra')).toBe(true);
  });

  it('пустой запрос всегда совпадает', () => {
    expect(fuzzyMatch('что угодно', '')).toBe(true);
  });
});

describe('newId (§4.3)', () => {
  it('генерирует уникальные id', () => {
    const ids = new Set(Array.from({ length: 500 }, () => newId()));
    expect(ids.size).toBe(500);
  });
});
