import { usePromtovaStore as promptStore } from './promptStore';
import { useThemeStore, applyTheme, presetThemeIds } from './themeStore';
import { useUIStore } from './uiStore';
import { resolvePromptText, setPromptAssetResolver } from '../utils/promptEngineering';
import { setPromptTextResolver } from '../utils/promtova';

// Register one live resolver so Editor/Search/Copy and versioning all resolve the same graph:
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

export { promptStore as usePromtovaStore, useThemeStore, applyTheme, presetThemeIds, useUIStore };
export type { PromptStoreState as PromtovaState } from './promptStore';
export type { CustomTheme } from '../shared/types';
export type { Toast } from './uiStore';
