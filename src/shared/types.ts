// Shared types for Promtova application

/**
 * Промпт идентифицируется строковым id (crypto.randomUUID).
 * Ранее использовались числовые `Date.now()` — они мигрируются в строки при гидрации (§4.3).
 */
export type PromptId = string;

export interface Prompt {
  id: PromptId;
  title: string;
  tags: string[];
  preview: string;
  path: string;
  content: string;

  // Шаблонный режим (§4.1). Отсутствие полей = обычный режим, используется `content`.
  system?: string;
  context?: string;
  output?: string;
  useTemplate?: boolean;

  vars: Record<string, string>;
  starred: boolean;
  folder: string; // название папки, напр. "ChatGPT"
  createdAt: string;
  updatedAt: string;
  usageCount: number;
}

/**
 * Папка имеет стабильный `id`. Поля `parent`/`children` хранят **id** других папок
 * (ранее — названия), поэтому переименование не ломает иерархию (§3.1, §3.6).
 */
export interface Folder {
  id: string;
  name: string;
  parent: string | null; // id родительской папки
  children: string[]; // id дочерних папок
  icon?: string;
  color?: string;
  order: number;
}

export interface Tag {
  id: string;
  name: string;
  color?: string;
  count: number;
}

export interface CustomTheme {
  id: string;
  name: string;
  isCustom: true;
  colors: Record<string, string>;
}

/** Формат файла экспорта `.prmt` (§5.2 — включает папки). */
export interface ExportData {
  version: string;
  exportedAt: string;
  prompts: Prompt[];
  folders: Folder[];
}

export type EditorMode = 'view' | 'edit' | 'split';
export type SortKey = 'updated' | 'created' | 'title' | 'usage';

/** Разрешение конфликта при импорте (§5.1). */
export type MergeAction = 'skip' | 'rename' | 'overwrite' | 'duplicate';
