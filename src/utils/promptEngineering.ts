import type {
  EvaluationCriterion,
  Folder,
  ModelProfile,
  Prompt,
  PromptAssetType,
  PromptBlock,
  PromptRun,
  PromptSection,
  PromptTemplate,
  PromptVariable,
  PromptVariableType,
  PromptVersion,
} from '../shared/types';
import { getPromptText, newId } from './promtova';

export const PROMPT_ENGINEERING_SCHEMA_VERSION = 2;

const cloneVariable = (value: PromptVariable): PromptVariable => ({
  ...value,
  options: value.options ? [...value.options] : undefined,
});

export const createPromptVersion = (
  prompt: Prompt,
  version: number,
  note = '',
): PromptVersion => {
  const snapshot: PromptVersion['snapshot'] = {
    title: prompt.title,
    tags: [...prompt.tags],
    preview: prompt.preview,
    path: prompt.path,
    content: prompt.content,
    folderId: prompt.folderId,
    folder: prompt.folder,
    sections: prompt.sections?.map((section) => ({ ...section })),
    templateId: prompt.templateId,
    blockRefs: prompt.blockRefs?.map((reference) => ({
      ...reference,
      overrides: reference.overrides ? { ...reference.overrides } : undefined,
    })),
    dependencies: prompt.dependencies?.map((dependency) => ({ ...dependency })),
    variableSchema: prompt.variableSchema
      ? Object.fromEntries(Object.entries(prompt.variableSchema).map(([name, value]) => [name, cloneVariable(value)]))
      : undefined,
    system: prompt.system,
    context: prompt.context,
    output: prompt.output,
    useTemplate: prompt.useTemplate,
    vars: { ...prompt.vars },
    starred: prompt.starred,
    usageCount: prompt.usageCount,
  };

  return {
    id: newId(),
    promptId: prompt.id,
    version,
    createdAt: new Date().toISOString(),
    note,
    snapshot,
    content: prompt.content,
    sections: prompt.sections ? prompt.sections.map((section) => ({ ...section })) : [],
    variables: Object.values(prompt.variableSchema ?? {}).map(cloneVariable),
    legacy: {
      system: prompt.system,
      context: prompt.context,
      output: prompt.output,
      useTemplate: prompt.useTemplate,
    },
  };
};

export const nextPromptVersion = (versions: PromptVersion[], promptId: string): number => {
  const current = versions
    .filter((version) => version.promptId === promptId)
    .reduce((max, version) => Math.max(max, version.version), 0);
  return current + 1;
};

export const snapshotPrompt = (prompt: Prompt, version: number, note = '') =>
  createPromptVersion(prompt, version, note);

export const restorePromptVersion = (prompt: Prompt, version: PromptVersion): Prompt => {
  if (version.snapshot) {
    return {
      ...prompt,
      ...version.snapshot,
      tags: [...version.snapshot.tags],
      vars: { ...version.snapshot.vars },
      sections: version.snapshot.sections?.map((section) => ({ ...section })),
      blockRefs: version.snapshot.blockRefs?.map((reference) => ({
        ...reference,
        overrides: reference.overrides ? { ...reference.overrides } : undefined,
      })),
      dependencies: version.snapshot.dependencies?.map((dependency) => ({ ...dependency })),
      variableSchema: version.snapshot.variableSchema
        ? Object.fromEntries(Object.entries(version.snapshot.variableSchema).map(([name, value]) => [name, cloneVariable(value)]))
        : undefined,
      updatedAt: new Date().toISOString(),
    };
  }

  return {
    ...prompt,
    content: version.content,
    sections: version.sections.map((section) => ({ ...section })),
    variableSchema: Object.fromEntries(version.variables.map((variable) => [variable.name, cloneVariable(variable)])),
    system: version.legacy.system,
    context: version.legacy.context,
    output: version.legacy.output,
    useTemplate: version.legacy.useTemplate,
    updatedAt: new Date().toISOString(),
  };
};

export const composeSections = (sections: PromptSection[]): string =>
  [...sections]
    .filter((section) => section.enabled !== false)
    .sort((a, b) => a.order - b.order)
    .map((section) => (section.content.trim() ? `## ${section.label}\n\n${section.content.trim()}` : ''))
    .filter(Boolean)
    .join('\n\n');

const applyOverrides = (content: string, overrides: Record<string, string> = {}): string =>
  Object.entries(overrides).reduce((result, [key, value]) => result.replaceAll(`{{${key}}}`, value), content);

export const resolvePromptText = (
  prompt: Prompt,
  templates: PromptTemplate[] = [],
  blocks: PromptBlock[] = [],
): string => {
  const template = prompt.templateId ? templates.find((item) => item.id === prompt.templateId) : undefined;
  const sectionSource = template?.sections?.length ? template.sections : prompt.sections ?? [];
  const sectionsText = sectionSource.length ? composeSections(sectionSource) : getPromptText(prompt);
  const blockById = new Map(blocks.map((block) => [block.id, block]));
  const blocksText = [...(prompt.blockRefs ?? [])]
    .sort((a, b) => a.order - b.order)
    .map((reference) => {
      const block = blockById.get(reference.blockId);
      return block ? applyOverrides(block.content, reference.overrides).trim() : '';
    })
    .filter(Boolean)
    .join('\n\n');
  return [sectionsText.trim(), blocksText].filter(Boolean).join('\n\n');
};

export const normalizeVariableSchema = (
  variables: PromptVariable[] | Record<string, PromptVariable> | undefined,
): Record<string, PromptVariable> => {
  if (!variables) return {};
  if (Array.isArray(variables)) {
    return Object.fromEntries(
      variables
        .filter((value) => value && typeof value.name === 'string' && value.name.trim())
        .map((value) => [value.name.trim(), cloneVariable(value)]),
    );
  }
  return Object.fromEntries(
    Object.entries(variables)
      .filter(([, value]) => Boolean(value) && typeof value === 'object')
      .map(([name, value]) => [name, { ...value, name: value.name || name, options: value.options ? [...value.options] : undefined }]),
  );
};

export const canonicalizePromptFolders = (prompts: Prompt[], folders: Folder[]): Prompt[] => {
  const foldersById = new Set(folders.map((folder) => folder.id));
  const idsByName = new Map(folders.map((folder) => [folder.name, folder.id]));
  return prompts.map((prompt) => ({
    ...prompt,
    folderId: prompt.folderId && foldersById.has(prompt.folderId)
      ? prompt.folderId
      : idsByName.get(prompt.folder) ?? undefined,
  }));
};

export const createPromptBlock = (name: string, content = '', description = ''): PromptBlock => {
  const now = new Date().toISOString();
  return {
    id: newId(),
    name: name.trim() || 'New block',
    description,
    content,
    tags: [],
    variables: [],
    createdAt: now,
    updatedAt: now,
  };
};

export const createPromptTemplate = (
  name: string,
  sections: PromptSection[] = [],
  description = '',
): PromptTemplate => ({
  id: newId(),
  name: name.trim() || 'New template',
  description,
  sections: sections.map((section) => ({ ...section })),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export const createModelProfile = (
  name: string,
  provider: ModelProfile['provider'],
  model: string,
): ModelProfile => ({
  id: newId(),
  name: name.trim() || model,
  provider,
  model,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export const createPromptRun = (
  prompt: Prompt,
  options: {
    versionId?: string;
    modelProfileId?: string;
    input?: Record<string, unknown>;
    output?: string;
    score?: number;
    criteria?: EvaluationCriterion[];
    latencyMs?: number;
    tokenUsage?: { input?: number; output?: number; total?: number };
  } = {},
): PromptRun => ({
  id: newId(),
  promptId: prompt.id,
  versionId: options.versionId,
  modelProfileId: options.modelProfileId,
  createdAt: new Date().toISOString(),
  input: options.input ?? {},
  output: options.output ?? '',
  score: options.score === undefined ? undefined : clampScore(options.score),
  criteria: (options.criteria ?? []).map((criterion) => ({
    ...criterion,
    score: criterion.score === undefined ? undefined : clampScore(criterion.score),
  })),
  latencyMs: options.latencyMs,
  tokenUsage: options.tokenUsage,
});

export const clampScore = (value: number): number => Math.max(0, Math.min(100, value));

export const evaluateCriterion = (
  criterion: EvaluationCriterion,
  score: number,
  rationale = '',
): EvaluationCriterion => ({
  ...criterion,
  score: clampScore(score),
  rationale,
});

export const asPromptAssetType = (value: unknown): PromptAssetType | null => {
  const allowed: PromptAssetType[] = ['prompt', 'template', 'skill', 'knowledge', 'tool', 'agent', 'block'];
  return typeof value === 'string' && allowed.includes(value as PromptAssetType)
    ? value as PromptAssetType
    : null;
};

export const asPromptVariableType = (value: unknown): PromptVariableType => {
  const allowed: PromptVariableType[] = ['string', 'number', 'boolean', 'text', 'select', 'multiselect', 'json'];
  return typeof value === 'string' && allowed.includes(value as PromptVariableType)
    ? value as PromptVariableType
    : 'string';
};

export const isModelProvider = (value: unknown): value is ModelProfile['provider'] => (
  value === 'ollama' ||
  value === 'openai-compatible' ||
  value === 'openrouter' ||
  value === 'lm-studio' ||
  value === 'custom-http'
);
