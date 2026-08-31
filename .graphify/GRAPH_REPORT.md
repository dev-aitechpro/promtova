# Graph Report - .  (2026-08-31)

## Corpus Check
- Corpus is ~12 106 words - fits in a single context window. You may not need a graph.

## Summary
- 82 nodes · 121 edges · 7 communities detected
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output
- Edge kinds: contains: 73 · imports: 37 · imports_from: 11


## Input Scope
- Requested: auto
- Resolved: all (source: default-auto)
- Included files: 10 · Candidates: recursive
- Excluded: 0 untracked · 0 ignored · 0 sensitive · 0 missing committed
## God Nodes (most connected - your core abstractions)
1. `Prompt` - 4 edges
2. `usePromtovaStore` - 3 edges
3. `CustomTheme` - 3 edges
4. `applyTheme()` - 3 edges
5. `useUIStore` - 3 edges
6. `useThemeStore` - 3 edges
7. `cn()` - 3 edges
8. `substituteVariables()` - 3 edges
9. `extractVariables()` - 3 edges
10. `renderMarkdown()` - 3 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Communities

### Community 0 - "Community 0"
Cohesion: 0.09
Nodes (2): usePromtovaStore, useUIStore

### Community 1 - "Community 1"
Cohesion: 0.10
Nodes (1): useThemeStore

### Community 2 - "Community 2"
Cohesion: 0.14
Nodes (10): applyTheme(), CustomTheme, presetThemeIds, presetThemes, PromtovaState, seedFolders, seedPrompts, ThemeState (+2 more)

### Community 3 - "Community 3"
Cohesion: 0.18
Nodes (9): countChars(), countWords(), downloadFile(), extractVariables(), formatRelative(), fuzzyMatch(), readFileAsText(), renderMarkdown() (+1 more)

### Community 4 - "Community 4"
Cohesion: 0.22
Nodes (8): CustomTheme, EditorMode, ExportData, Folder, Prompt, SortKey, Tag, Theme

### Community 5 - "Community 5"
Cohesion: 0.67
Nodes (2): __dirname, __filename

### Community 6 - "Community 6"
Cohesion: 1.00
Nodes (1): cn()

## Knowledge Gaps
- **13 isolated node(s):** `Theme`, `CustomTheme`, `ExportData`, `seedPrompts`, `seedFolders` (+8 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 0`** (2 nodes): `usePromtovaStore`, `useUIStore`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 1`** (1 nodes): `useThemeStore`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 5`** (2 nodes): `__dirname`, `__filename`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 6`** (1 nodes): `cn()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Prompt` connect `Community 4` to `Community 0`, `Community 2`, `Community 1`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **Why does `usePromtovaStore` connect `Community 0` to `Community 2`, `Community 1`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **Why does `CustomTheme` connect `Community 2` to `Community 0`, `Community 1`?**
  _High betweenness centrality (0.006) - this node is a cross-community bridge._
- **What connects `Theme`, `CustomTheme`, `ExportData` to the rest of the system?**
  _13 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.09090909090909091 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._