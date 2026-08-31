// Shared types for Promtova application

export interface Prompt {
  id: number;
  title: string;
  tags: string[];
  preview: string;
  path: string;
  content: string;
  vars: Record<string, string>;
  starred: boolean;
  folder: string; // e.g. "ChatGPT/Code"
  createdAt: string;
  updatedAt: string;
  usageCount: number;
}

export interface Folder {
  name: string;
  parent: string | null;
  children: string[];
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

export interface Theme {
  id: string;
  name: string;
  isCustom: boolean;
  colors: Record<string, string>;
}

export interface CustomTheme {
  id: string;
  name: string;
  isCustom: true;
  colors: Record<string, string>;
}

export interface ExportData {
  version: string;
  exportedAt: string;
  prompts: Array<{
    title: string;
    tags: string[];
    preview: string;
    path: string;
    content: string;
    vars: Record<string, string>;
    starred: boolean;
    folder: string;
  }>;
}

export type EditorMode = 'view' | 'edit' | 'split';
export type SortKey = 'updated' | 'created' | 'title' | 'usage';
