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
import { newId } from './promtova';

export const PROMPT_ENGINEERING_SCHEMA_VERSION = 1;

export const createPromptVersion = (
  prompt: Prompt,
  version: number,
  note = '',
): PromptVersion => ({
  id: newId(),
  promptId: prompt.id,
  version,
  createdAt: new Date().toISOString(),
  note,
  content: prompt.content,
  sections: prompt.sections ? prompt.sections.map((s) => ({ ...s })) : [],
  variables: Object.values(prompt.variableSchema ?? {}).map((v) => ({ ...v })),
  legacy: {
    system: prompt.system,
    context: prompt.context,
    output: prompt.output,
    useTemplate: prompt.useTemplate,
  },
});

export const nextPromptVersion = (versions: PromptVersion[], promptId: string): number => {
  const current = versions
    .filter((v) => v.promptId === promptId)
    .reduce((max, v) => Math.max(max, v.version), 0);
  return current + 1;
};

export const snapshotPrompt = (prompt: Prompt, version: number, note = '') =>
  createPromptVersion(prompt, version, note);

export const restorePromptVersion = (prompt: Prompt, version: PromptVersion): Prompt => ({
  ...prompt,
  content: version.content,
  sections: version.sections.map((s) => ({ ...s })),
  variableSchema: Object.fromEntries(version.variables.map((v) => [v.name, { ...v }])),
  system: version.legacy.system,
  context: version.legacy.context,
  output: version.legacy.output,
  useTemplate: version.legacy.useTemplate,
  updatedAt: new Date().toISOString(),
});

export const composeSections = (sections: PromptSection[]): string =>
  [...sections]
    .filter((section) => section.enabled !== false)
    .sort((a, b) => a.order - b.order)
    .map((section) => (section.content.trim() ? `## ${section.label}\n\n${section.content.trim()}` : ''))
    .filter(Boolean)
    .join('\n\n');

export const normalizeVariableSchema = (
  variables: PromptVariable[] | Record<string, PromptVariable> | undefined,
): Record<string, PromptVariable> => {
  if (!variables) return {};
  if (Array.isArray(variables)) {
    return Object.fromEntries(
      variables
        .filter((v) => v && typeof v.name === 'string' && v.name.trim())
        .map((v) => [v.name.trim(), { ...v, name: v.name.trim() }]),
    );
  }
  return Object.fromEntries(
    Object.entries(variables).map(([name, value]) => [name, { ...value, name: value.name || name }]),
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
  sections,
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
  score: options.score,
  criteria: options.criteria ?? [],
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
  return typeof value === 'string' && allowed.includes(value as PromptAssetType) ? value as PromptAssetType : null;
};

export const asPromptVariableType = (value: unknown): PromptVariableType => {
  const allowed: PromptVariableType[] = ['string', 'number', 'boolean', 'text', 'select', 'multiselect', 'json'];
  return typeof value === 'string' && allowed.includes(value as PromptVariableType)
    ? value as PromptVariableType
    : 'string';
};
