// Дерево папок: иконки, нормализация/миграция, сортировка, обход поддерева.
import {
  Folder as FolderIcon,
  Code2,
  Megaphone,
  Zap,
  Sparkles,
  FileText,
  Bookmark,
  Star,
  Heart,
  Rocket,
} from 'lucide-react';
import type { Folder, Prompt } from '../shared/types';
import { newId } from './promtova';

/** Доступные иконки папок (§3.4). Ключ хранится в `Folder.icon`. */
export const FOLDER_ICONS = {
  Folder: FolderIcon,
  Code2,
  Megaphone,
  Zap,
  Sparkles,
  FileText,
  Bookmark,
  Star,
  Heart,
  Rocket,
} as const;

export type FolderIconKey = keyof typeof FOLDER_ICONS;
export const FOLDER_ICON_KEYS = Object.keys(FOLDER_ICONS) as FolderIconKey[];

/** Палитра цветов папок (§3.4). */
export const FOLDER_COLORS = [
  '#FF6B35', '#4A8EC9', '#35C98A', '#C678DD', '#D9A441',
  '#E56B6F', '#B07AFF', '#3DA8FF', '#98C379', '#A7ADB7',
];

/** Иконка берётся из самого объекта папки, а не угадывается по названию (§3.4/§3.6). */
export const getFolderIcon = (f: Pick<Folder, 'icon'>): typeof FolderIcon =>
  FOLDER_ICONS[(f.icon as FolderIconKey) ?? 'Folder'] ?? FolderIcon;

const slugId = (name: string): string => {
  const slug = name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^\p{L}\p{N}-]/gu, '');
  return slug || newId();
};

/**
 * Приводит папки к актуальной схеме (§3.6, обратная совместимость):
 *  - присваивает `id`, если его не было;
 *  - переводит `parent`/`children` с названий на id;
 *  - `parent` становится единственным источником истины, `children` пересобирается из него;
 *  - гарантирует уникальные `order` внутри каждой группы сиблингов.
 */
export const normalizeFolders = (input: Folder[]): Folder[] => {
  if (!Array.isArray(input) || input.length === 0) return [];

  // 1. ids
  const withIds: Folder[] = input.map((f) => ({ ...f, id: f.id ?? slugId(f.name) }));
  const idByName = new Map(withIds.map((f) => [f.name, f.id]));
  const ids = new Set(withIds.map((f) => f.id));

  // 2. parent: название -> id
  const remapped: Folder[] = withIds.map((f) => {
    let parent = f.parent ?? null;
    if (parent && !ids.has(parent)) parent = idByName.get(parent) ?? null;
    if (parent === f.id) parent = null; // защита от самоссылки
    return { ...f, parent, children: [] as string[] };
  });

  const byId = new Map(remapped.map((f) => [f.id, f]));

  // 3. связи, заданные в старых данных только через children, восстанавливаем
  withIds.forEach((oldF) => {
    (oldF.children ?? []).forEach((rawChild) => {
      const childId = ids.has(rawChild) ? rawChild : idByName.get(rawChild);
      if (!childId) return;
      const child = byId.get(childId);
      if (child && !child.parent && child.id !== oldF.id) child.parent = oldF.id;
    });
  });

  // 4. parent — источник истины, children пересобираем из него
  remapped.forEach((f) => {
    if (f.parent && !byId.has(f.parent)) f.parent = null;
  });
  remapped.forEach((f) => {
    if (f.parent) byId.get(f.parent)!.children.push(f.id);
  });

  // 5. order: уникальный и последовательный внутри группы сиблингов
  const groups = new Map<string, Folder[]>();
  remapped.forEach((f) => {
    const key = f.parent ?? '__root__';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(f);
  });
  groups.forEach((list) => {
    list
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name, 'ru'))
      .forEach((f, i) => {
        f.order = i;
      });
  });

  return remapped;
};

/** Сортировка папок по `order` (§7.1). */
export const sortFolders = (folders: Folder[]): Folder[] =>
  [...folders].sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name, 'ru'),
  );

/** Папки одного уровня (сиблинги), отсортированные по `order`. */
export const getSiblings = (folders: Folder[], parent: string | null): Folder[] =>
  sortFolders(folders.filter((f) => (f.parent ?? null) === parent));

/**
 * Все id поддерева ниже `rootId` (без самого rootId).
 * Связи выводятся из поля `parent` — единственного источника истины, — поэтому
 * функция корректна даже если массивы `children` рассинхронизированы.
 * Обход в ширину с защитой от циклов.
 */
export const getDescendantIds = (folders: Folder[], rootId: string): string[] => {
  const childrenOf = new Map<string, string[]>();
  folders.forEach((f) => {
    if (!f.parent || f.parent === f.id) return;
    const list = childrenOf.get(f.parent) ?? [];
    list.push(f.id);
    childrenOf.set(f.parent, list);
  });

  const out: string[] = [];
  const seen = new Set<string>([rootId]);
  const queue: string[] = [rootId];
  while (queue.length) {
    const current = queue.shift()!;
    for (const childId of childrenOf.get(current) ?? []) {
      if (seen.has(childId)) continue; // защита от циклов
      seen.add(childId);
      out.push(childId);
      queue.push(childId);
    }
  }
  return out;
};

/** Название папки по её id (с фолбэком). */
export const folderNameById = (folders: Folder[], id: string): string | null =>
  folders.find((f) => f.id === id)?.name ?? null;

/** Число промптов в наборе папок (по названиям) — для подтверждения удаления (§8.6). */
export const countPromptsInFolders = (prompts: Prompt[], folderNames: Set<string>): number =>
  prompts.filter((p) => folderNames.has(p.folder)).length;

/** Человекочитаемый путь папки, напр. "Development / Sub". */
export const folderPath = (folders: Folder[], id: string): string => {
  const parts: string[] = [];
  let cur = folders.find((f) => f.id === id);
  const guard = new Set<string>();
  while (cur && !guard.has(cur.id)) {
    guard.add(cur.id);
    parts.unshift(cur.name);
    cur = cur.parent ? folders.find((f) => f.id === cur!.parent) : undefined;
  }
  return parts.join(' / ');
};
