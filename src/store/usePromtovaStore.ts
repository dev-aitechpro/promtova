import type { Prompt, PromptId } from '../shared/types';
import { usePromtovaStore as promptStore } from './promptStore';
import { useThemeStore, applyTheme, presetThemeIds } from './themeStore';
import { useUIStore } from './uiStore';
import { resolvePromptText, setPromptAssetResolver } from '../utils/promptEngineering';
import { setPromptTextResolver } from '../utils/promtova';

// One live resolver powers Editor/Search/Copy and version snapshots:
// prompt -> template -> sections -> blocks.
setPromptTextResolver((prompt) => {
  const state = promptStore.getState();
  return resolvePromptText(prompt, state.templates, state.blocks);
});
setPromptAssetResolver((prompt) => {
  const state = promptStore.getState();
  return {
    template: prompt.templateId ? state.templates.find((template) => template.id === prompt.templateId) : undefined,
    blocks: state.blocks.filter((block) => (prompt.blockRefs ?? []).some((reference) => reference.blockId === block.id)),
  };
});

// Backward-compatibility adapter for legacy callers/tests: old persisted prompts may
// still carry folder names without folderId, and older UI expects preview/path to
// stay synchronized after any prompt mutation.
const originalUpdatePrompt = promptStore.getState().updatePrompt;
const originalDeleteFolder = promptStore.getState().deleteFolder;

const resolveLegacyFolderId = (prompt: Prompt, folders: ReturnType<typeof promptStore.getState>['folders']): string | undefined => {
  if (prompt.folderId && folders.some((folder) => folder.id === prompt.folderId)) return prompt.folderId;
  return folders.find((folder) => folder.name === prompt.folder)?.id;
};

const updatePromptCompat = (id: PromptId, patch: Partial<Prompt>, versionNote?: string): void => {
  const state = promptStore.getState();
  const current = state.prompts.find((prompt) => prompt.id === id);
  if (!current) return;
  const nextTitle = patch.title?.trim() || current.title;
  const folderId = patch.folderId ?? resolveLegacyFolderId(current, state.folders);
  const folder = folderId ? state.folders.find((item) => item.id === folderId) : undefined;
  const next = { ...current, ...patch, title: nextTitle, folderId, folder: folder?.name ?? patch.folder ?? current.folder };
  const legacyFolderName = next.folder ?? current.folder ?? current.path.split('/')[0];
  next.path = folder ? `${folder.name}/${nextTitle}` : legacyFolderName ? `${legacyFolderName}/${nextTitle}` : patch.path ?? current.path;
  next.preview = resolvePromptText(next, state.templates, state.blocks).slice(0, 180);
  originalUpdatePrompt(id, { ...patch, title: nextTitle, folderId, folder: next.folder, path: next.path, preview: next.preview }, versionNote);
};

const deleteFolderCompat = (id: string): void => {
  const state = promptStore.getState();
  const prompts = state.prompts.map((prompt) => ({ ...prompt, folderId: resolveLegacyFolderId(prompt, state.folders) }));
  if (prompts.some((prompt, index) => prompt.folderId !== state.prompts[index].folderId)) promptStore.setState({ prompts });
  originalDeleteFolder(id);
};

const countFolderPromptsCompat = (id: string): number => {
  const state = promptStore.getState();
  const ids = new Set([id]);
  const visit = (parentId: string): void => {
    state.folders.filter((folder) => folder.parent === parentId).forEach((folder) => { ids.add(folder.id); visit(folder.id); });
  };
  visit(id);
  return state.prompts.filter((prompt) => ids.has(resolveLegacyFolderId(prompt, state.folders) ?? '')).length;
};

promptStore.setState({
  updatePrompt: updatePromptCompat,
  deleteFolder: deleteFolderCompat,
  countFolderPrompts: countFolderPromptsCompat,
});

export { promptStore as usePromtovaStore, useThemeStore, applyTheme, presetThemeIds, useUIStore };
export type { PromptStoreState as PromtovaState } from './promptStore';
export type { CustomTheme } from '../shared/types';
export type { Toast } from './uiStore';