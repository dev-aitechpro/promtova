import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type {
  ModelProfile,
  Prompt,
  PromptBlock,
  PromptRun,
  PromptTemplate,
  PromptVersion,
} from '../shared/types';
import { nativeStorage } from '../storage/nativeStorage';
import {
  createModelProfile,
  createPromptBlock,
  createPromptRun,
  createPromptTemplate,
  createPromptVersion,
  nextPromptVersion,
  restorePromptVersion,
} from '../utils/promptEngineering';

export interface PromptEngineeringState {
  versions: PromptVersion[];
  templates: PromptTemplate[];
  blocks: PromptBlock[];
  modelProfiles: ModelProfile[];
  runs: PromptRun[];

  saveVersion: (prompt: Prompt, note?: string) => PromptVersion;
  restoreVersion: (prompt: Prompt, versionId: string) => Prompt | null;
  addTemplate: (name: string, description?: string) => string;
  addBlock: (name: string, content?: string, description?: string) => string;
  addModelProfile: (name: string, provider: ModelProfile['provider'], model: string) => string;
  recordRun: (prompt: Prompt, options?: Parameters<typeof createPromptRun>[1]) => string;
  removeVersionsForPrompt: (promptId: string) => void;
  removeRunsForPrompt: (promptId: string) => void;
}

export const usePromptEngineeringStore = create<PromptEngineeringState>()(
  persist(
    (set, get) => ({
      versions: [],
      templates: [],
      blocks: [],
      modelProfiles: [],
      runs: [],

      saveVersion: (prompt, note = '') => {
        const version = createPromptVersion(prompt, nextPromptVersion(get().versions, prompt.id), note);
        set((state) => ({ versions: [...state.versions, version] }));
        return version;
      },

      restoreVersion: (prompt, versionId) => {
        const version = get().versions.find((item) => item.id === versionId && item.promptId === prompt.id);
        return version ? restorePromptVersion(prompt, version) : null;
      },

      addTemplate: (name, description = '') => {
        const template = createPromptTemplate(name, [], description);
        set((state) => ({ templates: [...state.templates, template] }));
        return template.id;
      },

      addBlock: (name, content = '', description = '') => {
        const block = createPromptBlock(name, content, description);
        set((state) => ({ blocks: [...state.blocks, block] }));
        return block.id;
      },

      addModelProfile: (name, provider, model) => {
        const profile = createModelProfile(name, provider, model);
        set((state) => ({ modelProfiles: [...state.modelProfiles, profile] }));
        return profile.id;
      },

      recordRun: (prompt, options = {}) => {
        const run = createPromptRun(prompt, options);
        set((state) => ({ runs: [run, ...state.runs] }));
        return run.id;
      },

      removeVersionsForPrompt: (promptId) =>
        set((state) => ({ versions: state.versions.filter((version) => version.promptId !== promptId) })),

      removeRunsForPrompt: (promptId) =>
        set((state) => ({ runs: state.runs.filter((run) => run.promptId !== promptId) })),
    }),
    {
      name: 'promtova-prompt-engineering',
      storage: createJSONStorage(() => nativeStorage),
      version: 1,
      partialize: (state) => ({
        versions: state.versions,
        templates: state.templates,
        blocks: state.blocks,
        modelProfiles: state.modelProfiles,
        runs: state.runs,
      }),
    },
  ),
);
