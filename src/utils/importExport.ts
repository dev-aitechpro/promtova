// Import/export of the prompt database with schema migration and conflict handling.
import type {
  EvaluationCriterion,
  ExportData,
  Folder,
  MergeAction,
  ModelProfile,
  Prompt,
  PromptAssetType,
  PromptBlock,
  PromptDependency,
  PromptRun,
  PromptSection,
  PromptTemplate,
  PromptVariable,
  PromptVariableType,
  PromptVersion,
} from '../shared/types';
import { normalizeFolders } from './folders';
import { newId } from './promtova';
import { asPromptAssetType, asPromptVariableType } from './promptEngineering';

export const EXPORT_VERSION = '2.0';

const isObj = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const str = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;

const parseSection = (raw: unknown): PromptSection | null => {
  if (!isObj(raw)) return null;
  return {
    id: str(raw.id) || newId(),
    key: str(raw.key) || str(raw.label) || 'section',
    label: str(raw.label) || str(raw.key) || 'Section',
    content: str(raw.content),
    order: typeof raw.order === 'number' ? raw.order : 0,
    enabled: raw.enabled !== false,
  };
};

const parseVariable = (name: string, raw: unknown): PromptVariable | null => {
  if (!isObj(raw)) return null;
  return {
    name: str(raw.name) || name,
    type: asPromptVariableType(raw.type),
    description: str(raw.description) || undefined,
    defaultValue: raw.defaultValue as PromptVariable['defaultValue'],
    required: raw.required === true,
    options: Array.isArray(raw.options)
      ? raw.options.filter((value): value is string => typeof value === 'string')
      : undefined,
    pattern: str(raw.pattern) || undefined,
  };
};

const parseDependency = (raw: unknown): PromptDependency | null => {
  if (!isObj(raw)) return null;
  const type = asPromptAssetType(raw.type);
  const id = str(raw.id);
  if (!type || !id) return null;
  const relation = str(raw.relation);
  return {
    type,
    id,
    relation: ['uses', 'requires', 'references', 'derived-from'].includes(relation)
      ? relation as PromptDependency['relation']
      : undefined,
  };
};

const parseCriteria = (raw: unknown): EvaluationCriterion[] =>
  Array.isArray(raw)
    ? raw.filter(isObj).map((criterion) => ({
        id: str(criterion.id) || newId(),
        name: str(criterion.name) || 'Criterion',
        score: typeof criterion.score === 'number' ? criterion.score : undefined,
        weight: typeof criterion.weight === 'number' ? criterion.weight : undefined,
        rationale: str(criterion.rationale) || undefined,
      }))
    : [];

export const normalizePrompt = (
  raw: unknown,
  fallbackFolder = 'Development',
  fallbackFolderId?: string,
): Prompt | null => {
  if (!isObj(raw)) return null;
  const title = str(raw.title).trim();
  const content = str(raw.content);
  const system = str(raw.system);
  const context = str(raw.context);
  const output = str(raw.output);
  if (!title && !content && !system && !context && !output) return null;

  const vars: Record<string, string> = {};
  if (isObj(raw.vars)) {
    Object.entries(raw.vars).forEach(([key, value]) => {
      if (typeof value === 'string') vars[key] = value;
    });
  }

  const rawSchema = isObj(raw.variableSchema) ? raw.variableSchema : null;
  const variableSchema = rawSchema
    ? Object.fromEntries(
        Object.entries(rawSchema)
          .map(([name, value]) => [name, parseVariable(name, value)])
          .filter((entry): entry is [string, PromptVariable] => entry[1] !== null),
      )
    : undefined;

  const sections = Array.isArray(raw.sections)
    ? raw.sections.map(parseSection).filter((value): value is PromptSection => value !== null)
    : undefined;
  const blockRefs = Array.isArray(raw.blockRefs)
    ? raw.blockRefs
        .filter(isObj)
        .map((ref) => ({
          blockId: str(ref.blockId),
          order: typeof ref.order === 'number' ? ref.order : 0,
          overrides: isObj(ref.overrides)
            ? Object.fromEntries(
                Object.entries(ref.overrides).filter(([, value]) => typeof value === 'string'),
              ) as Record<string, string>
            : undefined,
        }))
        .filter((ref) => Boolean(ref.blockId))
    : undefined;
  const dependencies = Array.isArray(raw.dependencies)
    ? raw.dependencies.map(parseDependency).filter((value): value is PromptDependency => value !== null)
    : undefined;

  const now = new Date().toISOString();
  return {
    id: typeof raw.id === 'number' ? String(raw.id) : str(raw.id) || newId(),
    title: title || 'Без названия',
    tags: Array.isArray(raw.tags)
      ? raw.tags.filter((value): value is string => typeof value === 'string')
      : [],
    preview: str(raw.preview),
    path: str(raw.path),
    content,
    folderId: str(raw.folderId) || fallbackFolderId,
    folder: str(raw.folder) || fallbackFolder,
    sections,
    templateId: str(raw.templateId) || undefined,
    blockRefs,
    dependencies,
    variableSchema,
    system,
    context,
    output,
    useTemplate: raw.useTemplate === true,
    vars,
    starred: raw.starred === true,
    createdAt: str(raw.createdAt) || now,
    updatedAt: str(raw.updatedAt) || now,
    usageCount: typeof raw.usageCount === 'number' && raw.usageCount >= 0 ? raw.usageCount : 0,
  };
};

export const normalizeFolder = (raw: unknown): Folder | null => {
  if (!isObj(raw)) return null;
  const name = str(raw.name).trim();
  if (!name) return null;
  return {
    id: str(raw.id) || newId(),
    name,
    parent: typeof raw.parent === 'string' ? raw.parent : null,
    children: Array.isArray(raw.children)
      ? raw.children.filter((value): value is string => typeof value === 'string')
      : [],
    icon: typeof raw.icon === 'string' ? raw.icon : 'Folder',
    color: typeof raw.color === 'string' ? raw.color : '#FF6B35',
    order: typeof raw.order === 'number' ? raw.order : 0,
  };
};

const normalizeVersion = (raw: unknown): PromptVersion | null => {
  if (!isObj(raw) || !str(raw.promptId)) return null;
  const sections = Array.isArray(raw.sections)
    ? raw.sections.map(parseSection).filter((value): value is PromptSection => value !== null)
    : [];
  const variables = isObj(raw.variables)
    ? Object.entries(raw.variables).map(([name, value]) => parseVariable(name, value)).filter((value): value is PromptVariable => value !== null)
    : Array.isArray(raw.variables)
      ? raw.variables.filter(isObj).map((value) => parseVariable(str(value.name), value)).filter((value): value is PromptVariable => value !== null)
      : [];
  return {
    id: str(raw.id) || newId(),
    promptId: str(raw.promptId),
    version: typeof raw.version === 'number' && raw.version > 0 ? Math.floor(raw.version) : 1,
    createdAt: str(raw.createdAt) || new Date().toISOString(),
    note: str(raw.note),
    content: str(raw.content),
    sections,
    variables,
    legacy: isObj(raw.legacy)
      ? {
          system: str(raw.legacy.system) || undefined,
          context: str(raw.legacy.context) || undefined,
          output: str(raw.legacy.output) || undefined,
          useTemplate: raw.legacy.useTemplate === true,
        }
      : {},
  };
};

const normalizeTemplate = (raw: unknown): PromptTemplate | null => {
  if (!isObj(raw) || !str(raw.name)) return null;
  return {
    id: str(raw.id) || newId(),
    name: str(raw.name),
    description: str(raw.description),
    sections: Array.isArray(raw.sections)
      ? raw.sections.map(parseSection).filter((value): value is PromptSection => value !== null)
      : [],
    createdAt: str(raw.createdAt) || new Date().toISOString(),
    updatedAt: str(raw.updatedAt) || new Date().toISOString(),
  };
};

const normalizeBlock = (raw: unknown): PromptBlock | null => {
  if (!isObj(raw) || !str(raw.name)) return null;
  return {
    id: str(raw.id) || newId(),
    name: str(raw.name),
    description: str(raw.description),
    content: str(raw.content),
    tags: Array.isArray(raw.tags)
      ? raw.tags.filter((value): value is string => typeof value === 'string')
      : [],
    variables: [],
    createdAt: str(raw.createdAt) || new Date().toISOString(),
    updatedAt: str(raw.updatedAt) || new Date().toISOString(),
  };
};

const normalizeModelProfile = (raw: unknown): ModelProfile | null => {
  if (!isObj(raw) || !str(raw.model)) return null;
  return {
    id: str(raw.id) || newId(),
    name: str(raw.name) || str(raw.model),
    provider: str(raw.provider) as ModelProfile['provider'],
    model: str(raw.model),
    baseUrl: str(raw.baseUrl) || undefined,
    apiKeyRef: str(raw.apiKeyRef) || undefined,
    capabilities: Array.isArray(raw.capabilities)
      ? raw.capabilities.filter((value): value is string => typeof value === 'string')
      : undefined,
    params: isObj(raw.params) ? raw.params : undefined,
    notes: str(raw.notes) || undefined,
    createdAt: str(raw.createdAt) || new Date().toISOString(),
    updatedAt: str(raw.updatedAt) || new Date().toISOString(),
  };
};

const normalizeRun = (raw: unknown): PromptRun | null => {
  if (!isObj(raw) || !str(raw.promptId)) return null;
  const tokenUsage = isObj(raw.tokenUsage)
    ? {
        input: typeof raw.tokenUsage.input === 'number' ? raw.tokenUsage.input : undefined,
        output: typeof raw.tokenUsage.output === 'number' ? raw.tokenUsage.output : undefined,
        total: typeof raw.tokenUsage.total === 'number' ? raw.tokenUsage.total : undefined,
      }
    : undefined;
  return {
    id: str(raw.id) || newId(),
    promptId: str(raw.promptId),
    versionId: str(raw.versionId) || undefined,
    modelProfileId: str(raw.modelProfileId) || undefined,
    createdAt: str(raw.createdAt) || new Date().toISOString(),
    input: isObj(raw.input) ? raw.input : {},
    output: str(raw.output),
    score: typeof raw.score === 'number' ? raw.score : undefined,
    criteria: parseCriteria(raw.criteria),
    latencyMs: typeof raw.latencyMs === 'number' ? raw.latencyMs : undefined,
    tokenUsage,
  };
};

export interface ParsedImport {
  prompts: Prompt[];
  folders: Folder[];
  versions: PromptVersion[];
  templates: PromptTemplate[];
  blocks: PromptBlock[];
  modelProfiles: ModelProfile[];
  runs: PromptRun[];
  errors: string[];
}

export const parseImportFile = (
  text: string,
  fallbackFolder = 'Development',
  titleHint = '',
): ParsedImport => {
  const trimmed = text.trim();
  const empty = { prompts: [], folders: [], versions: [], templates: [], blocks: [], modelProfiles: [], runs: [], errors: [] as string[] };
  if (!trimmed) return { ...empty, errors: ['Файл пуст'] };

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    let data: unknown;
    try {
      data = JSON.parse(trimmed);
    } catch {
      return { ...empty, errors: ['Файл не является корректным JSON'] };
    }
    const root = isObj(data) ? data : { prompts: data };
    const rawPrompts = Array.isArray(root.prompts) ? root.prompts : null;
    if (!rawPrompts) return { ...empty, errors: ['В файле нет массива "prompts"'] };

    const folders = normalizeFolders(
      (Array.isArray(root.folders) ? root.folders : [])
        .map(normalizeFolder)
        .filter((value): value is Folder => value !== null),
    );
    const folderIdsByName = new Map(folders.map((folder) => [folder.name, folder.id]));
    const prompts: Prompt[] = [];
    const errors: string[] = [];
    rawPrompts.forEach((value, index) => {
      const rawFolder = isObj(value) ? str(value.folder) : '';
      const prompt = normalizePrompt(
        value,
        fallbackFolder,
        isObj(value) && str(value.folderId) ? str(value.folderId) : rawFolder ? folderIdsByName.get(rawFolder) : undefined,
      );
      if (prompt) prompts.push(prompt);
      else errors.push(`Промпт #${index + 1} пропущен (нет заголовка и содержимого)`);
    });

    const mapEntities = <T>(value: unknown, normalizer: (raw: unknown) => T | null): T[] =>
      Array.isArray(value)
        ? value.map(normalizer).filter((item): item is T => item !== null)
        : [];

    return {
      prompts,
      folders,
      versions: mapEntities(root.versions, normalizeVersion),
      templates: mapEntities(root.templates, normalizeTemplate),
      blocks: mapEntities(root.blocks, normalizeBlock),
      modelProfiles: mapEntities(root.modelProfiles, normalizeModelProfile),
      runs: mapEntities(root.runs, normalizeRun),
      errors,
    };
  }

  const firstLine = trimmed.split('\n', 1)[0].replace(/^#\s*/, '').trim();
  const title = titleHint || firstLine.slice(0, 80) || 'Импортированный промпт';
  const prompt = normalizePrompt({ title, content: trimmed }, fallbackFolder)!;
  return { ...empty, prompts: [prompt] };
};

export interface MergeConflict {
  key: string;
  incoming: Prompt;
  existing: Prompt;
  action: MergeAction;
}

export const conflictKey = (prompt: Pick<Prompt, 'title' | 'folder'>): string =>
  `${prompt.folder}\u0000${prompt.title.trim().toLowerCase()}`;

export const detectConflicts = (incoming: Prompt[], existing: Prompt[]): MergeConflict[] => {
  const byKey = new Map(existing.map((prompt) => [conflictKey(prompt), prompt]));
  const seen = new Set<string>();
  return incoming.flatMap((prompt) => {
    const key = conflictKey(prompt);
    const found = byKey.get(key);
    if (!found || seen.has(key)) return [];
    seen.add(key);
    return [{ key, incoming: prompt, existing: found, action: 'skip' as MergeAction }];
  });
};

const uniqueTitle = (base: string, taken: Set<string>): string => {
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base} (копия ${n})`)) n++;
  return `${base} (копия ${n})`;
};

export interface MergeResult {
  prompts: Prompt[];
  imported: number;
  skipped: number;
  replaced: number;
}

export const applyMerge = (
  existing: Prompt[],
  incoming: Prompt[],
  conflicts: MergeConflict[],
): MergeResult => {
  const actionByKey = new Map(conflicts.map((conflict) => [conflict.key, conflict.action]));
  const result = [...existing];
  const indexById = new Map(result.map((prompt, index) => [prompt.id, index]));
  let imported = 0;
  let skipped = 0;
  let replaced = 0;

  incoming.forEach((incomingPrompt) => {
    const key = conflictKey(incomingPrompt);
    const action = actionByKey.get(key);
    if (action === 'skip') {
      skipped++;
      return;
    }
    if (action === 'overwrite') {
      const target = result.find((prompt) => conflictKey(prompt) === key);
      if (target) {
        result[indexById.get(target.id)!] = {
          ...incomingPrompt,
          id: target.id,
          usageCount: target.usageCount,
          createdAt: target.createdAt,
        };
        replaced++;
      }
      return;
    }

    const title = action === 'rename'
      ? uniqueTitle(incomingPrompt.title, new Set(result.map((prompt) => prompt.title)))
      : incomingPrompt.title;
    result.unshift({ ...incomingPrompt, id: newId(), title });
    imported++;
  });

  return { prompts: result, imported, skipped, replaced };
};

export const buildExportData = (
  prompts: Prompt[],
  folders: Folder[],
  extras: Pick<ExportData, 'versions' | 'templates' | 'blocks' | 'modelProfiles' | 'runs'> = {},
): ExportData => ({
  version: EXPORT_VERSION,
  exportedAt: new Date().toISOString(),
  prompts,
  folders,
  ...extras,
});
