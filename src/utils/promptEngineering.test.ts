import { describe, expect, it } from 'vitest';
import type { Folder, Prompt, PromptVersion } from '../shared/types';
import {
  canonicalizePromptFolders,
  clampScore,
  composeSections,
  createPromptRun,
  createPromptVersion,
  nextPromptVersion,
  normalizeVariableSchema,
  restorePromptVersion,
} from './promptEngineering';

const prompt: Prompt = {
  id: 'prompt-1',
  title: 'Test prompt',
  tags: [],
  preview: '',
  path: 'Development/Test prompt',
  content: 'Hello {{name}}',
  folder: 'Development',
  vars: { name: 'World' },
  starred: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  usageCount: 0,
};

const folders: Folder[] = [
  { id: 'folder-development', name: 'Development', parent: null, children: [], order: 0 },
];

describe('prompt engineering core', () => {
  it('canonicalizes legacy folder name to stable folder id', () => {
    expect(canonicalizePromptFolders([prompt], folders)[0].folderId).toBe('folder-development');
  });

  it('creates monotonically increasing prompt versions', () => {
    const first = createPromptVersion(prompt, 1, 'initial');
    const second = createPromptVersion({ ...prompt, content: 'Updated' }, nextPromptVersion([first], prompt.id), 'revision');
    expect(first.version).toBe(1);
    expect(second.version).toBe(2);
    expect(second.promptId).toBe(prompt.id);
    expect(second.note).toBe('revision');
  });

  it('restores a version snapshot without mutating the snapshot', () => {
    const version: PromptVersion = createPromptVersion(prompt, 1, 'baseline');
    const restored = restorePromptVersion({ ...prompt, content: 'Changed' }, version);
    expect(restored.content).toBe(prompt.content);
    expect(restored.vars).toEqual(prompt.vars);
  });

  it('composes flexible sections by order and enabled state', () => {
    expect(composeSections([
      { id: '2', key: 'output', label: 'Output', content: 'Second', order: 2 },
      { id: '1', key: 'system', label: 'System', content: 'First', order: 1 },
      { id: '3', key: 'unused', label: 'Unused', content: 'Hidden', order: 3, enabled: false },
    ])).toBe('## System\n\nFirst\n\n## Output\n\nSecond');
  });

  it('normalizes typed variables from both map and array input', () => {
    const fromMap = normalizeVariableSchema({
      name: { name: 'name', type: 'string', required: true },
    });
    const fromArray = normalizeVariableSchema([
      { name: 'count', type: 'number' },
    ]);
    expect(fromMap.name.required).toBe(true);
    expect(fromArray.count.type).toBe('number');
  });

  it('clamps evaluation scores to 0..100 and stores run metadata', () => {
    expect(clampScore(-5)).toBe(0);
    expect(clampScore(120)).toBe(100);
    const run = createPromptRun(prompt, { modelProfileId: 'model-1', output: 'result', score: 91 });
    expect(run.promptId).toBe(prompt.id);
    expect(run.modelProfileId).toBe('model-1');
    expect(run.score).toBe(91);
  });
});
