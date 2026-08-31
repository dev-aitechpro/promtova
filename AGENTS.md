## graphify

This project has a graphify knowledge graph at .graphify/.

Rules:
- For codebase or architecture questions, when `.graphify/graph.json` exists, first run `graphify query "<question>"` (or `graphify path "<A>" "<B>"` / `graphify explain "<concept>"`); these return a scoped subgraph, usually much smaller than `GRAPH_REPORT.md` or raw grep output
- If .graphify/wiki/index.md exists, navigate it instead of reading raw files
- If .graphify/graph.json is missing but graphify-out/graph.json exists, run `graphify migrate-state --dry-run` first; if tracked legacy artifacts are reported, ask before using the recommended `git mv -f graphify-out .graphify` and commit message
- If .graphify/needs_update exists or .graphify/branch.json has stale=true, warn before relying on semantic results and run the graphify skill with --update when appropriate
- If the user asks to build, update, query, path, or explain the graph, use the installed `graphify` skill instead of ad-hoc file traversal
- Before proposing or committing .graphify artifacts, run `graphify portable-check .graphify`; commit-safe graph artifacts must use repo-relative paths, and never commit .graphify/branch.json, .graphify/worktree.json, .graphify/needs_update, or .graphify/cache/. If a repo already tracks any of them, first add them to .gitignore, then propose `git rm --cached .graphify/branch.json .graphify/worktree.json .graphify/needs_update` and `git rm -r --cached .graphify/cache`; never mutate git state without asking
- Before deep graph traversal, prefer `graphify summary --graph .graphify/graph.json` for compact first-hop orientation
- For review impact on changed files, use `graphify review-delta --graph .graphify/graph.json` instead of generic traversal
- Read `.graphify/GRAPH_REPORT.md` only for broad architecture review or when `query` / `path` / `explain` do not surface enough context
- After modifying code files in this session, run `npx graphify hook-rebuild` to keep the graph current

## Graphify — correct commands for this project (Promtova, TS/React)

Installed binary: `graphify` (package `@sentropic/graphify`, NOT `@graphify/cli`).
The graph already exists at `.graphify/graph.json` (built code-only, 59 nodes / 80 edges / 5
communities). The OpenCode plugin auto-reminds you to query the graph before bash calls.

Map of commands you might have seen in a guide — use the real ones below:

| Instead of (guide / does not exist) | Use this (real command) |
|---|---|
| `graphify extract . code-only` | `graphify extract src --exclude "PROJECT_ANALYSIS.md" ...` (or just `graphify update`) |
| `graphify affected "X" depth 2` | `graphify minimal-context --files <changed-files>` or `graphify explain "<symbol>"` for one node |
| `graphify god-nodes top N` | `graphify summary` (top hubs) or read the God Nodes section of `.graphify/GRAPH_REPORT.md` |
| `graphify path "A" "B"` | `graphify path "<nodeA>" "<nodeB>"` |
| `graphify query "question"` | `graphify query "<term>"` (works on node labels; semantic NLP questions need `--backend`/descriptions) |
| `graphify update .` | `graphify update` (one-shot code-only rebuild) |
| `open graphify-out/graph.html` | open `.graphify/studio/studio.html` in a browser |
| `graphify affected-flows` / `review-delta` / `minimal-context` | these require a git repo — NOT available yet (project not under git) |

Everyday workflow:
1. Architecture/orientation: `graphify summary` first.
2. A single symbol's impact: `graphify explain "<symbol>"` or `graphify path "<a>" "<b>"`.
3. Before a broad question: `graphify query "<term>"` — read only the returned files, never the whole repo.
4. After editing code: run `graphify update` (code-only, fast, no LLM/API key needed).
