import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type {
  EditorMode, EvaluationCriterion, Folder, ModelProfile, Prompt, PromptId, PromptRun,
  PromptSection, PromptTemplate, PromptVersion, SortKey, Tag,
} from '../shared/types';
import { seedFolders, seedPrompts } from './seedData';
import { nativeStorage } from '../storage/nativeStorage';
import { extractVariables, getPromptText, newId } from '../utils/promtova';
import { getDescendantIds, getSiblings, normalizeFolders } from '../utils/folders';
import {
  applyMerge, buildExportData, conflictKey, normalizeFolder, normalizePrompt,
  type MergeConflict, type ParsedImport,
} from '../utils/importExport';
import {
  createModelProfile, createPromptBlock, createPromptRun, createPromptTemplate,
  createPromptVersion, nextPromptVersion, normalizeVariableSchema,
  resolvePromptText, restorePromptVersion,
} from '../utils/promptEngineering';

const recomputeTags = (prompts: Prompt[]): Tag[] => {
  const counts = new Map<string, number>();
  for (const prompt of prompts) for (const tag of prompt.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  return Array.from(counts, ([name, count]) => ({ id: name.toLowerCase(), name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ru'));
};

const resolveFolder = (value: string | undefined, folders: Folder[]): Folder | undefined => {
  if (!value) return undefined;
  return folders.find((folder) => folder.id === value) ?? folders.find((folder) => folder.name === value);
};

const canonicalizePrompts = (prompts: Prompt[], folders: Folder[]): Prompt[] => prompts.map((prompt) => {
  const folder = (prompt.folderId ? folders.find((item) => item.id === prompt.folderId) : undefined)
    ?? folders.find((item) => item.name === prompt.folder);
  return {
    ...prompt,
    folderId: folder?.id,
    folder: folder?.name ?? prompt.folder,
    path: folder ? `${folder.name}/${prompt.title}` : prompt.path,
    variableSchema: prompt.variableSchema ? normalizeVariableSchema(prompt.variableSchema) : undefined,
  };
});

const clonePrompt = (prompt: Prompt): Prompt => ({
  ...prompt,
  tags: [...prompt.tags],
  vars: { ...prompt.vars },
  sections: prompt.sections?.map((section) => ({ ...section })),
  blockRefs: prompt.blockRefs?.map((ref) => ({ ...ref, overrides: ref.overrides ? { ...ref.overrides } : undefined })),
  dependencies: prompt.dependencies?.map((dependency) => ({ ...dependency })),
  variableSchema: prompt.variableSchema
    ? Object.fromEntries(Object.entries(prompt.variableSchema).map(([name, value]) => [name, { ...value, options: value.options ? [...value.options] : undefined }]))
    : undefined,
});

const initialFolders = normalizeFolders(seedFolders);
const initialPrompts = canonicalizePrompts(seedPrompts, initialFolders);

export interface PromptStoreState {
  prompts: Prompt[];
  folders: Folder[];
  tags: Tag[];
  versions: PromptVersion[];
  templates: PromptTemplate[];
  blocks: ReturnType<typeof createPromptBlock>[];
  modelProfiles: ModelProfile[];
  runs: PromptRun[];
  selectedPromptId: PromptId | null;
  selectedFolderId: string;
  searchQuery: string;
  activeTagFilters: string[];
  editorMode: EditorMode;
  sortBy: SortKey;
  isDirty: boolean;
  lastSavedAt: string | null;
  autosave: boolean;
  editorFontSize: number;

  selectPrompt: (id: PromptId | null) => void;
  createPrompt: (folder?: string) => PromptId;
  updatePrompt: (id: PromptId, patch: Partial<Prompt>, versionNote?: string) => void;
  deletePrompt: (id: PromptId) => void;
  duplicatePrompt: (id: PromptId) => void;
  renamePrompt: (id: PromptId, title: string) => void;
  toggleStar: (id: PromptId) => void;
  incrementUsage: (id: PromptId) => void;
  setVar: (id: PromptId, key: string, value: string) => void;
  pruneVars: (id: PromptId) => void;
  getResolvedPromptText: (id: PromptId) => string;

  selectFolder: (id: string) => void;
  createFolder: (name: string, opts?: { parent?: string | null; icon?: string; color?: string }) => void;
  renameFolder: (id: string, newName: string) => void;
  deleteFolder: (id: string) => void;
  moveFolderUp: (id: string) => void;
  moveFolderDown: (id: string) => void;
  updateFolderStyle: (id: string, patch: { icon?: string; color?: string }) => void;
  countFolderPrompts: (id: string) => number;
  movePromptToFolder: (id: PromptId, folder: string) => void;

  toggleTagFilter: (tag: string) => void;
  clearTagFilters: () => void;
  addTagToPrompt: (id: PromptId, tag: string) => void;
  removeTagFromPrompt: (id: PromptId, tag: string) => void;

  setSearchQuery: (query: string) => void;
  setEditorMode: (mode: EditorMode) => void;
  setSortBy: (sort: SortKey) => void;
  setDirty: (dirty: boolean) => void;
  markSaved: () => void;
  setAutosave: (enabled: boolean) => void;
  setEditorFontSize: (size: number) => void;

  saveVersion: (promptId?: PromptId, note?: string) => PromptVersion | null;
  restoreVersion: (promptId: PromptId, versionId: string, note?: string) => Prompt | null;
  addTemplate: (name: string, description?: string, sections?: PromptSection[]) => string;
  updateTemplate: (id: string, patch: Partial<PromptTemplate>) => void;
  applyTemplateToPrompt: (promptId: PromptId, templateId: string, versionNote?: string) => void;
  addBlock: (name: string, content?: string, description?: string) => string;
  updateBlock: (id: string, patch: Partial<ReturnType<typeof createPromptBlock>>) => void;
  addBlockToPrompt: (promptId: PromptId, blockId: string, overrides?: Record<string, string>) => void;
  removeBlockFromPrompt: (promptId: PromptId, blockId: string) => void;
  addModelProfile: (name: string, provider: ModelProfile['provider'], model: string) => string;
  updateModelProfile: (id: string, patch: Partial<ModelProfile>) => void;
  recordRun: (promptId: PromptId, options?: Parameters<typeof createPromptRun>[1]) => string | null;
  updateRunEvaluation: (runId: string, score: number | undefined, criteria: EvaluationCriterion[]) => void;

  applyImport: (incoming: Prompt[], conflicts: MergeConflict[], incomingFolders: Folder[], parsed?: ParsedImport) => { foldersCreated: number; imported: number; skipped: number; replaced: number };
  exportData: () => ExportData;
}

export interface ExportData {
  version: string;
  exportedAt: string;
  prompts: Prompt[];
  folders: Folder[];
  versions?: PromptVersion[];
  templates?: PromptTemplate[];
  blocks?: ReturnType<typeof createPromptBlock>[];
  modelProfiles?: ModelProfile[];
  runs?: PromptRun[];
}

const promptStore = create<PromptStoreState>()(persist((set, get) => ({
  prompts: initialPrompts,
  folders: initialFolders,
  tags: recomputeTags(initialPrompts),
  versions: [],
  templates: [],
  blocks: [],
  modelProfiles: [],
  runs: [],
  selectedPromptId: initialPrompts[0]?.id ?? null,
  selectedFolderId: 'all',
  searchQuery: '',
  activeTagFilters: [],
  editorMode: 'edit',
  sortBy: 'updated',
  isDirty: false,
  lastSavedAt: null,
  autosave: true,
  editorFontSize: 13,

  selectPrompt: (id) => set({ selectedPromptId: id, isDirty: false }),
  createPrompt: (folderInput = 'Development') => {
    const state = get();
    const folder = resolveFolder(folderInput, state.folders) ?? state.folders[0];
    const now = new Date().toISOString();
    const prompt: Prompt = {
      id: newId(), title: 'Новый промпт', tags: [], preview: '',
      path: `${folder?.name ?? 'Development'}/Новый промпт`,
      content: '# Новый промпт\n\nОпишите здесь ваш промпт…\n\nИспользуйте переменные в формате {{имя_переменной}}.\n',
      folderId: folder?.id, folder: folder?.name ?? 'Development', vars: {}, starred: false,
      createdAt: now, updatedAt: now, usageCount: 0,
    };
    set((current) => ({ prompts: [prompt, ...current.prompts], tags: recomputeTags([prompt, ...current.prompts]), selectedPromptId: prompt.id, isDirty: false }));
    return prompt.id;
  },
  updatePrompt: (id, patch, versionNote = '') => set((state) => {
    const current = state.prompts.find((prompt) => prompt.id === id);
    if (!current) return state;
    const next = canonicalizePrompts([{ ...current, ...patch, updatedAt: new Date().toISOString() }], state.folders)[0];
    const before = JSON.stringify({ ...current, updatedAt: undefined });
    const after = JSON.stringify({ ...next, updatedAt: undefined });
    if (before === after) return state;
    const version = !state.isDirty ? createPromptVersion(current, nextPromptVersion(state.versions, id), versionNote) : null;
    const prompts = state.prompts.map((item) => item.id === id ? next : item);
    return { prompts, versions: version ? [...state.versions, version] : state.versions, tags: recomputeTags(prompts), isDirty: true };
  }),
  deletePrompt: (id) => set((state) => {
    const prompts = state.prompts.filter((prompt) => prompt.id !== id);
    return {
      prompts, tags: recomputeTags(prompts), versions: state.versions.filter((version) => version.promptId !== id),
      runs: state.runs.filter((run) => run.promptId !== id),
      selectedPromptId: state.selectedPromptId === id ? (prompts[0]?.id ?? null) : state.selectedPromptId,
    };
  }),
  duplicatePrompt: (id) => {
    const source = get().prompts.find((prompt) => prompt.id === id);
    if (!source) return;
    const copy = clonePrompt(source);
    copy.id = newId(); copy.title = `${source.title} (копия)`; copy.path = `${copy.folder}/${copy.title}`;
    copy.createdAt = new Date().toISOString(); copy.updatedAt = copy.createdAt; copy.starred = false; copy.usageCount = 0;
    set((state) => ({ prompts: [copy, ...state.prompts], tags: recomputeTags([copy, ...state.prompts]), selectedPromptId: copy.id, isDirty: false }));
  },
  renamePrompt: (id, title) => get().updatePrompt(id, { title: title.trim() }, 'Rename prompt'),
  toggleStar: (id) => {
    const prompt = get().prompts.find((item) => item.id === id); if (prompt) get().updatePrompt(id, { starred: !prompt.starred }, 'Toggle star');
  },
  incrementUsage: (id) => {
    const prompt = get().prompts.find((item) => item.id === id); if (prompt) get().updatePrompt(id, { usageCount: prompt.usageCount + 1 }, 'Usage increment');
  },
  setVar: (id, key, value) => {
    const prompt = get().prompts.find((item) => item.id === id); if (prompt) get().updatePrompt(id, { vars: { ...prompt.vars, [key]: value } }, 'Update variable');
  },
  pruneVars: (id) => {
    const prompt = get().prompts.find((item) => item.id === id); if (!prompt) return;
    const used = new Set(extractVariables(get().getResolvedPromptText(id)));
    get().updatePrompt(id, { vars: Object.fromEntries(Object.entries(prompt.vars).filter(([key]) => used.has(key))) }, 'Prune variables');
  },
  getResolvedPromptText: (id) => {
    const state = get();
    const prompt = state.prompts.find((item) => item.id === id);
    return prompt ? resolvePromptText(prompt, state.templates, state.blocks) : '';
  },

  selectFolder: (id) => set({ selectedFolderId: id, activeTagFilters: [] }),
  createFolder: (name, opts = {}) => {
    const clean = name.trim(); if (!clean) return;
    const state = get(); const parent = opts.parent ?? null;
    if (state.folders.some((folder) => folder.name === clean && (folder.parent ?? null) === parent)) return;
    const folder: Folder = { id: newId(), name: clean, parent, children: [], icon: opts.icon ?? 'Folder', color: opts.color ?? '#FF6B35', order: getSiblings(state.folders, parent).length };
    const withParent = parent ? state.folders.map((item) => item.id === parent ? { ...item, children: [...item.children, folder.id] } : item) : state.folders;
    set({ folders: normalizeFolders([...withParent, folder]) });
  },
  renameFolder: (id, newName) => set((state) => {
    const clean = newName.trim(); if (!clean) return state;
    const old = state.folders.find((folder) => folder.id === id); if (!old) return state;
    const folders = state.folders.map((folder) => folder.id === id ? { ...folder, name: clean } : folder);
    const prompts = state.prompts.map((prompt) => prompt.folderId === id || (!prompt.folderId && prompt.folder === old.name)
      ? { ...prompt, folderId: id, folder: clean, path: `${clean}/${prompt.title}`, updatedAt: new Date().toISOString() } : prompt);
    return { folders, prompts, tags: recomputeTags(prompts) };
  }),
  deleteFolder: (id) => set((state) => {
    const removed = new Set([id, ...getDescendantIds(state.folders, id)]);
    const folders = normalizeFolders(state.folders.filter((folder) => !removed.has(folder.id)).map((folder) => ({ ...folder, children: folder.children.filter((child) => !removed.has(child)) })));
    const prompts = state.prompts.filter((prompt) => !removed.has(prompt.folderId ?? ''));
    const kept = new Set(prompts.map((prompt) => prompt.id));
    return {
      folders, prompts, tags: recomputeTags(prompts), versions: state.versions.filter((version) => kept.has(version.promptId)), runs: state.runs.filter((run) => kept.has(run.promptId)),
      selectedFolderId: removed.has(state.selectedFolderId) ? 'all' : state.selectedFolderId,
      selectedPromptId: kept.has(state.selectedPromptId ?? '') ? state.selectedPromptId : (prompts[0]?.id ?? null),
    };
  }),
  moveFolderUp: (id) => set((state) => {
    const target = state.folders.find((folder) => folder.id === id); if (!target) return state;
    const siblings = getSiblings(state.folders, target.parent); const index = siblings.findIndex((folder) => folder.id === id); if (index <= 0) return state;
    const ordered = [...siblings]; [ordered[index - 1], ordered[index]] = [ordered[index], ordered[index - 1]];
    const orderMap = new Map(ordered.map((folder, index) => [folder.id, index]));
    return { folders: state.folders.map((folder) => orderMap.has(folder.id) ? { ...folder, order: orderMap.get(folder.id)! } : folder) };
  }),
  moveFolderDown: (id) => set((state) => {
    const target = state.folders.find((folder) => folder.id === id); if (!target) return state;
    const siblings = getSiblings(state.folders, target.parent); const index = siblings.findIndex((folder) => folder.id === id); if (index < 0 || index >= siblings.length - 1) return state;
    const ordered = [...siblings]; [ordered[index], ordered[index + 1]] = [ordered[index + 1], ordered[index]];
    const orderMap = new Map(ordered.map((folder, index) => [folder.id, index]));
    return { folders: state.folders.map((folder) => orderMap.has(folder.id) ? { ...folder, order: orderMap.get(folder.id)! } : folder) };
  }),
  updateFolderStyle: (id, patch) => set((state) => ({ folders: state.folders.map((folder) => folder.id === id ? { ...folder, ...patch } : folder) })),
  countFolderPrompts: (id) => {
    const state = get(); const ids = new Set([id, ...getDescendantIds(state.folders, id)]);
    return state.prompts.filter((prompt) => ids.has(prompt.folderId ?? '')).length;
  },
  movePromptToFolder: (id, folderInput) => {
    const folder = resolveFolder(folderInput, get().folders); if (folder) get().updatePrompt(id, { folderId: folder.id }, 'Move prompt to folder');
  },

  toggleTagFilter: (tag) => set((state) => ({ activeTagFilters: state.activeTagFilters.includes(tag) ? state.activeTagFilters.filter((item) => item !== tag) : [...state.activeTagFilters, tag] })),
  clearTagFilters: () => set({ activeTagFilters: [] }),
  addTagToPrompt: (id, tag) => {
    const clean = tag.replace(/^#/, '').trim(); const prompt = get().prompts.find((item) => item.id === id);
    if (clean && prompt && !prompt.tags.includes(clean)) get().updatePrompt(id, { tags: [...prompt.tags, clean] }, 'Add tag');
  },
  removeTagFromPrompt: (id, tag) => {
    const prompt = get().prompts.find((item) => item.id === id); if (prompt) get().updatePrompt(id, { tags: prompt.tags.filter((item) => item !== tag) }, 'Remove tag');
  },

  setSearchQuery: (query) => set({ searchQuery: query }),
  setEditorMode: (mode) => set({ editorMode: mode }),
  setSortBy: (sort) => set({ sortBy: sort }),
  setDirty: (dirty) => set({ isDirty: dirty }),
  markSaved: () => set({ isDirty: false, lastSavedAt: new Date().toISOString() }),
  setAutosave: (enabled) => set({ autosave: enabled }),
  setEditorFontSize: (size) => set({ editorFontSize: Math.min(20, Math.max(10, Math.round(size))) }),

  saveVersion: (promptId = get().selectedPromptId ?? undefined, note = '') => {
    const prompt = promptId ? get().prompts.find((item) => item.id === promptId) : undefined;
    if (!prompt) return null;
    const version = createPromptVersion(prompt, nextPromptVersion(get().versions, prompt.id), note);
    set((state) => ({ versions: [...state.versions, version], isDirty: false, lastSavedAt: new Date().toISOString() }));
    return version;
  },
  restoreVersion: (promptId, versionId, note = 'Restore version') => {
    const state = get();
    const prompt = state.prompts.find((item) => item.id === promptId); const version = state.versions.find((item) => item.id === versionId && item.promptId === promptId);
    if (!prompt || !version) return null;
    const backup = createPromptVersion(prompt, nextPromptVersion(state.versions, promptId), note);
    const restored = canonicalizePrompts([restorePromptVersion(prompt, version)], state.folders)[0];
    const prompts = state.prompts.map((item) => item.id === promptId ? restored : item);
    set({ prompts, versions: [...state.versions, backup], tags: recomputeTags(prompts), isDirty: false, lastSavedAt: new Date().toISOString() });
    return restored;
  },

  addTemplate: (name, description = '', sections = []) => { const template = createPromptTemplate(name, sections, description); set((state) => ({ templates: [...state.templates, template] })); return template.id; },
  updateTemplate: (id, patch) => set((state) => ({ templates: state.templates.map((template) => template.id === id ? { ...template, ...patch, updatedAt: new Date().toISOString() } : template) })),
  applyTemplateToPrompt: (promptId, templateId, versionNote = 'Apply template') => {
    const template = get().templates.find((item) => item.id === templateId); if (!template) return;
    get().updatePrompt(promptId, { templateId, sections: template.sections.map((section) => ({ ...section })), useTemplate: true }, versionNote);
  },
  addBlock: (name, content = '', description = '') => { const block = createPromptBlock(name, content, description); set((state) => ({ blocks: [...state.blocks, block] })); return block.id; },
  updateBlock: (id, patch) => set((state) => ({ blocks: state.blocks.map((block) => block.id === id ? { ...block, ...patch, updatedAt: new Date().toISOString() } : block) })),
  addBlockToPrompt: (promptId, blockId, overrides) => {
    const prompt = get().prompts.find((item) => item.id === promptId); if (!prompt || !get().blocks.some((block) => block.id === blockId)) return;
    const refs = [...(prompt.blockRefs ?? []).filter((reference) => reference.blockId !== blockId), { blockId, order: (prompt.blockRefs ?? []).length, overrides }];
    get().updatePrompt(promptId, { blockRefs: refs }, 'Add prompt block');
  },
  removeBlockFromPrompt: (promptId, blockId) => {
    const prompt = get().prompts.find((item) => item.id === promptId); if (!prompt) return;
    const refs = (prompt.blockRefs ?? []).filter((reference) => reference.blockId !== blockId).map((reference, index) => ({ ...reference, order: index }));
    get().updatePrompt(promptId, { blockRefs: refs }, 'Remove prompt block');
  },
  addModelProfile: (name, provider, model) => { const profile = createModelProfile(name, provider, model); set((state) => ({ modelProfiles: [...state.modelProfiles, profile] })); return profile.id; },
  updateModelProfile: (id, patch) => set((state) => ({ modelProfiles: state.modelProfiles.map((profile) => profile.id === id ? { ...profile, ...patch, updatedAt: new Date().toISOString() } : profile) })),
  recordRun: (promptId, options = {}) => {
    const prompt = get().prompts.find((item) => item.id === promptId); if (!prompt) return null;
    const versionId = options.versionId ?? get().versions.filter((version) => version.promptId === promptId).at(-1)?.id;
    const run = createPromptRun(prompt, { ...options, versionId }); set((state) => ({ runs: [run, ...state.runs] })); return run.id;
  },
  updateRunEvaluation: (runId, score, criteria) => set((state) => ({ runs: state.runs.map((run) => run.id === runId ? { ...run, score: score === undefined ? undefined : Math.max(0, Math.min(100, score)), criteria: criteria.map((criterion) => ({ ...criterion, score: criterion.score === undefined ? undefined : Math.max(0, Math.min(100, criterion.score)) })) } : run) })),

  applyImport: (incoming, conflicts, incomingFolders, parsed) => {
    const state = get();
    const folders = [...state.folders];
    const folderIdMap = new Map<string, string>();
    const byId = new Set(folders.map((folder) => folder.id));
    const byName = new Map(folders.map((folder) => [folder.name, folder]));
    const sortedFolders = [...incomingFolders].sort((a, b) => Number(Boolean(a.parent)) - Number(Boolean(b.parent)));
    let foldersCreated = 0;
    for (const source of sortedFolders) {
      const existing = byName.get(source.name);
      if (existing) { folderIdMap.set(source.id, existing.id); continue; }
      const parentId = source.parent ? (folderIdMap.get(source.parent) ?? (byId.has(source.parent) ? source.parent : null)) : null;
      const id = source.id && !byId.has(source.id) ? source.id : newId();
      const created: Folder = { ...source, id, parent: parentId, children: [], order: getSiblings(folders, parentId).length };
      folders.push(created); byId.add(id); byName.set(created.name, created); folderIdMap.set(source.id, id); foldersCreated++;
    }
    const normalizedIncoming = canonicalizePrompts(incoming.map((prompt) => ({ ...prompt, folderId: prompt.folderId ? (folderIdMap.get(prompt.folderId) ?? prompt.folderId) : undefined })), folders);
    const normalizedExisting = canonicalizePrompts(state.prompts, folders);
    const normalizedConflicts = conflicts.map((conflict): MergeConflict => ({
      ...conflict,
      key: conflictKey(normalizedIncoming.find((item) => item.id === conflict.incoming.id) ?? conflict.incoming),
      incoming: normalizedIncoming.find((item) => item.id === conflict.incoming.id) ?? conflict.incoming,
      existing: normalizedExisting.find((item) => item.id === conflict.existing.id) ?? conflict.existing,
    }));
    const merged = applyMerge(normalizedExisting, normalizedIncoming, normalizedConflicts);
    const promptIdMap = new Map(Object.entries(merged.promptIdMap));
    const add = <T extends { id: string }>(current: T[], values: T[]) => {
      const result = [...current]; const ids = new Set(result.map((item) => item.id));
      for (const value of values) if (!ids.has(value.id)) { result.push(value); ids.add(value.id); }
      return result;
    };
    const versions = add(state.versions, (parsed?.versions ?? []).flatMap((version) => { const id = promptIdMap.get(version.promptId); return id ? [{ ...version, promptId: id }] : []; }));
    const runs = add(state.runs, (parsed?.runs ?? []).flatMap((run) => { const id = promptIdMap.get(run.promptId); return id ? [{ ...run, promptId: id }] : []; }));
    const templates = add(state.templates, parsed?.templates ?? []);
    const blocks = add(state.blocks, parsed?.blocks ?? []);
    const modelProfiles = add(state.modelProfiles, parsed?.modelProfiles ?? []);
    const nextPrompts = canonicalizePrompts(merged.prompts.map(clonePrompt), folders);
    set({ prompts: nextPrompts, folders: normalizeFolders(folders), versions, templates, blocks, modelProfiles, runs, tags: recomputeTags(nextPrompts), isDirty: true });
    return { foldersCreated, imported: merged.imported, skipped: merged.skipped, replaced: merged.replaced };
  },

  exportData: () => {
    const state = get();
    return buildExportData(
      canonicalizePrompts(state.prompts.map(clonePrompt), state.folders),
      normalizeFolders(state.folders),
      { versions: state.versions, templates: state.templates, blocks: state.blocks, modelProfiles: state.modelProfiles, runs: state.runs },
    );
  },
}), {
  name: 'promtova-state',
  version: 4,
  storage: createJSONStorage(() => nativeStorage),
  partialize: (state) => ({
    prompts: state.prompts, folders: state.folders, versions: state.versions, templates: state.templates,
    blocks: state.blocks, modelProfiles: state.modelProfiles, runs: state.runs,
    selectedFolderId: state.selectedFolderId, editorMode: state.editorMode, sortBy: state.sortBy,
    autosave: state.autosave, editorFontSize: state.editorFontSize,
  }),
  migrate: (persisted) => {
    const raw = (persisted ?? {}) as Record<string, unknown>;
    const folders = normalizeFolders((Array.isArray(raw.folders) ? raw.folders : []).map(normalizeFolder).filter((item): item is Folder => item !== null));
    const usableFolders = folders.length ? folders : initialFolders;
    const prompts = canonicalizePrompts((Array.isArray(raw.prompts) ? raw.prompts : []).map((item) => normalizePrompt(item)).filter((item): item is Prompt => item !== null), usableFolders);
    const selectedRaw = typeof raw.selectedFolderId === 'string' ? raw.selectedFolderId : typeof raw.selectedFolder === 'string' ? raw.selectedFolder : 'all';
    const selectedFolderId = selectedRaw === 'all' || selectedRaw === 'starred' || usableFolders.some((folder) => folder.id === selectedRaw)
      ? selectedRaw : usableFolders.find((folder) => folder.name === selectedRaw)?.id ?? 'all';
    return {
      prompts: prompts.length ? prompts : initialPrompts,
      folders: usableFolders,
      versions: Array.isArray(raw.versions) ? raw.versions : [], templates: Array.isArray(raw.templates) ? raw.templates : [],
      blocks: Array.isArray(raw.blocks) ? raw.blocks : [], modelProfiles: Array.isArray(raw.modelProfiles) ? raw.modelProfiles : [], runs: Array.isArray(raw.runs) ? raw.runs : [],
      selectedFolderId,
      editorMode: raw.editorMode === 'view' || raw.editorMode === 'split' ? raw.editorMode : 'edit',
      sortBy: raw.sortBy === 'created' || raw.sortBy === 'title' || raw.sortBy === 'usage' ? raw.sortBy : 'updated',
      autosave: raw.autosave !== false,
      editorFontSize: typeof raw.editorFontSize === 'number' ? Math.min(20, Math.max(10, Math.round(raw.editorFontSize))) : 13,
    };
  },
  merge: (persisted, current) => {
    const state = { ...current, ...(persisted as Partial<PromptStoreState>) };
    state.folders = normalizeFolders(state.folders ?? initialFolders);
    state.prompts = canonicalizePrompts(state.prompts ?? [], state.folders);
    state.tags = recomputeTags(state.prompts);
    state.activeTagFilters = [];
    state.searchQuery = '';
    state.selectedPromptId = state.prompts.some((prompt) => prompt.id === state.selectedPromptId) ? state.selectedPromptId : (state.prompts[0]?.id ?? null);
    return state;
  },
}));

export { promptStore as usePromtovaStore };
export type { PromptStoreState as PromtovaState };