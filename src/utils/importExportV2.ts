import { parseImportFile as parseLegacyImport, type ParsedImport } from './importExport';
import { asPromptAssetType, asPromptVariableType } from './promptEngineering';
import type { ModelProvider, PromptBlock } from '../shared/types';

const PROVIDERS: ModelProvider[] = ['ollama', 'openai-compatible', 'openrouter', 'lm-studio', 'custom-http'];

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizeProvider = (value: unknown): ModelProvider | null =>
  typeof value === 'string' && PROVIDERS.includes(value as ModelProvider) ? value as ModelProvider : null;

const normalizeBlocks = (raw: unknown): PromptBlock[] => {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (!isObject(item) || typeof item.name !== 'string' || !item.name.trim()) return [];
    const variables = Array.isArray(item.variables)
      ? item.variables.flatMap((variable) => {
          if (!isObject(variable) || typeof variable.name !== 'string' || !variable.name.trim()) return [];
          return [{
            name: variable.name.trim(),
            type: asPromptVariableType(variable.type),
            description: typeof variable.description === 'string' ? variable.description : undefined,
            defaultValue: variable.defaultValue as PromptBlock['variables'][number]['defaultValue'],
            required: variable.required === true,
            options: Array.isArray(variable.options) ? variable.options.filter((v): v is string => typeof v === 'string') : undefined,
            pattern: typeof variable.pattern === 'string' ? variable.pattern : undefined,
          }];
        })
      : [];
    return [{
      id: typeof item.id === 'string' && item.id ? item.id : crypto.randomUUID(),
      name: item.name,
      description: typeof item.description === 'string' ? item.description : '',
      content: typeof item.content === 'string' ? item.content : '',
      tags: Array.isArray(item.tags) ? item.tags.filter((v): v is string => typeof v === 'string') : [],
      variables,
      createdAt: typeof item.createdAt === 'string' && item.createdAt ? item.createdAt : new Date().toISOString(),
      updatedAt: typeof item.updatedAt === 'string' && item.updatedAt ? item.updatedAt : new Date().toISOString(),
    }];
  });
};

export const parseImportFileV2 = (text: string, fallbackFolder = 'Development', titleHint = ''): ParsedImport => {
  const parsed = parseLegacyImport(text, fallbackFolder, titleHint);
  const trimmed = text.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return parsed;

  try {
    const data: unknown = JSON.parse(trimmed);
    const root = isObject(data) ? data : { prompts: data };
    const rawBlocks = normalizeBlocks(root.blocks);
    const blocks = rawBlocks.length === parsed.blocks.length
      ? rawBlocks
      : parsed.blocks.map((block) => rawBlocks.find((candidate) => candidate.id === block.id) ?? block);

    const modelProfiles = parsed.modelProfiles.flatMap((profile, index) => {
      const raw = Array.isArray(root.modelProfiles) && isObject(root.modelProfiles[index]) ? root.modelProfiles[index] : null;
      const provider = normalizeProvider(raw?.provider);
      return provider ? [{ ...profile, provider }] : profile.provider && PROVIDERS.includes(profile.provider) ? [profile] : [];
    });

    const dependencies = parsed.prompts.map((prompt, index) => {
      const raw = Array.isArray(root.prompts) && isObject(root.prompts[index]) ? root.prompts[index] : null;
      if (!raw || !Array.isArray(raw.dependencies)) return prompt;
      return {
        ...prompt,
        dependencies: raw.dependencies.flatMap((value) => {
          if (!isObject(value)) return [];
          const type = asPromptAssetType(value.type);
          const id = typeof value.id === 'string' ? value.id : '';
          return type && id ? [{ type, id, relation: typeof value.relation === 'string' ? value.relation as NonNullable<typeof prompt.dependencies>[number]['relation'] : undefined }] : [];
        }),
      };
    });

    return { ...parsed, prompts: dependencies, blocks, modelProfiles };
  } catch {
    return parsed;
  }
};
