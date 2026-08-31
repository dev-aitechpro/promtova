# Graph Report - .  (2026-08-31)

## Corpus Check
- Corpus is ~32 738 words - fits in a single context window. You may not need a graph.

## Summary
- 193 nodes · 501 edges · 8 communities detected
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output
- Edge kinds: imports: 184 · contains: 151 · imports_from: 116 · MODIFIES: 41 · calls: 6 · ON_BRANCH: 2 · PARENT_OF: 1


## Input Scope
- Requested: auto
- Resolved: committed (source: default-auto)
- Included files: 44 · Candidates: 62
- Excluded: 0 untracked · 13135 ignored · 0 sensitive · 1 missing committed
- Recommendation: Use --scope all or graphify.yaml inputs.corpus for a knowledge-base folder.

## Graph Freshness
- Built from Git commit: `ccd1a0d`
- Compare this hash to `git rev-parse HEAD` before trusting freshness-sensitive graph output.
## God Nodes (most connected - your core abstractions)
1. `useUIStore` - 20 edges
2. `usePromtovaStore` - 18 edges
3. `Prompt` - 14 edges
4. `Folder` - 9 edges
5. `extractVariables()` - 8 edges
6. `folderNameById()` - 7 edges
7. `getPromptText()` - 7 edges
8. `substituteVariables()` - 6 edges
9. `IconButton()` - 5 edges
10. `applyTheme()` - 5 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Communities

### Community 0 - "Community 0"
Cohesion: 0.08
Nodes (6): applyTheme(), useThemeStore, IconButton(), cn(), getFolderIcon(), readFileAsText()

### Community 1 - "Community 1"
Cohesion: 0.10
Nodes (19): CustomTheme, EditorMode, Folder, Prompt, PromptId, SortKey, Tag, Theme (+11 more)

### Community 2 - "Community 2"
Cohesion: 0.11
Nodes (7): master, 93ca1b9 baseline: исходное состояние проекта перед доработкой по ТЗ v2, ccd1a0d Доработка по ТЗ v2: иерархия папок, шаблонный режим, импорт с объединением, хоткеи, usePromtovaStore, useUIStore, __dirname, __filename

### Community 3 - "Community 3"
Cohesion: 0.14
Nodes (15): ACTIONS, ExportData, MergeAction, applyMerge(), buildExportData(), conflictKey(), detectConflicts(), isObj() (+7 more)

### Community 4 - "Community 4"
Cohesion: 0.18
Nodes (12): copyToClipboard(), promptTextForCopy(), countChars(), countWords(), extractVariables(), formatRelative(), fuzzyMatch(), getPromptText() (+4 more)

### Community 5 - "Community 5"
Cohesion: 0.10
Nodes (1): CustomTheme

### Community 6 - "Community 6"
Cohesion: 0.19
Nodes (12): ConfirmDeleteFolderModal(), plural(), countPromptsInFolders(), FOLDER_COLORS, FOLDER_ICON_KEYS, FOLDER_ICONS, FolderIconKey, folderPath() (+4 more)

### Community 7 - "Community 7"
Cohesion: 0.22
Nodes (3): Props, useGlobalHotkeys(), folderNameById()

## Knowledge Gaps
- **15 isolated node(s):** `Props`, `ACTIONS`, `CreateFolderOptions`, `PromtovaState`, `ThemeState` (+10 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 5`** (1 nodes): `CustomTheme`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useUIStore` connect `Community 2` to `Community 4`, `Community 7`, `Community 0`, `Community 6`, `Community 3`, `Community 1`, `Community 5`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `usePromtovaStore` connect `Community 2` to `Community 4`, `Community 7`, `Community 0`, `Community 6`, `Community 3`, `Community 1`, `Community 5`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Why does `Prompt` connect `Community 1` to `Community 4`, `Community 6`, `Community 3`, `Community 0`, `Community 5`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **What connects `Props`, `ACTIONS`, `CreateFolderOptions` to the rest of the system?**
  _15 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.07507507507507508 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.0967741935483871 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.11396011396011396 - nodes in this community are weakly interconnected._