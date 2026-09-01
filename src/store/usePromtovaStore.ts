import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  CustomTheme,
  EditorMode,
  EvaluationCriterion,
  Folder,
  ModelProfile,
  Prompt,
  PromptBlock,
  PromptId,
  PromptRun,
  PromptSection,
  PromptTemplate,
  SortKey,
  Tag,
  PromptVersion,
} from '../shared/types';
import { seedFolders, seedPrompts } from './seedData';
import { nativeStorage } from '../storage/nativeStorage';
import { extractVariables, getPromptText, newId } from '../utils/promtova';
import { getDescendantIds, getSiblings, normalizeFolders } from '../utils/folders';
import { applyMerge, normalizeFolder, normalizePrompt, type MergeConflict, type ParsedImport } from '../utils/importExport';
import {
  createModelProfile,
  createPromptBlock,
  createPromptRun,
  createPromptTemplate,
  createPromptVersion,
  nextPromptVersion,
  restorePromptVersion,
  normalizeVariableSchema,
} from '../utils/promptEngineering';

export type { CustomTheme };

const recomputeTags = (prompts: Prompt[]): Tag[] => {
  const map = new Map<string, number>();
  prompts.forEach((p) => p.tags.forEach((t) => map.set(t, (map.get(t) || 0) + 1)));
  return Array.from(map.entries())
    .map(([name, count]) => ({ id: name.toLowerCase(), name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'ru'));
};

const clonePrompt = (prompt: Prompt): Prompt => ({
  ...prompt,
  tags: [...prompt.tags],
  vars: { ...prompt.vars },
  sections: prompt.sections?.map((s) => ({ ...s })),
  blockRefs: prompt.blockRefs?.map((r) => ({ ...r, overrides: r.overrides ? { ...r.overrides } : undefined })),
  dependencies: prompt.dependencies?.map((d) => ({ ...d })),
  variableSchema: prompt.variableSchema
    ? Object.fromEntries(Object.entries(prompt.variableSchema).map(([name, value]) => [name, { ...value, options: value.options ? [...value.options] : undefined }]))
    : undefined,
});

const folderForPrompt = (prompt: Prompt, folders: Folder[]): Folder | undefined => {
  if (prompt.folderId) {
    const byId = folders.find((folder) => folder.id === prompt.folderId);
    if (byId) return byId;
  }
  return folders.find((folder) => folder.name === prompt.folder);
};

const canonicalizePrompts = (prompts: Prompt[], folders: Folder[]): Prompt[] =>
  prompts.map((prompt) => {
    const folder = folderForPrompt(prompt, folders);
    return {
      ...prompt,
      folderId: folder?.id,
      folder: folder?.name ?? prompt.folder,
      path: folder?.name ? `${folder.name}/${prompt.title}` : prompt.path,
      variableSchema: prompt.variableSchema ? normalizeVariableSchema(prompt.variableSchema) : undefined,
    };
  });

const reorderSiblings = (folders: Folder[], parent: string | null, id: string, delta: -1 | 1): Folder[] => {
  const siblings = getSiblings(folders, parent);
  const index = siblings.findIndex((folder) => folder.id === id);
  const next = index + delta;
  if (index < 0 || next < 0 || next >= siblings.length) return folders;
  const ordered = [...siblings];
  [ordered[index], ordered[next]] = [ordered[next], ordered[index]];
  const orderById = new Map(ordered.map((folder, position) => [folder.id, position]));
  return folders.map((folder) => orderById.has(folder.id) ? { ...folder, order: orderById.get(folder.id)! } : folder);
};

const folderIdFromInput = (value: string | undefined, folders: Folder[]): string | undefined => {
  if (!value) return undefined;
  return folders.some((folder) => folder.id === value) ? value : folders.find((folder) => folder.name === value)?.id;
};

export interface CreateFolderOptions { parent?: string | null; icon?: string; color?: string; }

export interface PromptStoreState {
  prompts: Prompt[]; folders: Folder[]; tags: Tag[];
  versions: PromptVersion[]; templates: PromptTemplate[]; blocks: PromptBlock[]; modelProfiles: ModelProfile[]; runs: PromptRun[];
  selectedPromptId: PromptId | null; selectedFolderId: string; searchQuery: string; activeTagFilters: string[]; editorMode: EditorMode; sortBy: SortKey; isDirty: boolean; lastSavedAt: string | null; autosave: boolean; editorFontSize: number;
  selectPrompt: (id: PromptId | null) => void; createPrompt: (folder?: string) => PromptId; updatePrompt: (id: PromptId, patch: Partial<Prompt>, versionNote?: string) => void; deletePrompt: (id: PromptId) => void; duplicatePrompt: (id: PromptId) => void; renamePrompt: (id: PromptId, title: string) => void; toggleStar: (id: PromptId) => void; incrementUsage: (id: PromptId) => void; setVar: (id: PromptId, key: string, value: string) => void; pruneVars: (id: PromptId) => void;
  selectFolder: (folderId: string) => void; createFolder: (name: string, opts?: CreateFolderOptions) => void; renameFolder: (id: string, newName: string) => void; deleteFolder: (id: string) => void; moveFolderUp: (id: string) => void; moveFolderDown: (id: string) => void; updateFolderStyle: (id: string, patch: { icon?: string; color?: string }) => void; countFolderPrompts: (id: string) => number; movePromptToFolder: (id: PromptId, folder: string) => void;
  toggleTagFilter: (tag: string) => void; clearTagFilters: () => void; addTagToPrompt: (id: PromptId, tag: string) => void; removeTagFromPrompt: (id: PromptId, tag: string) => void;
  setSearchQuery: (q: string) => void; setEditorMode: (m: EditorMode) => void; setSortBy: (s: SortKey) => void; setDirty: (d: boolean) => void; markSaved: () => void; setAutosave: (v: boolean) => void; setEditorFontSize: (v: number) => void;
  saveVersion: (promptId?: PromptId, note?: string) => PromptVersion | null; restoreVersion: (promptId: PromptId, versionId: string, note?: string) => Prompt | null; addTemplate: (name: string, description?: string, sections?: PromptSection[]) => string; updateTemplate: (id: string, patch: Partial<PromptTemplate>) => void; applyTemplateToPrompt: (promptId: PromptId, templateId: string, versionNote?: string) => void; addBlock: (name: string, content?: string, description?: string) => string; updateBlock: (id: string, patch: Partial<PromptBlock>) => void; addBlockToPrompt: (promptId: PromptId, blockId: string, overrides?: Record<string, string>) => void; removeBlockFromPrompt: (promptId: PromptId, blockId: string) => void; addModelProfile: (name: string, provider: ModelProfile['provider'], model: string) => string; updateModelProfile: (id: string, patch: Partial<ModelProfile>) => void; recordRun: (promptId: PromptId, options?: Parameters<typeof createPromptRun>[1]) => string | null; updateRunEvaluation: (runId: string, score: number | undefined, criteria: EvaluationCriterion[]) => void;
  applyImport: (incoming: Prompt[], conflicts: MergeConflict[], incomingFolders: Folder[], parsed?: ParsedImport) => { foldersCreated: number; imported: number; skipped: number; replaced: number }; exportData: () => ParsedImport;
}

const initialFolders = normalizeFolders(seedFolders);
const initialPrompts = canonicalizePrompts(seedPrompts, initialFolders);

const createStoreState = (set: any, get: any): PromptStoreState => {
  const commitUpdate = (id: PromptId, patch: Partial<Prompt>, versionNote = '') => {
    set((state: PromptStoreState) => {
      const current = state.prompts.find((prompt) => prompt.id === id);
      if (!current) return state;
      const next = canonicalizePrompts([{ ...current, ...patch, updatedAt: new Date().toISOString() }], state.folders)[0];
      const changed = JSON.stringify({ ...current, updatedAt: undefined }) !== JSON.stringify({ ...next, updatedAt: undefined });
      if (!changed) return state;

      // The first mutation after a save creates a snapshot of the pre-edit state.
      const version = !state.isDirty ? createPromptVersion(current, nextPromptVersion(state.versions, id), versionNote) : null;
      return {
        prompts: state.prompts.map((prompt) => prompt.id === id ? next : prompt),
        versions: version ? [...state.versions, version] : state.versions,
        tags: recomputeTags(state.prompts.map((prompt) => prompt.id === id ? next : prompt)),
        isDirty: true,
      };
    });
  };

  return {
    prompts: initialPrompts, folders: initialFolders, tags: recomputeTags(initialPrompts), versions: [], templates: [], blocks: [], modelProfiles: [], runs: [],
    selectedPromptId: initialPrompts[0]?.id ?? null, selectedFolderId: 'all', searchQuery: '', activeTagFilters: [], editorMode: 'edit', sortBy: 'updated', isDirty: false, lastSavedAt: null, autosave: true, editorFontSize: 13,

    selectPrompt: (id: PromptId | null) => set({ selectedPromptId: id, isDirty: false }),
    createPrompt: (folderInput = 'Development') => {
      const state = get(); const target = state.folders.find((folder: Folder) => folder.id === folderInput) ?? state.folders.find((folder: Folder) => folder.name === folderInput) ?? state.folders[0]; const now = new Date().toISOString(); const prompt: Prompt = {
        id: newId(), title: 'Новый промпт', tags: [], preview: '', path: `${target?.name ?? 'Development'}/Новый промпт`, content: '# Новый промпт\n\nОпишите здесь ваш промпт…\n\nИспользуйте переменные в формате {{имя_переменной}} для подстановки.\n', folderId: target?.id, folder: target?.name ?? 'Development', vars: {}, starred: false, createdAt: now, updatedAt: now, usageCount: 0,
      }; set((state: PromptStoreState) => ({ prompts: [prompt, ...state.prompts], selectedPromptId: prompt.id, tags: recomputeTags([prompt, ...state.prompts]), isDirty: false })); return prompt.id;
    },
    updatePrompt: (id, patch, versionNote = '') => commitUpdate(id, patch, versionNote),
    deletePrompt: (id) => set((state: PromptStoreState) => { const prompts = state.prompts.filter((prompt) => prompt.id !== id); return { prompts, versions: state.versions.filter((version) => version.promptId !== id), runs: state.runs.filter((run) => run.promptId !== id), tags: recomputeTags(prompts), selectedPromptId: state.selectedPromptId === id ? (prompts[0]?.id ?? null) : state.selectedPromptId }; }),
    duplicatePrompt: (id) => { const source = get().prompts.find((prompt: Prompt) => prompt.id === id); if (!source) return; const copy = clonePrompt(source); const now = new Date().toISOString(); copy.id = newId(); copy.title = `${source.title} (копия)`; copy.createdAt = now; copy.updatedAt = now; copy.usageCount = 0; copy.starred = false; set((state: PromptStoreState) => ({ prompts: [copy, ...state.prompts], tags: recomputeTags([copy, ...state.prompts]), selectedPromptId: copy.id, isDirty: false })); },
    renamePrompt: (id, title) => commitUpdate(id, { title: title.trim() }, 'Rename prompt'),
    toggleStar: (id) => { const prompt = get().prompts.find((item: Prompt) => item.id === id); if (prompt) commitUpdate(id, { starred: !prompt.starred }, 'Toggle star'); },
    incrementUsage: (id) => { const prompt = get().prompts.find((item: Prompt) => item.id === id); if (prompt) commitUpdate(id, { usageCount: prompt.usageCount + 1 }, 'Usage increment'); },
    setVar: (id, key, value) => { const prompt = get().prompts.find((item: Prompt) => item.id === id); if (prompt) commitUpdate(id, { vars: { ...prompt.vars, [key]: value } }, 'Update variable'); },
    pruneVars: (id) => { const prompt = get().prompts.find((item: Prompt) => item.id === id); if (!prompt) return; const used = new Set(extractVariables(getPromptText(prompt))); commitUpdate(id, { vars: Object.fromEntries(Object.entries(prompt.vars).filter(([key]) => used.has(key))) }, 'Prune variables'); },

    selectFolder: (id) => set({ selectedFolderId: id, activeTagFilters: [] }),
    createFolder: (name, opts = {}) => { const clean = name.trim(); if (!clean) return; const state = get(); const parent = opts.parent ?? null; if (state.folders.some((folder: Folder) => folder.name === clean && (folder.parent ?? null) === parent)) return; const folder: Folder = { id: newId(), name: clean, parent, children: [], icon: opts.icon ?? 'Folder', color: opts.color ?? '#FF6B35', order: getSiblings(state.folders, parent).length }; const withParent = parent ? state.folders.map((item: Folder) => item.id === parent ? { ...item, children: [...item.children, folder.id] } : item) : state.folders; set({ folders: normalizeFolders([...withParent, folder]) }); },
    renameFolder: (id, newName) => { const clean = newName.trim(); if (!clean) return; set((state: PromptStoreState) => { const folder = state.folders.find((item: Folder) => item.id === id); if (!folder || folder.name === clean) return state; const folders = state.folders.map((item: Folder) => item.id === id ? { ...item, name: clean } : item); const prompts = canonicalizePrompts(state.prompts, state.folders).map((prompt) => prompt.folderId === id ? { ...prompt, folder: clean, path: `${clean}/${prompt.title}`, updatedAt: new Date().toISOString() } : prompt); return { folders, prompts, tags: recomputeTags(prompts) }; }); },
    deleteFolder: (id) => set((state: PromptStoreState) => { const removedIds = new Set([id, ...getDescendantIds(state.folders, id)]); const folders = normalizeFolders(state.folders.filter((folder: Folder) => !removedIds.has(folder.id)).map((folder: Folder) => ({ ...folder, children: folder.children.filter((child) => !removedIds.has(child)) }))); const prompts = canonicalizePrompts(state.prompts, state.folders).filter((prompt) => !removedIds.has(prompt.folderId ?? '')); const kept = new Set(prompts.map((prompt) => prompt.id)); return { folders, prompts, tags: recomputeTags(prompts), versions: state.versions.filter((version) => kept.has(version.promptId)), runs: state.runs.filter((run) => kept.has(run.promptId)), selectedFolderId: removedIds.has(state.selectedFolderId) ? 'all' : state.selectedFolderId, selectedPromptId: prompts.some((prompt) => prompt.id === state.selectedPromptId) ? state.selectedPromptId : (prompts[0]?.id ?? null) }; }),
    moveFolderUp: (id) => set((state: PromptStoreState) => ({ folders: reorderSiblings(state.folders, state.folders.find((folder: Folder) => folder.id === id)?.parent ?? null, id, -1) })),
    moveFolderDown: (id) => set((state: PromptStoreState) => ({ folders: reorderSiblings(state.folders, state.folders.find((folder: Folder) => folder.id === id)?.parent ?? null, id, 1) })),
    updateFolderStyle: (id, patch) => set((state: PromptStoreState) => ({ folders: state.folders.map((folder: Folder) => folder.id === id ? { ...folder, ...patch } : folder) })),
    countFolderPrompts: (id) => { const state = get(); const ids = new Set([id, ...getDescendantIds(state.folders, id)]); return canonicalizePrompts(state.prompts, state.folders).filter((prompt) => ids.has(prompt.folderId ?? '')).length; },
    movePromptToFolder: (id, folderInput) => { const folderId = folderIdFromInput(folderInput, get().folders); if (folderId) commitUpdate(id, { folderId }, 'Move prompt to folder'); },

    toggleTagFilter: (tag) => set((state: PromptStoreState) => ({ activeTagFilters: state.activeTagFilters.includes(tag) ? state.activeTagFilters.filter((t) => t !== tag) : [...state.activeTagFilters, tag] })),
    clearTagFilters: () => set({ activeTagFilters: [] }),
    addTagToPrompt: (id, tag) => { const clean = tag.replace(/^#/, '').trim(); if (!clean) return; const p = get().prompts.find((x: Prompt) => x.id === id); if (p && !p.tags.includes(clean)) commitUpdate(id, { tags: [...p.tags, clean] }, 'Add tag'); },
    removeTagFromPrompt: (id, tag) => { const p = get().prompts.find((x: Prompt) => x.id === id); if (p) commitUpdate(id, { tags: p.tags.filter((t) => t !== tag) }, 'Remove tag'); },

    setSearchQuery: (q) => set({ searchQuery: q }), setEditorMode: (m) => set({ editorMode: m }), setSortBy: (s) => set({ sortBy: s }), setDirty: (d) => set({ isDirty: d }), markSaved: () => set({ isDirty: false, lastSavedAt: new Date().toISOString() }), setAutosave: (v) => set({ autosave: v }), setEditorFontSize: (v) => set({ editorFontSize: Math.min(20, Math.max(10, Math.round(v))) }),

    saveVersion: (promptId = get().selectedPromptId ?? '', note = '') => { const prompt = get().prompts.find((item: Prompt) => item.id === promptId); if (!prompt) return null; const version = createPromptVersion(prompt, nextPromptVersion(get().versions, promptId), note); set((state: PromptStoreState) => ({ versions: [...state.versions, version], isDirty: false, lastSavedAt: new Date().toISOString() })); return version; },
    restoreVersion: (promptId, versionId, note = 'Restore version') => { const state = get(); const prompt = state.prompts.find((item: Prompt) => item.id === promptId); const version = state.versions.find((item: PromptVersion) => item.id === versionId && item.promptId === promptId); if (!prompt || !version) return null; const snapshot = createPromptVersion(prompt, nextPromptVersion(state.versions, promptId), note); const restored = restorePromptVersion(prompt, version); set((current: PromptStoreState) => { const prompts = current.prompts.map((item) => item.id === promptId ? restored : item); return { prompts, versions: [...current.versions, snapshot], tags: recomputeTags(prompts), isDirty: false, lastSavedAt: new Date().toISOString() }; }); return restored; },

    addTemplate: (name, description = '', sections = []) => { const template = createPromptTemplate(name, sections, description); set((state: PromptStoreState) => ({ templates: [...state.templates, template] })); return template.id; },
    updateTemplate: (id, patch) => set((state: PromptStoreState) => ({ templates: state.templates.map((item: PromptTemplate) => item.id === id ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item) })),
    applyTemplateToPrompt: (promptId, templateId, versionNote = 'Apply template') => { const template = get().templates.find((item: PromptTemplate) => item.id === templateId); if (template) commitUpdate(promptId, { templateId, sections: template.sections.map((s) => ({ ...s })), useTemplate: true }, versionNote); },
    addBlock: (name, content = '', description = '') => { const block = createPromptBlock(name, content, description); set((state: PromptStoreState) => ({ blocks: [...state.blocks, block] })); return block.id; },
    updateBlock: (id, patch) => set((state: PromptStoreState) => ({ blocks: state.blocks.map((item: PromptBlock) => item.id === id ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item) })),
    addBlockToPrompt: (promptId, blockId, overrides) => { const prompt = get().prompts.find((item: Prompt) => item.id === promptId); if (!prompt || !get().blocks.some((block: PromptBlock) => block.id === blockId)) return; const refs = [...(prompt.blockRefs ?? [])].filter((ref) => ref.blockId !== blockId); refs.push({ blockId, order: refs.length, overrides }); commitUpdate(promptId, { blockRefs: refs }, 'Add prompt block'); },
    removeBlockFromPrompt: (promptId, blockId) => { const prompt = get().prompts.find((item: Prompt) => item.id === promptId); if (!prompt) return; const refs = (prompt.blockRefs ?? []).filter((ref) => ref.blockId !== blockId).map((ref, index) => ({ ...ref, order: index })); commitUpdate(promptId, { blockRefs: refs }, 'Remove prompt block'); },

    addModelProfile: (name, provider, model) => { const profile = createModelProfile(name, provider, model); set((state: PromptStoreState) => ({ modelProfiles: [...state.modelProfiles, profile] })); return profile.id; },
    updateModelProfile: (id, patch) => set((state: PromptStoreState) => ({ modelProfiles: state.modelProfiles.map((item: ModelProfile) => item.id === id ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item) })),
    recordRun: (promptId, options = {}) => { const prompt = get().prompts.find((item: Prompt) => item.id === promptId); if (!prompt) return null; const versionId = options.versionId ?? get().versions.filter((v) => v.promptId === promptId).at(-1)?.id; const run = createPromptRun(prompt, { ...options, versionId }); set((state: PromptStoreState) => ({ runs: [run, ...state.runs] })); return run.id; },
    updateRunEvaluation: (runId, score, criteria) => set((state: PromptStoreState) => ({ runs: state.runs.map((run: PromptRun) => run.id === runId ? { ...run, score, criteria } : run) })),

    applyImport: (incoming, conflicts, incomingFolders, parsed) => {
      const state = get(); const folders = normalizeFolders([...state.folders]); const folderIdMap = new Map<string, string>(); const existingByNameParent = new Map(folders.map((folder) => [`${folder.parent ?? 'root'}\u0000${folder.name}`, folder])); let foldersCreated = 0;
      for (const source of incomingFolders) {
        const key = `${source.parent ?? 'root'}\u0000${source.name}`; const existing = existingByNameParent.get(key);
        if (existing) { folderIdMap.set(source.id, existing.id); continue; }
        if (folders.some((folder) => folder.id === source.id)) { folderIdMap.set(source.id, source.id); continue; }
        let parentId = source.parent ? (folderIdMap.get(source.parent) ?? source.parent) : null; if (parentId && !folders.some((folder) => folder.id === parentId)) parentId = null;
        const created: Folder = { ...source, id: source.id || newId(), parent: parentId, children: [], order: getSiblings(folders, parentId).length }; folders.push(created); folderIdMap.set(source.id, created.id); existingByNameParent.set(`${parentId ?? 'root'}\u0000${created.name}`, created); foldersCreated++;
      }
      const normalizedIncoming = canonicalizePrompts(incoming.map((prompt) => ({ ...prompt, folderId: prompt.folderId ? (folderIdMap.get(prompt.folderId) ?? prompt.folderId) : prompt.folderId })), folders); const normalizedExisting = canonicalizePrompts(state.prompts, folders); const merged = applyMerge(normalizedExisting, normalizedIncoming, conflicts); const keep = new Set(merged.prompts.map((prompt) => prompt.id)); const normalizedParsed = parsed ?? null;
      const addUnique = <T extends { id: string }>(current: T[], values: T[]) => { const result = [...current]; const ids = new Set(current.map((item) => item.id)); for (const value of values) if (!ids.has(value.id)) { result.push(value); ids.add(value.id); } return result; };
      const remapVersions = (normalizedParsed?.versions ?? []).map((version) => { const prompt = normalizedIncoming.find((item) => item.id === version.promptId); const target = prompt ? merged.prompts.find((item) => item.title === prompt.title && item.folderId === prompt.folderId) : undefined; return target ? { ...version, promptId: target.id } : version; });
      const versions = addUnique(state.versions, remapVersions.filter((version) => keep.has(version.promptId)));
      const templates = addUnique(state.templates, normalizedParsed?.templates ?? []);
      const blocks = addUnique(state.blocks, normalizedParsed?.blocks ?? []);
      const modelProfiles = addUnique(state.modelProfiles, normalizedParsed?.modelProfiles ?? []);
      const runs = addUnique(state.runs, (normalizedParsed?.runs ?? []).filter((run) => keep.has(run.promptId)));
      set({ prompts: merged.prompts, folders: normalizeFolders(folders), versions, templates, blocks, modelProfiles, runs, tags: recomputeTags(merged.prompts) }); return { foldersCreated, imported: merged.imported, skipped: merged.skipped, replaced: merged.replaced };
    },

    exportData: () => { const state = get(); return { prompts: canonicalizePrompts(state.prompts.map(clonePrompt), state.folders), folders: normalizeFolders(state.folders), versions: state.versions.map((v) => ({ ...v, sections: v.sections.map((s) => ({ ...s })), variables: v.variables.map((x) => ({ ...x })), legacy: { ...v.legacy } })), templates: state.templates.map((t) => ({ ...t, sections: t.sections.map((s) => ({ ...s })) })), blocks: state.blocks.map((b) => ({ ...b, tags: [...b.tags], variables: b.variables.map((x) => ({ ...x })) })), modelProfiles: state.modelProfiles.map((m) => ({ ...m, capabilities: m.capabilities ? [...m.capabilities] : undefined, params: m.params ? { ...m.params } : undefined })), runs: state.runs.map((r) => ({ ...r, input: { ...r.input }, criteria: r.criteria.map((c) => ({ ...c })), tokenUsage: r.tokenUsage ? { ...r.tokenUsage } : undefined })) }; },
  };
};

export const usePromtovaStore = create<PromptStoreState>()(persist((set, get) => createStoreState(set, get), {
  name: 'promtova-state', version: 3, storage: createJSONStorage(() => nativeStorage),
  partialize: (state) => ({ prompts: state.prompts, folders: state.folders, versions: state.versions, templates: state.templates, blocks: state.blocks, modelProfiles: state.modelProfiles, runs: state.runs, selectedFolderId: state.selectedFolderId, editorMode: state.editorMode, sortBy: state.sortBy, autosave: state.autosave, editorFontSize: state.editorFontSize }),
  migrate: (persisted) => {
    const raw = (persisted ?? {}) as Record<string, unknown>; const folders = normalizeFolders((Array.isArray(raw.folders) ? raw.folders : []).map(normalizeFolder).filter((x): x is Folder => x !== null)); const usableFolders = folders.length ? folders : initialFolders; const prompts = canonicalizePrompts((Array.isArray(raw.prompts) ? raw.prompts : []).map((item) => normalizePrompt(item)).filter((x): x is Prompt => x !== null), usableFolders);
    let selectedFolderId = typeof raw.selectedFolderId === 'string' ? raw.selectedFolderId : typeof raw.selectedFolder === 'string' ? raw.selectedFolder : 'all'; if (selectedFolderId !== 'all' && selectedFolderId !== 'starred' && !usableFolders.some((folder) => folder.id === selectedFolderId)) selectedFolderId = usableFolders.find((folder) => folder.name === selectedFolderId)?.id ?? 'all';
    return { prompts: prompts.length ? prompts : initialPrompts, folders: usableFolders, versions: Array.isArray(raw.versions) ? raw.versions as PromptVersion[] : [], templates: Array.isArray(raw.templates) ? raw.templates as PromptTemplate[] : [], blocks: Array.isArray(raw.blocks) ? raw.blocks as PromptBlock[] : [], modelProfiles: Array.isArray(raw.modelProfiles) ? raw.modelProfiles as ModelProfile[] : [], runs: Array.isArray(raw.runs) ? raw.runs as PromptRun[] : [], selectedFolderId, editorMode: raw.editorMode === 'view' || raw.editorMode === 'split' ? raw.editorMode : 'edit', sortBy: raw.sortBy === 'created' || raw.sortBy === 'title' || raw.sortBy === 'usage' ? raw.sortBy : 'updated', autosave: raw.autosave !== false, editorFontSize: typeof raw.editorFontSize === 'number' ? Math.min(20, Math.max(10, raw.editorFontSize)) : 13 };
  },
  merge: (persisted, current) => { const state = { ...current, ...(persisted as Partial<PromptStoreState>) } as PromptStoreState; state.prompts = canonicalizePrompts(state.prompts ?? [], state.folders ?? initialFolders); state.tags = recomputeTags(state.prompts); state.activeTagFilters = []; state.searchQuery = ''; state.selectedPromptId = state.prompts.some((p) => p.id === state.selectedPromptId) ? state.selectedPromptId : (state.prompts[0]?.id ?? null); return state; },
}));

interface ThemeState { currentTheme: string; customThemes: CustomTheme[]; setTheme: (id: string) => void; addCustomTheme: (theme: CustomTheme) => void; removeCustomTheme: (id: string) => void; }
const presetThemes: Record<string, Record<string, string>> = {
  warm: { 'bg-primary':'#1A0F0A','bg-sidebar':'#1F1308','bg-panel':'#241708','bg-elevated':'#2A1B0C','bg-hover':'#2F1F10','bg-active':'#352414','accent-primary':'#FF9B3D','accent-hover':'#FFAB55','accent-subtle':'#3D2518','text-primary':'#FFE9D2','text-secondary':'#C9A88A','text-muted':'#8A6E58','border-primary':'#3D2A1A','border-subtle':'#2A1B0C' },
  ocean: { 'bg-primary':'#0A1118','bg-sidebar':'#0C141E','bg-panel':'#0F1825','bg-elevated':'#131D2C','bg-hover':'#172233','bg-active':'#1B2739','accent-primary':'#3DA8FF','accent-hover':'#61B8FF','accent-subtle':'#112942','text-primary':'#E2F1FF','text-secondary':'#A7C0D6','text-muted':'#6F8A9F','border-primary':'#203447','border-subtle':'#162735' },
  mint: { 'bg-primary':'#0A1410','bg-sidebar':'#0C1814','bg-panel':'#0F1E18','bg-elevated':'#13261F','bg-hover':'#172D26','bg-active':'#1B352D','accent-primary':'#3DC9A8','accent-hover':'#52D8B8','accent-subtle':'#0F2A22','text-primary':'#E0F5ED','text-secondary':'#A0C7BA','text-muted':'#688A7D','border-primary':'#1E3A30','border-subtle':'#142822' },
  lavender: { 'bg-primary':'#120A18','bg-sidebar':'#160C1E','bg-panel':'#1A0F25','bg-elevated':'#1F132D','bg-hover':'#241736','bg-active':'#291B3F','accent-primary':'#B07AFF','accent-hover':'#C094FF','accent-subtle':'#241636','text-primary':'#EFE3FF','text-secondary':'#B8A5D4','text-muted':'#7C6A95','border-primary':'#2D1F3F','border-subtle':'#1F142A' },
  mono: { 'bg-primary':'#000000','bg-sidebar':'#0A0A0A','bg-panel':'#111111','bg-elevated':'#1A1A1A','bg-hover':'#222222','bg-active':'#2A2A2A','accent-primary':'#FFFFFF','accent-hover':'#E5E5E5','accent-subtle':'#1A1A1A','text-primary':'#FFFFFF','text-secondary':'#B0B0B0','text-muted':'#707070','border-primary':'#2A2A2A','border-subtle':'#1A1A1A' },
};
export const applyTheme = (themeId: string, customThemes: CustomTheme[] = []) => { const root = document.documentElement; root.setAttribute('data-theme', themeId); if (themeId.startsWith('custom-')) { const theme = customThemes.find((t) => t.id === themeId); if (theme) Object.entries(theme.colors).forEach(([k,v]) => root.style.setProperty(`--${k}`,v)); return; } const preset = presetThemes[themeId]; if (preset) { Object.entries(preset).forEach(([k,v]) => root.style.setProperty(`--${k}`,v)); return; } ['bg-primary','bg-sidebar','bg-panel','bg-elevated','bg-hover','bg-active','accent-primary','accent-hover','accent-subtle','text-primary','text-secondary','text-muted','border-primary','border-subtle'].forEach((v) => root.style.removeProperty(`--${v}`)); };
export const presetThemeIds = ['dark','light','warm','ocean','mint','lavender','mono'];

export interface Toast { id: number; type: 'success'|'error'|'warning'|'info'; message: string; }
interface UIState { settingsOpen:boolean; exportOpen:boolean; folderModalOpen:boolean; tagModalOpen:boolean; themeEditorOpen:boolean; shortcutsOpen:boolean; folderModalParentId:string|null; renameFolderId:string|null; renamePromptId:PromptId|null; deleteFolderId:string|null; mergeImport:ParsedImport|null; toasts:Toast[]; openSettings:()=>void; closeSettings:()=>void; openExport:()=>void; closeExport:()=>void; openFolderModal:(parentId?:string|null)=>void; closeFolderModal:()=>void; openTagModal:()=>void; closeTagModal:()=>void; openThemeEditor:()=>void; closeThemeEditor:()=>void; openShortcuts:()=>void; closeShortcuts:()=>void; openRenameFolder:(id:string)=>void; closeRenameFolder:()=>void; openRenamePrompt:(id:PromptId)=>void; closeRenamePrompt:()=>void; openDeleteFolder:(id:string)=>void; closeDeleteFolder:()=>void; openMerge:(data:ParsedImport)=>void; closeMerge:()=>void; pushToast:(t:Omit<Toast,'id'>)=>void; dismissToast:(id:number)=>void; }
let toastCounter = 0;
export const useUIStore = create<UIState>((set) => ({ settingsOpen:false,exportOpen:false,folderModalOpen:false,tagModalOpen:false,themeEditorOpen:false,shortcutsOpen:false,folderModalParentId:null,renameFolderId:null,renamePromptId:null,deleteFolderId:null,mergeImport:null,toasts:[], openSettings:()=>set({settingsOpen:true}),closeSettings:()=>set({settingsOpen:false}),openExport:()=>set({exportOpen:true}),closeExport:()=>set({exportOpen:false}),openFolderModal:(parentId=null)=>set({folderModalOpen:true,folderModalParentId:parentId}),closeFolderModal:()=>set({folderModalOpen:false,folderModalParentId:null}),openTagModal:()=>set({tagModalOpen:true}),closeTagModal:()=>set({tagModalOpen:false}),openThemeEditor:()=>set({themeEditorOpen:true}),closeThemeEditor:()=>set({themeEditorOpen:false}),openShortcuts:()=>set({shortcutsOpen:true}),closeShortcuts:()=>set({shortcutsOpen:false}),openRenameFolder:(id)=>set({renameFolderId:id}),closeRenameFolder:()=>set({renameFolderId:null}),openRenamePrompt:(id)=>set({renamePromptId:id}),closeRenamePrompt:()=>set({renamePromptId:null}),openDeleteFolder:(id)=>set({deleteFolderId:id}),closeDeleteFolder:()=>set({deleteFolderId:null}),openMerge:(data)=>set({mergeImport:data}),closeMerge:()=>set({mergeImport:null}),pushToast:(t)=>{const id=++toastCounter;set((s)=>({toasts:[...s.toasts,{id,...t}]}));setTimeout(()=>set((s)=>({toasts:s.toasts.filter((x)=>x.id!==id)})),3200);},dismissToast:(id)=>set((s)=>({toasts:s.toasts.filter((x)=>x.id!==id})))}));
export const useThemeStore = create<ThemeState>()(persist((set)=>({currentTheme:'dark',customThemes:[],setTheme:(id)=>set({currentTheme:id}),addCustomTheme:(theme)=>set((s)=>({customThemes:[...s.customThemes,theme]})),removeCustomTheme:(id)=>set((s)=>({customThemes:s.customThemes.filter((t)=>t.id!==id),currentTheme:s.currentTheme===id?'dark':s.currentTheme}))}),{name:'promtova-theme',storage:createJSONStorage(()=>nativeStorage)}));