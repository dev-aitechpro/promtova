import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  CustomTheme,
  EditorMode,
  EvaluationCriterion,
  Folder,
  ModelProfile,
  Prompt,
  PromptId,
  PromptRun,
  PromptSection,
  PromptTemplate,
  PromptVersion,
  SortKey,
  Tag,
} from '../shared/types';
import { seedFolders, seedPrompts } from './seedData';
import { nativeStorage } from '../storage/nativeStorage';
import { extractVariables, getPromptText, newId } from '../utils/promtova';
import { getDescendantIds, getSiblings, normalizeFolders } from '../utils/folders';
import {
  applyMerge,
  buildExportData,
  conflictKey,
  normalizeFolder,
  normalizePrompt,
  type MergeConflict,
  type ParsedImport,
} from '../utils/importExport';
import {
  createModelProfile,
  createPromptBlock,
  createPromptRun,
  createPromptTemplate,
  createPromptVersion,
  nextPromptVersion,
  normalizeVariableSchema,
  restorePromptVersion,
} from '../utils/promptEngineering';

export type { CustomTheme };

const recomputeTags = (prompts: Prompt[]): Tag[] => {
  const counts = new Map<string, number>();
  for (const prompt of prompts) {
    for (const tag of prompt.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([name, count]) => ({ id: name.toLowerCase(), name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ru'));
};

const resolveFolder = (prompt: Prompt, folders: Folder[]): Folder | undefined => {
  if (prompt.folderId) {
    const byId = folders.find((folder) => folder.id === prompt.folderId);
    if (byId) return byId;
  }
  return folders.find((folder) => folder.name === prompt.folder);
};

const canonicalizePrompts = (prompts: Prompt[], folders: Folder[]): Prompt[] =>
  prompts.map((prompt) => {
    const folder = resolveFolder(prompt, folders);
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
  blockRefs: prompt.blockRefs?.map((reference) => ({
    ...reference,
    overrides: reference.overrides ? { ...reference.overrides } : undefined,
  })),
  dependencies: prompt.dependencies?.map((dependency) => ({ ...dependency })),
  variableSchema: prompt.variableSchema
    ? Object.fromEntries(
        Object.entries(prompt.variableSchema).map(([name, value]) => [name, {
          ...value,
          options: value.options ? [...value.options] : undefined,
        }]),
      )
    : undefined,
});

const reorderSiblings = (
  folders: Folder[],
  parent: string | null,
  id: string,
  delta: -1 | 1,
): Folder[] => {
  const siblings = getSiblings(folders, parent);
  const index = siblings.findIndex((folder) => folder.id === id);
  const target = index + delta;
  if (index < 0 || target < 0 || target >= siblings.length) return folders;
  const ordered = [...siblings];
  [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
  const orderById = new Map(ordered.map((folder, position) => [folder.id, position]));
  return folders.map((folder) => (
    orderById.has(folder.id)
      ? { ...folder, order: orderById.get(folder.id)! }
      : folder
  ));
};

const stablePromptFingerprint = (prompt: Prompt, includeTitle = true): string => JSON.stringify({
  title: includeTitle ? prompt.title : undefined,
  content: prompt.content,
  folderId: prompt.folderId,
  system: prompt.system,
  context: prompt.context,
  output: prompt.output,
  useTemplate: prompt.useTemplate,
  tags: prompt.tags,
  vars: prompt.vars,
  templateId: prompt.templateId,
  sections: prompt.sections,
  blockRefs: prompt.blockRefs,
  dependencies: prompt.dependencies,
  variableSchema: prompt.variableSchema,
});

const mapImportedPromptIds = (
  incoming: Prompt[],
  merged: Prompt[],
  conflicts: MergeConflict[],
): Map<string, string> => {
  const mapping = new Map<string, string>();
  const used = new Set<string>();
  for (const prompt of incoming) {
    const conflict = conflicts.find((item) => (
      item.incoming.id === prompt.id || conflictKey(item.incoming) === conflictKey(prompt)
    ));
    const candidates = merged.filter((candidate) => !used.has(candidate.id));
    let match: Prompt | undefined;
    if (conflict?.action === 'overwrite') {
      match = candidates.find((candidate) => (
        conflict.existing.id === candidate.id ||
        (candidate.title === prompt.title && candidate.folderId === prompt.folderId && candidate.content === prompt.content)
      ));
    } else {
      match = candidates.find((candidate) => stablePromptFingerprint(candidate) === stablePromptFingerprint(prompt));
      if (!match) {
        match = candidates.find((candidate) => stablePromptFingerprint(candidate, false) === stablePromptFingerprint(prompt, false) && (
          candidate.title === prompt.title || candidate.title.startsWith(`${prompt.title} (копия`)
        ));
      }
    }
    if (match) {
      mapping.set(prompt.id, match.id);
      used.add(match.id);
    }
  }
  return mapping;
};

export interface CreateFolderOptions {
  parent?: string | null;
  icon?: string;
  color?: string;
}

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

  selectFolder: (id: string) => void;
  createFolder: (name: string, opts?: CreateFolderOptions) => void;
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
  exportData: () => ParsedImport;
}

const initialFolders = normalizeFolders(seedFolders);
const initialPrompts = canonicalizePrompts(seedPrompts, initialFolders);

const createStoreState = (set: any, get: any): PromptStoreState => {
  const commitUpdate = (id: PromptId, patch: Partial<Prompt>, versionNote = '') => {
    set((state: PromptStoreState) => {
      const current = state.prompts.find((prompt) => prompt.id === id);
      if (!current) return state;
      const next = canonicalizePrompts([
        { ...current, ...patch, updatedAt: new Date().toISOString() },
      ], state.folders)[0];
      const changed = stablePromptFingerprint(current) !== stablePromptFingerprint(next);
      if (!changed) return state;

      const version = !state.isDirty
        ? createPromptVersion(current, nextPromptVersion(state.versions, id), versionNote)
        : null;
      const prompts = state.prompts.map((prompt) => prompt.id === id ? next : prompt);
      return {
        prompts,
        versions: version ? [...state.versions, version] : state.versions,
        tags: recomputeTags(prompts),
        isDirty: true,
      };
    });
  };

  return {
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
      const target = state.folders.find((folder: Folder) => folder.id === folderInput)
        ?? state.folders.find((folder: Folder) => folder.name === folderInput)
        ?? state.folders[0];
      const now = new Date().toISOString();
      const prompt: Prompt = {
        id: newId(), title: 'Новый промпт', tags: [], preview: '',
        path: `${target?.name ?? 'Development'}/Новый промпт`,
        content: '# Новый промпт\n\nОпишите здесь ваш промпт…\n\nИспользуйте переменные в формате {{имя_переменной}}.\n',
        folderId: target?.id, folder: target?.name ?? 'Development', vars: {}, starred: false,
        createdAt: now, updatedAt: now, usageCount: 0,
      };
      set((current: PromptStoreState) => ({
        prompts: [prompt, ...current.prompts],
        tags: recomputeTags([prompt, ...current.prompts]),
        selectedPromptId: prompt.id,
        isDirty: false,
      }));
      return prompt.id;
    },

    updatePrompt: commitUpdate,
    deletePrompt: (id) => set((state: PromptStoreState) => {
      const prompts = state.prompts.filter((prompt) => prompt.id !== id);
      const kept = new Set(prompts.map((prompt) => prompt.id));
      return {
        prompts,
        versions: state.versions.filter((version) => version.promptId !== id),
        runs: state.runs.filter((run) => run.promptId !== id),
        tags: recomputeTags(prompts),
        selectedPromptId: state.selectedPromptId === id ? (prompts[0]?.id ?? null) : state.selectedPromptId,
        selectedFolderId: kept.size ? state.selectedFolderId : 'all',
      };
    }),
    duplicatePrompt: (id) => {
      const source = get().prompts.find((prompt: Prompt) => prompt.id === id);
      if (!source) return;
      const copy = clonePrompt(source);
      copy.id = newId();
      copy.title = `${source.title} (копия)`;
      copy.path = `${copy.folder}/${copy.title}`;
      copy.createdAt = new Date().toISOString();
      copy.updatedAt = copy.createdAt;
      copy.starred = false;
      copy.usageCount = 0;
      set((state: PromptStoreState) => ({ prompts: [copy, ...state.prompts], tags: recomputeTags([copy, ...state.prompts]), selectedPromptId: copy.id, isDirty: false }));
    },
    renamePrompt: (id, title) => commitUpdate(id, { title: title.trim() }, 'Rename prompt'),
    toggleStar: (id) => { const prompt = get().prompts.find((item: Prompt) => item.id === id); if (prompt) commitUpdate(id, { starred: !prompt.starred }, 'Toggle star'); },
    incrementUsage: (id) => { const prompt = get().prompts.find((item: Prompt) => item.id === id); if (prompt) commitUpdate(id, { usageCount: prompt.usageCount + 1 }, 'Usage increment'); },
    setVar: (id, key, value) => { const prompt = get().prompts.find((item: Prompt) => item.id === id); if (prompt) commitUpdate(id, { vars: { ...prompt.vars, [key]: value } }, 'Update variable'); },
    pruneVars: (id) => {
      const prompt = get().prompts.find((item: Prompt) => item.id === id);
      if (!prompt) return;
      const used = new Set(extractVariables(getPromptText(prompt)));
      commitUpdate(id, { vars: Object.fromEntries(Object.entries(prompt.vars).filter(([key]) => used.has(key))) }, 'Prune variables');
    },

    selectFolder: (id) => set({ selectedFolderId: id, activeTagFilters: [] }),
    createFolder: (name, opts = {}) => {
      const clean = name.trim(); if (!clean) return;
      const state = get(); const parent = opts.parent ?? null;
      if (state.folders.some((folder: Folder) => folder.name === clean && (folder.parent ?? null) === parent)) return;
      const folder: Folder = { id: newId(), name: clean, parent, children: [], icon: opts.icon ?? 'Folder', color: opts.color ?? '#FF6B35', order: getSiblings(state.folders, parent).length };
      const withParent = parent ? state.folders.map((item: Folder) => item.id === parent ? { ...item, children: [...item.children, folder.id] } : item) : state.folders;
      set({ folders: normalizeFolders([...withParent, folder]) });
    },
    renameFolder: (id, newName) => {
      const clean = newName.trim(); if (!clean) return;
      set((state: PromptStoreState) => {
        const folders = state.folders.map((folder: Folder) => folder.id === id ? { ...folder, name: clean } : folder);
        const prompts = canonicalizePrompts(state.prompts, state.folders).map((prompt) => prompt.folderId === id ? { ...prompt, folder: clean, path: `${clean}/${prompt.title}`, updatedAt: new Date().toISOString() } : prompt);
        return { folders, prompts, tags: recomputeTags(prompts) };
      });
    },
    deleteFolder: (id) => set((state: PromptStoreState) => {
      const removed = new Set([id, ...getDescendantIds(state.folders, id)]);
      const folders = normalizeFolders(state.folders.filter((folder: Folder) => !removed.has(folder.id)).map((folder: Folder) => ({ ...folder, children: folder.children.filter((child) => !removed.has(child)) })));
      const prompts = canonicalizePrompts(state.prompts, state.folders).filter((prompt) => !removed.has(prompt.folderId ?? ''));
      const kept = new Set(prompts.map((prompt) => prompt.id));
      return { folders, prompts, tags: recomputeTags(prompts), versions: state.versions.filter((v) => kept.has(v.promptId)), runs: state.runs.filter((r) => kept.has(r.promptId)), selectedFolderId: removed.has(state.selectedFolderId) ? 'all' : state.selectedFolderId, selectedPromptId: kept.has(state.selectedPromptId ?? '') ? state.selectedPromptId : (prompts[0]?.id ?? null) };
    }),
    moveFolderUp: (id) => set((state: PromptStoreState) => ({ folders: reorderSiblings(state.folders, state.folders.find((folder: Folder) => folder.id === id)?.parent ?? null, id, -1) })),
    moveFolderDown: (id) => set((state: PromptStoreState) => ({ folders: reorderSiblings(state.folders, state.folders.find((folder: Folder) => folder.id === id)?.parent ?? null, id, 1) })),
    updateFolderStyle: (id, patch) => set((state: PromptStoreState) => ({ folders: state.folders.map((folder: Folder) => folder.id === id ? { ...folder, ...patch } : folder) })),
    countFolderPrompts: (id) => {
      const state = get(); const ids = new Set([id, ...getDescendantIds(state.folders, id)]);
      return canonicalizePrompts(state.prompts, state.folders).filter((prompt) => ids.has(prompt.folderId ?? '')).length;
    },
    movePromptToFolder: (id, folderInput) => {
      const folderId = stateFolderId(folderInput, get().folders);
      if (folderId) commitUpdate(id, { folderId }, 'Move prompt to folder');
    },

    toggleTagFilter: (tag) => set((state: PromptStoreState) => ({ activeTagFilters: state.activeTagFilters.includes(tag) ? state.activeTagFilters.filter((item) => item !== tag) : [...state.activeTagFilters, tag] })),
    clearTagFilters: () => set({ activeTagFilters: [] }),
    addTagToPrompt: (id, tag) => {
      const clean = tag.replace(/^#/, '').trim(); if (!clean) return;
      const prompt = get().prompts.find((item: Prompt) => item.id === id);
      if (prompt && !prompt.tags.includes(clean)) commitUpdate(id, { tags: [...prompt.tags, clean] }, 'Add tag');
    },
    removeTagFromPrompt: (id, tag) => { const prompt = get().prompts.find((item: Prompt) => item.id === id); if (prompt) commitUpdate(id, { tags: prompt.tags.filter((item) => item !== tag) }, 'Remove tag'); },

    setSearchQuery: (query) => set({ searchQuery: query }),
    setEditorMode: (mode) => set({ editorMode: mode }),
    setSortBy: (sort) => set({ sortBy: sort }),
    setDirty: (dirty) => set({ isDirty: dirty }),
    markSaved: () => set({ isDirty: false, lastSavedAt: new Date().toISOString() }),
    setAutosave: (enabled) => set({ autosave: enabled }),
    setEditorFontSize: (size) => set({ editorFontSize: Math.min(20, Math.max(10, Math.round(size))) }),

    saveVersion: (promptId = get().selectedPromptId ?? '', note = '') => {
      const prompt = get().prompts.find((item: Prompt) => item.id === promptId); if (!prompt) return null;
      const version = createPromptVersion(prompt, nextPromptVersion(get().versions, promptId), note);
      set((state: PromptStoreState) => ({ versions: [...state.versions, version], isDirty: false, lastSavedAt: new Date().toISOString() }));
      return version;
    },
    restoreVersion: (promptId, versionId, note = 'Restore version') => {
      const state = get();
      const prompt = state.prompts.find((item: Prompt) => item.id === promptId);
      const version = state.versions.find((item: PromptVersion) => item.id === versionId && item.promptId === promptId);
      if (!prompt || !version) return null;
      const snapshot = createPromptVersion(prompt, nextPromptVersion(state.versions, promptId), note);
      const restored = restorePromptVersion(prompt, version);
      const prompts = state.prompts.map((item: Prompt) => item.id === promptId ? restored : item);
      set({ prompts, versions: [...state.versions, snapshot], tags: recomputeTags(prompts), isDirty: false, lastSavedAt: new Date().toISOString() });
      return restored;
    },

    addTemplate: (name, description = '', sections = []) => { const template = createPromptTemplate(name, sections, description); set((state: PromptStoreState) => ({ templates: [...state.templates, template] })); return template.id; },
    updateTemplate: (id, patch) => set((state: PromptStoreState) => ({ templates: state.templates.map((template: PromptTemplate) => template.id === id ? { ...template, ...patch, updatedAt: new Date().toISOString() } : template) })),
    applyTemplateToPrompt: (promptId, templateId, versionNote = 'Apply template') => { const template = get().templates.find((item: PromptTemplate) => item.id === templateId); if (template) commitUpdate(promptId, { templateId, sections: template.sections.map((section) => ({ ...section })), useTemplate: true }, versionNote); },
    addBlock: (name, content = '', description = '') => { const block = createPromptBlock(name, content, description); set((state: PromptStoreState) => ({ blocks: [...state.blocks, block] })); return block.id; },
    updateBlock: (id, patch) => set((state: PromptStoreState) => ({ blocks: state.blocks.map((block) => block.id === id ? { ...block, ...patch, updatedAt: new Date().toISOString() } : block) })),
    addBlockToPrompt: (promptId, blockId, overrides) => { const prompt = get().prompts.find((item: Prompt) => item.id === promptId); if (!prompt || !get().blocks.some((block: ReturnType<typeof createPromptBlock>) => block.id === blockId)) return; const refs = [...(prompt.blockRefs ?? [])].filter((ref) => ref.blockId !== blockId); refs.push({ blockId, order: refs.length, overrides }); commitUpdate(promptId, { blockRefs: refs }, 'Add prompt block'); },
    removeBlockFromPrompt: (promptId, blockId) => { const prompt = get().prompts.find((item: Prompt) => item.id === promptId); if (!prompt) return; const refs = (prompt.blockRefs ?? []).filter((ref) => ref.blockId !== blockId).map((ref, index) => ({ ...ref, order: index })); commitUpdate(promptId, { blockRefs: refs }, 'Remove prompt block'); },
    addModelProfile: (name, modelProvider, model) => { const profile = createModelProfile(name, modelProvider, model); set((state: PromptStoreState) => ({ modelProfiles: [...state.modelProfiles, profile] })); return profile.id; },
    updateModelProfile: (id, patch) => set((state: PromptStoreState) => ({ modelProfiles: state.modelProfiles.map((profile: ModelProfile) => profile.id === id ? { ...profile, ...patch, updatedAt: new Date().toISOString() } : profile) })),
    recordRun: (promptId, options = {}) => { const prompt = get().prompts.find((item: Prompt) => item.id === promptId); if (!prompt) return null; const versionId = options.versionId ?? get().versions.filter((version: PromptVersion) => version.promptId === promptId).at(-1)?.id; const run = createPromptRun(prompt, { ...options, versionId }); set((state: PromptStoreState) => ({ runs: [run, ...state.runs] })); return run.id; },
    updateRunEvaluation: (runId, score, criteria) => set((state: PromptStoreState) => ({ runs: state.runs.map((run: PromptRun) => run.id === runId ? { ...run, score, criteria } : run) })),

    applyImport: (incoming, conflicts, incomingFolders, parsed) => {
      const state = get();
      const folders = normalizeFolders([...state.folders]);
      const folderIdMap = new Map<string, string>();
      const existingByName = new Map(folders.map((folder) => [folder.name, folder]));

      const sortedIncomingFolders = [...incomingFolders].sort((a, b) => Number(Boolean(a.parent)) - Number(Boolean(b.parent)));
      let foldersCreated = 0;
      for (const source of sortedIncomingFolders) {
        const existing = existingByName.get(source.name);
        if (existing) { folderIdMap.set(source.id, existing.id); continue; }
        let parentId = source.parent ? folderIdMap.get(source.parent) ?? source.parent : null;
        if (parentId && !folders.some((folder) => folder.id === parentId)) parentId = null;
        const created: Folder = { ...source, id: source.id || newId(), parent: parentId, children: [], order: getSiblings(folders, parentId).length };
        folders.push(created); existingByName.set(created.name, created); folderIdMap.set(source.id, created.id); foldersCreated++;
      }

      const normalizedIncoming = canonicalizePrompts(incoming.map((prompt) => ({
        ...prompt,
        folderId: prompt.folderId ? (folderIdMap.get(prompt.folderId) ?? prompt.folderId) : undefined,
      })), folders);
      const normalizedExisting = canonicalizePrompts(state.prompts, folders);
      const normalizedConflicts: MergeConflict[] = conflicts.map((conflict) => {
        const normalizedIncomingPrompt = normalizedIncoming.find((prompt) => prompt.id === conflict.incoming.id)
          ?? normalizedIncoming.find((prompt) => conflictKey(prompt) === conflictKey(conflict.incoming))
          ?? conflict.incoming;
        const normalizedExistingPrompt = normalizedExisting.find((prompt) => prompt.id === conflict.existing.id) ?? conflict.existing;
        return { ...conflict, key: conflictKey(normalizedIncomingPrompt), incoming: normalizedIncomingPrompt, existing: normalizedExistingPrompt };
      });

      const merged = applyMerge(normalizedExisting, normalizedIncoming, normalizedConflicts);
      const idMap = mapImportedPromptIds(normalizedIncoming, merged.prompts, normalizedConflicts);
      const addUnique = <T extends { id: string }>(current: T[], values: T[]): T[] => {
        const result = [...current]; const ids = new Set(result.map((item) => item.id));
        for (const value of values) if (!ids.has(value.id)) { result.push(value); ids.add(value.id); }
        return result;
      };

      const versions = addUnique(state.versions, (parsed?.versions ?? []).flatMap((version) => {
        const mappedPromptId = idMap.get(version.promptId); return mappedPromptId ? [{ ...version, promptId: mappedPromptId }] : [];
      }));
      const runs = addUnique(state.runs, (parsed?.runs ?? []).flatMap((run) => {
        const mappedPromptId = idMap.get(run.promptId); return mappedPromptId ? [{ ...run, promptId: mappedPromptId }] : [];
      }));
      const templates = addUnique(state.templates, parsed?.templates ?? []);
      const blocks = addUnique(state.blocks, parsed?.blocks ?? []);
      const modelProfiles = addUnique(state.modelProfiles, parsed?.modelProfiles ?? []);
      const nextPrompts = merged.prompts.map((prompt) => canonicalizePrompts([prompt], folders)[0]);

      set({ prompts: nextPrompts, folders: normalizeFolders(folders), versions, templates, blocks, modelProfiles, runs, tags: recomputeTags(nextPrompts) });
      return { foldersCreated, imported: merged.imported, skipped: merged.skipped, replaced: merged.replaced };
    },

    exportData: () => {
      const state = get();
      const data = {
        prompts: canonicalizePrompts(state.prompts.map(clonePrompt), state.folders),
        folders: normalizeFolders(state.folders),
        versions: state.versions,
        templates: state.templates,
        blocks: state.blocks,
        modelProfiles: state.modelProfiles,
        runs: state.runs,
      };
      return {
        ...data,
        errors: [],
      };
    },
  };
};

const stateFolderId = (value: string, folders: Folder[]): string | undefined => {
  if (folders.some((folder) => folder.id === value)) return value;
  return folders.find((folder) => folder.name === value)?.id;
};

export const usePromtovaStore = create<PromptStoreState>()(
  persist((set, get) => createStoreState(set, get), {
    name: 'promtova-state',
    version: 3,
    storage: createJSONStorage(() => nativeStorage),
    partialize: (state) => ({
      prompts: state.prompts,
      folders: state.folders,
      versions: state.versions,
      templates: state.templates,
      blocks: state.blocks,
      modelProfiles: state.modelProfiles,
      runs: state.runs,
      selectedFolderId: state.selectedFolderId,
      editorMode: state.editorMode,
      sortBy: state.sortBy,
      autosave: state.autosave,
      editorFontSize: state.editorFontSize,
    }),
    migrate: (persisted) => {
      const raw = (persisted ?? {}) as Record<string, unknown>;
      const folders = normalizeFolders((Array.isArray(raw.folders) ? raw.folders : []).map(normalizeFolder).filter((item): item is Folder => item !== null));
      const usableFolders = folders.length ? folders : initialFolders;
      const prompts = canonicalizePrompts((Array.isArray(raw.prompts) ? raw.prompts : []).map((item) => normalizePrompt(item)).filter((item): item is Prompt => item !== null), usableFolders);
      let selectedFolderId = typeof raw.selectedFolderId === 'string' ? raw.selectedFolderId : typeof raw.selectedFolder === 'string' ? raw.selectedFolder : 'all';
      if (selectedFolderId !== 'all' && selectedFolderId !== 'starred' && !usableFolders.some((folder) => folder.id === selectedFolderId)) selectedFolderId = usableFolders.find((folder) => folder.name === selectedFolderId)?.id ?? 'all';
      return {
        prompts: prompts.length ? prompts : initialPrompts,
        folders: usableFolders,
        versions: Array.isArray(raw.versions) ? raw.versions as PromptVersion[] : [],
        templates: Array.isArray(raw.templates) ? raw.templates as PromptTemplate[] : [],
        blocks: Array.isArray(raw.blocks) ? raw.blocks as ReturnType<typeof createPromptBlock>[] : [],
        modelProfiles: Array.isArray(raw.modelProfiles) ? raw.modelProfiles as ModelProfile[] : [],
        runs: Array.isArray(raw.runs) ? raw.runs as PromptRun[] : [],
        selectedFolderId,
        editorMode: raw.editorMode === 'view' || raw.editorMode === 'split' ? raw.editorMode : 'edit',
        sortBy: raw.sortBy === 'created' || raw.sortBy === 'title' || raw.sortBy === 'usage' ? raw.sortBy : 'updated',
        autosave: raw.autosave !== false,
        editorFontSize: typeof raw.editorFontSize === 'number' ? Math.min(20, Math.max(10, raw.editorFontSize)) : 13,
      };
    },
    merge: (persisted, current) => {
      const state = { ...current, ...(persisted as Partial<PromptStoreState>) } as PromptStoreState;
      state.prompts = canonicalizePrompts(state.prompts ?? [], state.folders ?? initialFolders);
      state.tags = recomputeTags(state.prompts);
      state.activeTagFilters = [];
      state.searchQuery = '';
      state.selectedPromptId = state.prompts.some((prompt) => prompt.id === state.selectedPromptId) ? state.selectedPromptId : (state.prompts[0]?.id ?? null);
      return state;
    },
  }),
);

interface ThemeState {
  currentTheme: string;
  customThemes: CustomTheme[];
  setTheme: (id: string) => void;
  addCustomTheme: (theme: CustomTheme) => void;
  removeCustomTheme: (id: string) => void;
}

const presetThemes: Record<string, Record<string, string>> = {
  warm: { 'bg-primary':'#1A0F0A','bg-sidebar':'#1F1308','bg-panel':'#241708','bg-elevated':'#2A1B0C','bg-hover':'#2F1F10','bg-active':'#352414','accent-primary':'#FF9B3D','accent-hover':'#FFAB55','accent-subtle':'#3D2518','text-primary':'#FFE9D2','text-secondary':'#C9A88A','text-muted':'#8A6E58','border-primary':'#3D2A1A','border-subtle':'#2A1B0C' },
  ocean: { 'bg-primary':'#0A1118','bg-sidebar':'#0C141E','bg-panel':'#0F1825','bg-elevated':'#131D2C','bg-hover':'#172233','bg-active':'#1B2739','accent-primary':'#3DA8FF','accent-hover':'#61B8FF','accent-subtle':'#112942','text-primary':'#E2F1FF','text-secondary':'#A7C0D6','text-muted':'#6F8A9F','border-primary':'#203447','border-subtle':'#162735' },
  mint: { 'bg-primary':'#0A1410','bg-sidebar':'#0C1814','bg-panel':'#0F1E18','bg-elevated':'#13261F','bg-hover':'#172D26','bg-active':'#1B352D','accent-primary':'#3DC9A8','accent-hover':'#52D8B8','accent-subtle':'#0F2A22','text-primary':'#E0F5ED','text-secondary':'#A0C7BA','text-muted':'#688A7D','border-primary':'#1E3A30','border-subtle':'#142822' },
  lavender: { 'bg-primary':'#120A18','bg-sidebar':'#160C1E','bg-panel':'#1A0F25','bg-elevated':'#1F132D','bg-hover':'#241736','bg-active':'#291B3F','accent-primary':'#B07AFF','accent-hover':'#C094FF','accent-subtle':'#241636','text-primary':'#EFE3FF','text-secondary':'#B8A5D4','text-muted':'#7C6A95','border-primary':'#2D1F3F','border-subtle':'#1F142A' },
  mono: { 'bg-primary':'#000000','bg-sidebar':'#0A0A0A','bg-panel':'#111111','bg-elevated':'#1A1A1A','bg-hover':'#222222','bg-active':'#2A2A2A','accent-primary':'#FFFFFF','accent-hover':'#E5E5E5','accent-subtle':'#1A1A1A','text-primary':'#FFFFFF','text-secondary':'#B0B0B0','text-muted':'#707070','border-primary':'#2A2A2A','border-subtle':'#1A1A1A' },
};

export const applyTheme = (themeId: string, customThemes: CustomTheme[] = []) => {
  const root = document.documentElement;
  root.setAttribute('data-theme', themeId);
  const theme = themeId.startsWith('custom-') ? customThemes.find((item) => item.id === themeId)?.colors : presetThemes[themeId];
  if (theme) Object.entries(theme).forEach(([key, value]) => root.style.setProperty(`--${key}`, value));
  else if (!themeId.startsWith('custom-')) ['bg-primary','bg-sidebar','bg-panel','bg-elevated','bg-hover','bg-active','accent-primary','accent-hover','accent-subtle','text-primary','text-secondary','text-muted','border-primary','border-subtle'].forEach((key) => root.style.removeProperty(`--${key}`));
};

export const presetThemeIds = ['dark', 'light', 'warm', 'ocean', 'mint', 'lavender', 'mono'];

export interface Toast { id: number; type: 'success' | 'error' | 'warning' | 'info'; message: string; }
interface UIState {
  settingsOpen: boolean; exportOpen: boolean; folderModalOpen: boolean; tagModalOpen: boolean; themeEditorOpen: boolean; shortcutsOpen: boolean;
  folderModalParentId: string | null; renameFolderId: string | null; renamePromptId: PromptId | null; deleteFolderId: string | null; mergeImport: ParsedImport | null; toasts: Toast[];
  openSettings: () => void; closeSettings: () => void; openExport: () => void; closeExport: () => void; openFolderModal: (parentId?: string | null) => void; closeFolderModal: () => void;
  openTagModal: () => void; closeTagModal: () => void; openThemeEditor: () => void; closeThemeEditor: () => void; openShortcuts: () => void; closeShortcuts: () => void;
  openRenameFolder: (id: string) => void; closeRenameFolder: () => void; openRenamePrompt: (id: PromptId) => void; closeRenamePrompt: () => void; openDeleteFolder: (id: string) => void; closeDeleteFolder: () => void;
  openMerge: (data: ParsedImport) => void; closeMerge: () => void; pushToast: (toast: Omit<Toast, 'id'>) => void; dismissToast: (id: number) => void;
}

let toastCounter = 0;
export const useUIStore = create<UIState>((set) => ({
  settingsOpen: false, exportOpen: false, folderModalOpen: false, tagModalOpen: false, themeEditorOpen: false, shortcutsOpen: false,
  folderModalParentId: null, renameFolderId: null, renamePromptId: null, deleteFolderId: null, mergeImport: null, toasts: [],
  openSettings: () => set({ settingsOpen: true }), closeSettings: () => set({ settingsOpen: false }), openExport: () => set({ exportOpen: true }), closeExport: () => set({ exportOpen: false }),
  openFolderModal: (parentId = null) => set({ folderModalOpen: true, folderModalParentId: parentId }), closeFolderModal: () => set({ folderModalOpen: false, folderModalParentId: null }),
  openTagModal: () => set({ tagModalOpen: true }), closeTagModal: () => set({ tagModalOpen: false }), openThemeEditor: () => set({ themeEditorOpen: true }), closeThemeEditor: () => set({ themeEditorOpen: false }),
  openShortcuts: () => set({ shortcutsOpen: true }), closeShortcuts: () => set({ shortcutsOpen: false }), openRenameFolder: (id) => set({ renameFolderId: id }), closeRenameFolder: () => set({ renameFolderId: null }),
  openRenamePrompt: (id) => set({ renamePromptId: id }), closeRenamePrompt: () => set({ renamePromptId: null }), openDeleteFolder: (id) => set({ deleteFolderId: id }), closeDeleteFolder: () => set({ deleteFolderId: null }),
  openMerge: (data) => set({ mergeImport: data }), closeMerge: () => set({ mergeImport: null }),
  pushToast: (toast) => { const id = ++toastCounter; set((state) => ({ toasts: [...state.toasts, { id, ...toast }] })); window.setTimeout(() => set((state) => ({ toasts: state.toasts.filter((item) => item.id !== id) })), 3200); },
  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((item) => item.id !== id) })),
}));

export const useThemeStore = create<ThemeState>()(
  persist((set) => ({
    currentTheme: 'dark',
    customThemes: [],
    setTheme: (id) => set({ currentTheme: id }),
    addCustomTheme: (theme) => set((state) => ({ customThemes: [...state.customThemes, theme] })),
    removeCustomTheme: (id) => set((state) => ({ customThemes: state.customThemes.filter((theme) => theme.id !== id), currentTheme: state.currentTheme === id ? 'dark' : state.currentTheme })),
  }), { name: 'promtova-theme', storage: createJSONStorage(() => nativeStorage) }),
);
