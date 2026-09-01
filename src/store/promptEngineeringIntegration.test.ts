import { beforeEach, describe, expect, it } from 'vitest';
import { usePromtovaStore } from './usePromtovaStore';
import type { Folder, Prompt } from '../shared/types';
import { normalizeFolders } from '../utils/folders';
import { parseImportFile } from '../utils/importExport';

const folder = (id: string, name: string, parent: string | null = null): Folder => ({ id, name, parent, children: [], order: 0 });
const prompt = (overrides: Partial<Prompt> = {}): Prompt => ({
  id: 'p1', title: 'Test', tags: [], preview: '', path: 'Dev/Test', content: 'Hello {{name}}',
  folder: 'Dev', folderId: 'f1', vars: { name: 'World' }, starred: false,
  createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', usageCount: 0,
  ...overrides,
});

const reset = (prompts: Prompt[] = [prompt()], folders: Folder[] = [folder('f1', 'Dev')]) => {
  usePromtovaStore.setState({
    prompts,
    folders: normalizeFolders(folders),
    tags: [],
    versions: [],
    templates: [],
    blocks: [],
    modelProfiles: [],
    runs: [],
    selectedPromptId: prompts[0]?.id ?? null,
    selectedFolderId: 'all',
    searchQuery: '',
    activeTagFilters: [],
    editorMode: 'edit',
    sortBy: 'updated',
    isDirty: false,
    lastSavedAt: null,
    autosave: true,
    editorFontSize: 13,
  });
};

beforeEach(() => reset());

describe('unified prompt engineering store', () => {
  it('uses folderId as canonical identity and repairs legacy folder names', () => {
    reset([prompt({ folderId: undefined, folder: 'Dev' })]);
    usePromtovaStore.getState().updatePrompt('p1', { content: 'changed' });
    expect(usePromtovaStore.getState().prompts[0].folderId).toBe('f1');
    expect(usePromtovaStore.getState().prompts[0].folder).toBe('Dev');
  });

  it('creates one stable pre-change version for the first mutation in an edit session', () => {
    const store = usePromtovaStore.getState();
    store.updatePrompt('p1', { content: 'one' });
    store.updatePrompt('p1', { content: 'two' });
    const version = usePromtovaStore.getState().versions[0];
    expect(usePromtovaStore.getState().versions).toHaveLength(1);
    expect(version.content).toBe('Hello {{name}}');
    expect(version.snapshot?.vars).toEqual({ name: 'World' });
    expect(version.snapshot?.folderId).toBe('f1');
  });

  it('restores the complete prompt snapshot, including metadata and variables', () => {
    const store = usePromtovaStore.getState();
    store.updatePrompt('p1', { title: 'Changed', tags: ['new'], vars: { name: 'Alice' }, starred: true });
    const versionId = usePromtovaStore.getState().versions[0].id;
    const restored = usePromtovaStore.getState().restoreVersion('p1', versionId);
    expect(restored?.title).toBe('Test');
    expect(restored?.tags).toEqual([]);
    expect(restored?.vars).toEqual({ name: 'World' });
    expect(restored?.starred).toBe(false);
  });

  it('links templates and blocks to a prompt', () => {
    const store = usePromtovaStore.getState();
    const templateId = store.addTemplate('Marketing', 'template', [{ id: 's1', key: 'system', label: 'System', content: 'Be concise', order: 0 }]);
    store.applyTemplateToPrompt('p1', templateId);
    const blockId = store.addBlock('Constraints', 'Do not invent facts');
    store.addBlockToPrompt('p1', blockId);
    const current = usePromtovaStore.getState().prompts[0];
    expect(current.templateId).toBe(templateId);
    expect(current.blockRefs?.[0].blockId).toBe(blockId);
    expect(usePromtovaStore.getState().versions.length).toBeGreaterThan(0);
  });

  it('records runs against the latest version and bounds evaluation scores', () => {
    const store = usePromtovaStore.getState();
    store.saveVersion('p1', 'baseline');
    const runId = store.recordRun('p1', { output: 'result', score: 191 });
    expect(runId).toBeTruthy();
    const state = usePromtovaStore.getState();
    expect(state.runs[0].versionId).toBe(state.versions[0].id);
    expect(state.runs[0].score).toBe(100);
    store.updateRunEvaluation(runId!, -4, [{ id: 'quality', name: 'Quality', score: 150, weight: 1 }]);
    expect(usePromtovaStore.getState().runs[0].score).toBe(0);
    expect(usePromtovaStore.getState().runs[0].criteria[0].score).toBe(100);
  });

  it('exports and imports all schema 2 entities without dropping block variables', () => {
    const store = usePromtovaStore.getState();
    const templateId = store.addTemplate('T');
    const blockId = store.addBlock('B');
    store.updateBlock(blockId, { variables: [{ name: 'tone', type: 'string', required: true }] });
    store.updatePrompt('p1', { templateId, blockRefs: [{ blockId, order: 0 }] });
    store.saveVersion('p1', 'v');
    store.recordRun('p1', { output: 'ok', score: 80 });
    const exported = store.exportData();
    const parsed = parseImportFile(JSON.stringify(exported));
    expect(parsed.prompts[0].folderId).toBe('f1');
    expect(parsed.templates).toHaveLength(1);
    expect(parsed.blocks[0].variables[0].name).toBe('tone');
    expect(parsed.versions.length).toBeGreaterThanOrEqual(2);
    expect(parsed.runs[0].output).toBe('ok');
  });
});
