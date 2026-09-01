// Shared domain types for Promtova.

export type PromptId = string;

export type PromptAssetType = 'prompt' | 'template' | 'skill' | 'knowledge' | 'tool' | 'agent' | 'block';
export type PromptVariableType = 'string' | 'number' | 'boolean' | 'text' | 'select' | 'multiselect' | 'json';

export interface PromptVariable {
  name: string;
  type: PromptVariableType;
  description?: string;
  defaultValue?: string | number | boolean | string[];
  required?: boolean;
  options?: string[];
  pattern?: string;
}

export interface PromptSection {
  id: string;
  key: string;
  label: string;
  content: string;
  order: number;
  enabled?: boolean;
}

export interface PromptBlockReference {
  blockId: string;
  order: number;
  overrides?: Record<string, string>;
}

export interface PromptDependency {
  type: PromptAssetType;
  id: string;
  relation?: 'uses' | 'requires' | 'references' | 'derived-from';
}

export interface Prompt {
  id: PromptId;
  title: string;
  tags: string[];
  preview: string;
  path: string;
  content: string;
  folderId?: string;
  /** @deprecated Use folderId. Kept for backward-compatible storage/imports. */
  folder: string;
  sections?: PromptSection[];
  templateId?: string;
  blockRefs?: PromptBlockReference[];
  dependencies?: PromptDependency[];
  variableSchema?: Record<string, PromptVariable>;
  system?: string;
  context?: string;
  output?: string;
  useTemplate?: boolean;
  vars: Record<string, string>;
  starred: boolean;
  createdAt: string;
  updatedAt: string;
  usageCount: number;
}

export type PromptVersionSnapshot = Omit<Prompt, 'id' | 'createdAt' | 'updatedAt'>;

export interface PromptVersionBlockSnapshot {
  id: string;
  name: string;
  description: string;
  content: string;
  tags: string[];
  variables: PromptVariable[];
}

export interface PromptVersionTemplateSnapshot {
  id: string;
  name: string;
  description: string;
  sections: PromptSection[];
}

export interface PromptVersion {
  id: string;
  promptId: PromptId;
  version: number;
  createdAt: string;
  note: string;
  /** Complete prompt state at the time of the snapshot. Added in schema v2. */
  snapshot?: PromptVersionSnapshot;
  /** Exact resolved text at snapshot time, independent of later block/template edits. */
  resolvedText?: string;
  /** Immutable template state referenced by the prompt at snapshot time. */
  templateSnapshot?: PromptVersionTemplateSnapshot;
  /** Immutable block states referenced by the prompt at snapshot time. */
  blockSnapshots?: PromptVersionBlockSnapshot[];
  /** Legacy v1 snapshot fields kept for backward compatibility. */
  content: string;
  sections: PromptSection[];
  variables: PromptVariable[];
  legacy: {
    system?: string;
    context?: string;
    output?: string;
    useTemplate?: boolean;
  };
}

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  sections: PromptSection[];
  createdAt: string;
  updatedAt: string;
}

export interface PromptBlock {
  id: string;
  name: string;
  description: string;
  content: string;
  tags: string[];
  variables: PromptVariable[];
  createdAt: string;
  updatedAt: string;
}

export type ModelProvider = 'ollama' | 'openai-compatible' | 'openrouter' | 'lm-studio' | 'custom-http';

export interface ModelProfile {
  id: string;
  name: string;
  provider: ModelProvider;
  model: string;
  baseUrl?: string;
  apiKeyRef?: string;
  capabilities?: string[];
  params?: Record<string, unknown>;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EvaluationCriterion {
  id: string;
  name: string;
  score?: number;
  weight?: number;
  rationale?: string;
}

export interface PromptRun {
  id: string;
  promptId: PromptId;
  versionId?: string;
  modelProfileId?: string;
  createdAt: string;
  input: Record<string, unknown>;
  output: string;
  score?: number;
  criteria: EvaluationCriterion[];
  latencyMs?: number;
  tokenUsage?: {
    input?: number;
    output?: number;
    total?: number;
  };
}

export interface Folder {
  id: string;
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

export interface CustomTheme {
  id: string;
  name: string;
  isCustom: true;
  colors: Record<string, string>;
}

export interface ExportData {
  version: string;
  exportedAt: string;
  prompts: Prompt[];
  folders: Folder[];
  versions?: PromptVersion[];
  templates?: PromptTemplate[];
  blocks?: PromptBlock[];
  modelProfiles?: ModelProfile[];
  runs?: PromptRun[];
}

export type EditorMode = 'view' | 'edit' | 'split';
export type SortKey = 'updated' | 'created' | 'title' | 'usage';
export type MergeAction = 'skip' | 'rename' | 'overwrite' | 'duplicate';
