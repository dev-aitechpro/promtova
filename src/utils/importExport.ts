import type { EvaluationCriterion, ExportData, Folder, MergeAction, ModelProfile, ModelProvider, Prompt, PromptAssetType, PromptBlock, PromptDependency, PromptRun, PromptSection, PromptTemplate, PromptVariable, PromptVersion } from '../shared/types';
import { normalizeFolders } from './folders';
import { newId } from './promtova';

export const EXPORT_VERSION = '2.0';
const PROVIDERS: ModelProvider[] = ['ollama', 'openai-compatible', 'openrouter', 'lm-studio', 'custom-http'];
const ASSET_TYPES: PromptAssetType[] = ['prompt', 'template', 'skill', 'knowledge', 'tool', 'agent', 'block'];
const VARIABLE_TYPES: PromptVariable['type'][] = ['string', 'number', 'boolean', 'text', 'select', 'multiselect', 'json'];
const RELATIONS: NonNullable<PromptDependency['relation']>[] = ['uses', 'requires', 'references', 'derived-from'];

const isObj = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const str = (value: unknown, fallback = ''): string => typeof value === 'string' ? value : fallback;
const variableType = (value: unknown): PromptVariable['type'] => typeof value === 'string' && VARIABLE_TYPES.includes(value as PromptVariable['type']) ? value as PromptVariable['type'] : 'string';
const assetType = (value: unknown): PromptAssetType | null => typeof value === 'string' && ASSET_TYPES.includes(value as PromptAssetType) ? value as PromptAssetType : null;
const provider = (value: unknown): ModelProvider | null => typeof value === 'string' && PROVIDERS.includes(value as ModelProvider) ? value as ModelProvider : null;

const parseSection = (raw: unknown): PromptSection | null => {
  if (!isObj(raw)) return null;
  return { id: str(raw.id) || newId(), key: str(raw.key) || str(raw.label) || 'section', label: str(raw.label) || str(raw.key) || 'Section', content: str(raw.content), order: typeof raw.order === 'number' ? raw.order : 0, enabled: raw.enabled !== false };
};

const parseVariable = (name: string, raw: unknown): PromptVariable | null => {
  if (!isObj(raw)) return null;
  return { name: str(raw.name) || name, type: variableType(raw.type), description: str(raw.description) || undefined, defaultValue: ['string','number','boolean'].includes(typeof raw.defaultValue) || Array.isArray(raw.defaultValue) ? raw.defaultValue as PromptVariable['defaultValue'] : undefined, required: raw.required === true, options: Array.isArray(raw.options) ? raw.options.filter((v): v is string => typeof v === 'string') : undefined, pattern: str(raw.pattern) || undefined };
};

const parseDependency = (raw: unknown): PromptDependency | null => {
  if (!isObj(raw)) return null;
  const type = assetType(raw.type); const id = str(raw.id); if (!type || !id) return null;
  const relation = str(raw.relation);
  return { type, id, relation: RELATIONS.includes(relation as NonNullable<PromptDependency['relation']>) ? relation as NonNullable<PromptDependency['relation']> : undefined };
};

const parseCriteria = (raw: unknown): EvaluationCriterion[] => Array.isArray(raw) ? raw.filter(isObj).map((criterion) => ({ id: str(criterion.id) || newId(), name: str(criterion.name) || 'Criterion', score: typeof criterion.score === 'number' ? Math.max(0, Math.min(100, criterion.score)) : undefined, weight: typeof criterion.weight === 'number' ? criterion.weight : undefined, rationale: str(criterion.rationale) || undefined })) : [];

const parseBlock = (raw: unknown): PromptBlock | null => {
  if (!isObj(raw) || !str(raw.name)) return null;
  const variables = Array.isArray(raw.variables) ? raw.variables.map((value) => parseVariable('', value)).filter((value): value is PromptVariable => value !== null) : [];
  return { id: str(raw.id) || newId(), name: str(raw.name), description: str(raw.description), content: str(raw.content), tags: Array.isArray(raw.tags) ? raw.tags.filter((v): v is string => typeof v === 'string') : [], variables, createdAt: str(raw.createdAt) || new Date().toISOString(), updatedAt: str(raw.updatedAt) || new Date().toISOString() };
};

const parseVersion = (raw: unknown): PromptVersion | null => {
  if (!isObj(raw) || !str(raw.promptId)) return null;
  const sections = Array.isArray(raw.sections) ? raw.sections.map(parseSection).filter((v): v is PromptSection => v !== null) : [];
  const variables = Array.isArray(raw.variables) ? raw.variables.map((v) => parseVariable(isObj(v) ? str(v.name) : '', v)).filter((v): v is PromptVariable => v !== null) : isObj(raw.variables) ? Object.entries(raw.variables).map(([name, value]) => parseVariable(name, value)).filter((v): v is PromptVariable => v !== null) : [];
  return { id: str(raw.id) || newId(), promptId: str(raw.promptId), version: typeof raw.version === 'number' && raw.version > 0 ? Math.floor(raw.version) : 1, createdAt: str(raw.createdAt) || new Date().toISOString(), note: str(raw.note), content: str(raw.content), sections, variables, legacy: isObj(raw.legacy) ? { system: str(raw.legacy.system) || undefined, context: str(raw.legacy.context) || undefined, output: str(raw.legacy.output) || undefined, useTemplate: raw.legacy.useTemplate === true } : {} };
};

const parseTemplate = (raw: unknown): PromptTemplate | null => !isObj(raw) || !str(raw.name) ? null : { id: str(raw.id) || newId(), name: str(raw.name), description: str(raw.description), sections: Array.isArray(raw.sections) ? raw.sections.map(parseSection).filter((v): v is PromptSection => v !== null) : [], createdAt: str(raw.createdAt) || new Date().toISOString(), updatedAt: str(raw.updatedAt) || new Date().toISOString() };
const parseModelProfile = (raw: unknown): ModelProfile | null => { if (!isObj(raw) || !str(raw.model)) return null; const p = provider(raw.provider); if (!p) return null; return { id: str(raw.id) || newId(), name: str(raw.name) || str(raw.model), provider: p, model: str(raw.model), baseUrl: str(raw.baseUrl) || undefined, apiKeyRef: str(raw.apiKeyRef) || undefined, capabilities: Array.isArray(raw.capabilities) ? raw.capabilities.filter((v): v is string => typeof v === 'string') : undefined, params: isObj(raw.params) ? raw.params : undefined, notes: str(raw.notes) || undefined, createdAt: str(raw.createdAt) || new Date().toISOString(), updatedAt: str(raw.updatedAt) || new Date().toISOString() }; };
const parseRun = (raw: unknown): PromptRun | null => { if (!isObj(raw) || !str(raw.promptId)) return null; const tokenUsage = isObj(raw.tokenUsage) ? { input: typeof raw.tokenUsage.input === 'number' ? raw.tokenUsage.input : undefined, output: typeof raw.tokenUsage.output === 'number' ? raw.tokenUsage.output : undefined, total: typeof raw.tokenUsage.total === 'number' ? raw.tokenUsage.total : undefined } : undefined; return { id: str(raw.id) || newId(), promptId: str(raw.promptId), versionId: str(raw.versionId) || undefined, modelProfileId: str(raw.modelProfileId) || undefined, createdAt: str(raw.createdAt) || new Date().toISOString(), input: isObj(raw.input) ? raw.input : {}, output: str(raw.output), score: typeof raw.score === 'number' ? Math.max(0, Math.min(100, raw.score)) : undefined, criteria: parseCriteria(raw.criteria), latencyMs: typeof raw.latencyMs === 'number' ? raw.latencyMs : undefined, tokenUsage }; };

export const normalizePrompt = (raw: unknown, fallbackFolder = 'Development', fallbackFolderId?: string): Prompt | null => {
  if (!isObj(raw)) return null;
  const title = str(raw.title).trim(); const content = str(raw.content); const system = str(raw.system); const context = str(raw.context); const output = str(raw.output);
  if (!title && !content && !system && !context && !output) return null;
  const vars: Record<string, string> = {}; if (isObj(raw.vars)) Object.entries(raw.vars).forEach(([k,v]) => { if (typeof v === 'string') vars[k] = v; });
  const variableSchema = isObj(raw.variableSchema) ? Object.fromEntries(Object.entries(raw.variableSchema).map(([name,value]) => [name, parseVariable(name,value)]).filter((entry): entry is [string,PromptVariable] => entry[1] !== null)) : undefined;
  const sections = Array.isArray(raw.sections) ? raw.sections.map(parseSection).filter((v): v is PromptSection => v !== null) : undefined;
  const blockRefs = Array.isArray(raw.blockRefs) ? raw.blockRefs.filter(isObj).map((ref) => ({ blockId: str(ref.blockId), order: typeof ref.order === 'number' ? ref.order : 0, overrides: isObj(ref.overrides) ? Object.fromEntries(Object.entries(ref.overrides).filter(([,v]) => typeof v === 'string')) as Record<string,string> : undefined })).filter((ref) => ref.blockId) : undefined;
  const dependencies = Array.isArray(raw.dependencies) ? raw.dependencies.map(parseDependency).filter((v): v is PromptDependency => v !== null) : undefined;
  const now = new Date().toISOString();
  return { id: typeof raw.id === 'number' ? String(raw.id) : str(raw.id) || newId(), title: title || 'Без названия', tags: Array.isArray(raw.tags) ? raw.tags.filter((v): v is string => typeof v === 'string') : [], preview: str(raw.preview), path: str(raw.path), content, folderId: str(raw.folderId) || fallbackFolderId, folder: str(raw.folder) || fallbackFolder, sections, templateId: str(raw.templateId) || undefined, blockRefs, dependencies, variableSchema, system, context, output, useTemplate: raw.useTemplate === true, vars, starred: raw.starred === true, createdAt: str(raw.createdAt) || now, updatedAt: str(raw.updatedAt) || now, usageCount: typeof raw.usageCount === 'number' && raw.usageCount >= 0 ? raw.usageCount : 0 };
};

export const normalizeFolder = (raw: unknown): Folder | null => !isObj(raw) || !str(raw.name).trim() ? null : { id: str(raw.id) || newId(), name: str(raw.name).trim(), parent: typeof raw.parent === 'string' ? raw.parent : null, children: Array.isArray(raw.children) ? raw.children.filter((v): v is string => typeof v === 'string') : [], icon: typeof raw.icon === 'string' ? raw.icon : 'Folder', color: typeof raw.color === 'string' ? raw.color : '#FF6B35', order: typeof raw.order === 'number' ? raw.order : 0 };

export interface ParsedImport { prompts: Prompt[]; folders: Folder[]; versions: PromptVersion[]; templates: PromptTemplate[]; blocks: PromptBlock[]; modelProfiles: ModelProfile[]; runs: PromptRun[]; errors: string[]; }

export const parseImportFile = (text: string, fallbackFolder = 'Development', titleHint = ''): ParsedImport => {
  const trimmed = text.trim(); const empty = { prompts: [], folders: [], versions: [], templates: [], blocks: [], modelProfiles: [], runs: [], errors: [] as string[] }; if (!trimmed) return { ...empty, errors: ['Файл пуст'] };
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) { const firstLine = trimmed.split('\n',1)[0].replace(/^#\s*/,'').trim(); const title = titleHint || firstLine.slice(0,80) || 'Импортированный промпт'; return { ...empty, prompts: [normalizePrompt({ title, content: trimmed }, fallbackFolder)!] }; }
  let data: unknown; try { data = JSON.parse(trimmed); } catch { return { ...empty, errors: ['Файл не является корректным JSON'] }; }
  const root = isObj(data) ? data : { prompts: data }; const rawPrompts = Array.isArray(root.prompts) ? root.prompts : null; if (!rawPrompts) return { ...empty, errors: ['В файле нет массива "prompts"'] };
  const folders = normalizeFolders((Array.isArray(root.folders) ? root.folders : []).map(normalizeFolder).filter((v): v is Folder => v !== null)); const folderIdsByName = new Map(folders.map((f) => [f.name, f.id])); const prompts: Prompt[] = []; const errors: string[] = [];
  rawPrompts.forEach((value,index) => { const rawFolder = isObj(value) ? str(value.folder) : ''; const prompt = normalizePrompt(value, fallbackFolder, isObj(value) && str(value.folderId) ? str(value.folderId) : rawFolder ? folderIdsByName.get(rawFolder) : undefined); if (prompt) prompts.push(prompt); else errors.push(`Промпт #${index+1} пропущен (нет заголовка и содержимого)`); });
  const map = <T>(value: unknown, normalizer: (raw: unknown) => T | null): T[] => Array.isArray(value) ? value.map(normalizer).filter((v): v is T => v !== null) : [];
  return { prompts, folders, versions: map(root.versions, parseVersion), templates: map(root.templates, parseTemplate), blocks: map(root.blocks, parseBlock), modelProfiles: map(root.modelProfiles, parseModelProfile), runs: map(root.runs, parseRun), errors };
};

export interface MergeConflict { key: string; incoming: Prompt; existing: Prompt; action: MergeAction; }
export const conflictKey = (prompt: Pick<Prompt, 'title' | 'folder' | 'folderId'>): string => `${prompt.folderId || prompt.folder}\u0000${prompt.title.trim().toLowerCase()}`;
export const detectConflicts = (incoming: Prompt[], existing: Prompt[]): MergeConflict[] => { const byKey = new Map(existing.map((p) => [conflictKey(p), p])); const seen = new Set<string>(); return incoming.flatMap((p) => { const key = conflictKey(p); const found = byKey.get(key); if (!found || seen.has(key)) return []; seen.add(key); return [{ key, incoming: p, existing: found, action: 'skip' as MergeAction }]; }); };

const uniqueTitle = (base: string, taken: Set<string>) => { if (!taken.has(base)) return base; let n=2; while (taken.has(`${base} (копия ${n})`)) n++; return `${base} (копия ${n})`; };
export interface MergeResult { prompts: Prompt[]; imported: number; skipped: number; replaced: number; }
export const applyMerge = (existing: Prompt[], incoming: Prompt[], conflicts: MergeConflict[]): MergeResult => {
  const actionByKey = new Map(conflicts.map((c) => [c.key, c.action])); const result = [...existing]; const indexById = new Map(result.map((p,i) => [p.id,i])); let imported=0, skipped=0, replaced=0;
  incoming.forEach((p) => { const key=conflictKey(p); const action=actionByKey.get(key); if(action==='skip'){skipped++;return;} if(action==='overwrite'){const target=result.find((x)=>conflictKey(x)===key); if(target){result[indexById.get(target.id)!]={...p,id:target.id,usageCount:target.usageCount,createdAt:target.createdAt};replaced++;} return;} const title=action==='rename'?uniqueTitle(p.title,new Set(result.map((x)=>x.title))):p.title; result.unshift({...p,id:newId(),title}); imported++; });
  return { prompts: result, imported, skipped, replaced };
};

export const buildExportData = (prompts: Prompt[], folders: Folder[], extras: Pick<ExportData,'versions'|'templates'|'blocks'|'modelProfiles'|'runs'> = {}): ExportData => ({ version: EXPORT_VERSION, exportedAt: new Date().toISOString(), prompts, folders, ...extras });
