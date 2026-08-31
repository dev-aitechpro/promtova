# Graph Report - .  (2026-08-31)

## Corpus Check
- Corpus is ~38 036 words - fits in a single context window. You may not need a graph.

## Summary
- 252 nodes · 604 edges · 9 communities detected
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output
- Edge kinds: imports: 202 · contains: 195 · imports_from: 131 · MODIFIES: 60 · calls: 7 · ON_BRANCH: 5 · PARENT_OF: 4


## Input Scope
- Requested: auto
- Resolved: committed (source: default-auto)
- Included files: 58 · Candidates: 77
- Excluded: 1 untracked · 24578 ignored · 0 sensitive · 3 missing committed
- Recommendation: Use --scope all or graphify.yaml inputs.corpus for a knowledge-base folder.

## Graph Freshness
- Built from Git commit: `8873ff5`
- Compare this hash to `git rev-parse HEAD` before trusting freshness-sensitive graph output.
## God Nodes (most connected - your core abstractions)
1. `useUIStore` - 20 edges
2. `usePromtovaStore` - 19 edges
3. `Prompt` - 14 edges
4. `Folder` - 9 edges
5. `extractVariables()` - 8 edges
6. `folderNameById()` - 7 edges
7. `getPromptText()` - 7 edges
8. `useThemeStore` - 6 edges
9. `substituteVariables()` - 6 edges
10. `IconButton()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `93ca1b9 baseline: исходное состояние проекта перед доработкой по ТЗ v2` --ON_BRANCH--> `master`  [EXTRACTED]
  git → git  _Bridges community 3 → community 2_

## Communities

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (32): ACTIONS, CustomTheme, EditorMode, Folder, MergeAction, Prompt, PromptId, SortKey (+24 more)

### Community 1 - "Community 1"
Cohesion: 0.08
Nodes (13): CustomTheme, copyToClipboard(), promptTextForCopy(), countChars(), countWords(), extractVariables(), formatRelative(), fuzzyMatch() (+5 more)

### Community 2 - "Community 2"
Cohesion: 0.09
Nodes (15): master, 8873ff5 Граф знаний: включён нативный десктоп-слой (251 узел, 602 ребра), 90a75cb docs: README с описанием v1.1.0, обновлён PROJECT_ANALYSIS, граф знаний пересобран, adf1a49 v1.2.0: нативный десктоп (electron-store, electron-updater, setup.exe) + UI автообновления и иконка, ccd1a0d Доработка по ТЗ v2: иерархия папок, шаблонный режим, импорт с объединением, хоткеи, getDataPath(), isNativePersistence(), memory (+7 more)

### Community 3 - "Community 3"
Cohesion: 0.07
Nodes (7): 93ca1b9 baseline: исходное состояние проекта перед доработкой по ТЗ v2, useStoresHydrated(), applyTheme(), useThemeStore, cn(), __dirname, __filename

### Community 4 - "Community 4"
Cohesion: 0.10
Nodes (8): Props, useGlobalHotkeys(), usePromtovaStore, useUIStore, IconButton(), folderNameById(), getFolderIcon(), readFileAsText()

### Community 5 - "Community 5"
Cohesion: 0.19
Nodes (12): ConfirmDeleteFolderModal(), plural(), countPromptsInFolders(), FOLDER_COLORS, FOLDER_ICON_KEYS, FOLDER_ICONS, FolderIconKey, folderPath() (+4 more)

### Community 6 - "Community 6"
Cohesion: 0.18
Nodes (3): UpdaterApi, UpdaterState, AppApi

### Community 7 - "Community 7"
Cohesion: 0.20
Nodes (8): ExportData, EXPORT_FILTERS, IMPORT_FILTERS, isElectron(), openTextFile(), PickedFile, saveTextFile(), downloadFile()

### Community 8 - "Community 8"
Cohesion: 0.17
Nodes (11): NativeAppApi, NativeFileApi, NativeFileFilter, NativeStoresApi, OpenDialogOptions, PromtovaApi, SaveDialogOptions, StoreKey (+3 more)

## Knowledge Gaps
- **36 isolated node(s):** `Props`, `ACTIONS`, `UpdaterState`, `UpdaterApi`, `memory` (+31 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useUIStore` connect `Community 4` to `Community 1`, `Community 5`, `Community 7`, `Community 0`, `Community 2`, `Community 3`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Why does `usePromtovaStore` connect `Community 4` to `Community 1`, `Community 3`, `Community 5`, `Community 7`, `Community 0`, `Community 2`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Why does `Prompt` connect `Community 0` to `Community 1`, `Community 5`, `Community 3`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **What connects `Props`, `ACTIONS`, `UpdaterState` to the rest of the system?**
  _36 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.07450980392156863 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.07716701902748414 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.09243697478991597 - nodes in this community are weakly interconnected._