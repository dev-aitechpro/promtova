import { beforeEach, describe, expect, it } from 'vitest';
import { usePromtovaStore } from './usePromtovaStore';
import { parseImportFile } from '../utils/importExport';
import { getPromptText } from '../utils/promtova';
import { promptTextForCopy } from '../utils/copy';
import type { Folder, Prompt } from '../shared/types';
import { normalizeFolders } from '../utils/folders';

const folder = (id = 'f1', name = 'Dev'): Folder => ({ id, name, parent: null, children: [], order: 0 });
const prompt = (overrides: Partial<Prompt> = {}): Prompt => ({
  id: 'p1', title: 'Test', tags: [], preview: '', path: 'Dev/Test', content: 'Base', folderId: 'f1', folder: 'Dev', vars: {}, starred: false,
  createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', usageCount: 0, ...overrides,
});

beforeEach(() => {
  usePromtovaStore.setState({
    prompts: [prompt()], folders: normalizeFolders([folder()]), tags: [], versions: [], templates: [], blocks: [], modelProfiles: [], runs: [],
    selectedPromptId: 'p1', selectedFolderId: 'all', searchQuery: '', activeTagFilters: [], editorMode: 'edit', sortBy: 'updated', isDirty: false,
    lastSavedAt: null, autosave: true, editorFontSize: 13,
  });
});

describe('phase 2 completion', () => {
  it('rekeys imported asset ids and preserves references', () => {
    const first = parseImportFile(JSON.stringify({
      prompts: [{ ...prompt(), templateId: 't1', blockRefs: [{ blockId: 'b1', order: 0 }] }],
      folders: [folder()],
      templates: [{ id: 't1', name: 'T', description: '', sections: [] }],
      blocks: [{ id: 'b1', name: 'B', description: '', content: 'X', tags: [], variables: [] }],
      modelProfiles: [{ id: 'm1', name: 'M', provider: 'ollama', model: 'qwen' }],
      versions: [{ id: 'v1', promptId: 'p1', version: 1, createdAt: '2026-01-01T00:00:00Z', note: '', content: 'Base', sections: [], variables: [], legacy: {}, snapshot: { ...prompt(), templateId: 't1', blockRefs: [{ blockId: 'b1', order: 0 }] } }],
      runs: [{ id: 'r1', promptId: 'p1', versionId: 'v1', modelProfileId: 'm1', createdAt: '2026-01-01T00:00:00Z', input: {}, output: '', criteria: [] }],
    }));
    const second = parseImportFile(JSON.stringify({ templates: [{ id: 't1', name: 'T2', description: '', sections: [] }], prompts: [], folders: [] }));
    expect(first.templates[0].id).not.toBe('t1');
    expect(first.prompts[0].templateId).toBe(first.templates[0].id);
    expect(first.prompts[0].blockRefs?.[0].blockId).toBe(first.blocks[0].id);
    expect(first.versions[0].id).not.toBe('v1');
    expect(first.runs[0].versionId).toBe(first.versions[0].id);
    expect(first.runs[0].modelProfileId).toBe(first.modelProfiles[0].id);
    expect(second.templates[0].id).not.toBe(first.templates[0].id);
  });

  it('keeps the historical Block state and resolved text after a Block edit', () => {
    const store = usePromtovaStore.getState();
    const blockId = store.addBlock('Constraints', 'OLD {{tone}}');
    store.updateBlock(blockId, { variables: [{ name: 'tone', type: 'string', required: true }] });
    store.addBlockToPrompt('p1', blockId, { tone: 'strict' });
    const version = store.saveVersion('p1', 'before block edit');
    expect(version?.resolvedText).toContain('OLD strict');
    expect(version?.blockSnapshots?.[0].content).toBe('OLD {{tone}}');

    store.updateBlock(blockId, { content: 'NEW {{tone}}' });
    expect(store.getResolvedPromptText('p1')).toContain('NEW strict');
    expect(version?.resolvedText).toContain('OLD strict');
    expect(version?.blockSnapshots?.[0].content).toBe('OLD {{tone}}');
  });

  it('routes getPromptText and copy through the same resolved graph', () => {
    const store = usePromtovaStore.getState();
    const templateId = store.addTemplate('Marketing', '', [{ id: 's1', key: 'system', label: 'System', content: 'SYSTEM', order: 0 }]);
    const blockId = store.addBlock('Block', 'BLOCK');
    store.updatePrompt('p1', { templateId, blockRefs: [{ blockId, order: 0 }], useTemplate: true });
    const current = usePromtovaStore.getState().prompts[0];
    expect(getPromptText(current)).toBe('## System\n\nSYSTEM\n\nBLOCK');
    expect(promptTextForCopy(current, false)).toBe('## System\n\nSYSTEM\n\nBLOCK');
  });
});
