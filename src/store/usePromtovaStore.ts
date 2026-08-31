import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Prompt, Folder, Tag, EditorMode, SortKey } from '../shared/types';

// Initial seed prompts
const seedPrompts: Prompt[] = [
  {
    id: 1,
    title: 'Code Review Assistant',
    tags: ['code', 'review', 'development'],
    preview: 'You are an experienced senior developer. Review the following code for bugs, performance, security issues, and best practices…',
    path: 'Development/Code Review Assistant',
    content: `You are an experienced **senior developer** with 15+ years of expertise across multiple programming languages and paradigms.

Review the following code with a focus on:

1. **Bugs & edge cases** — Identify any logic errors or untested branches
2. **Performance** — Look for O(n²) loops, unnecessary re-renders, memory leaks
3. **Security** — Check for SQL injection, XSS, insecure dependencies
4. **Best practices** — Suggest idiomatic patterns and clean code principles

\`\`\`{{Language}}
{{Code}}
\`\`\`

Provide your feedback in a structured format:
- 🔴 Critical issues
- 🟡 Warnings
- 🟢 Suggestions
- ✨ What's done well

Tone: Constructive and educational. Assume the developer is mid-level.`,
    vars: { Language: 'typescript', Code: 'function add(a, b) { return a + b; }' },
    starred: true,
    folder: 'Development',
    createdAt: '2025-08-12T10:24:00Z',
    updatedAt: '2025-11-18T14:32:00Z',
    usageCount: 47,
  },
  {
    id: 2,
    title: 'SEO Blog Post Generator',
    tags: ['seo', 'marketing', 'content'],
    preview: 'Create an SEO-optimized blog post about {{Topic}}. Target keyword: {{Keyword}}. Tone: {{Tone}}…',
    path: 'Marketing/SEO Blog Post',
    content: `You are an expert **SEO content writer** with a deep understanding of search intent, keyword strategy, and conversion-oriented copy.

Write a comprehensive blog post about **{{Topic}}**.

## Requirements
- **Target keyword**: {{Keyword}}
- **Tone**: {{Tone}}
- **Word count**: 1500–2000 words
- **Audience**: {{Audience}}

## Structure
1. Catchy H1 (under 60 characters, includes keyword)
2. Meta description (under 155 characters)
3. Introduction with hook
4. 5–7 H2 sections with H3 sub-sections
5. FAQ section (5 questions)
6. Conclusion with CTA

## SEO Checklist
- ✅ Primary keyword in first 100 words
- ✅ LSI keywords naturally integrated
- ✅ Internal link suggestions
- ✅ Image alt text recommendations
- ✅ Schema markup ideas

Output in clean Markdown.`,
    vars: { Topic: 'AI prompt engineering', Keyword: 'prompt engineering', Tone: 'professional yet friendly', Audience: 'developers and content creators' },
    starred: true,
    folder: 'Marketing',
    createdAt: '2025-09-04T09:11:00Z',
    updatedAt: '2025-11-20T08:50:00Z',
    usageCount: 89,
  },
  {
    id: 3,
    title: 'Daily Standup Summary',
    tags: ['meetings', 'productivity'],
    preview: 'Summarize yesterday\'s standup notes into a structured update for the {{Team}} team…',
    path: 'Productivity/Standup Summary',
    content: `Summarize the following standup notes into a clear, structured update for the **{{Team}}** team.

## Format
\`\`\`
🚀 Yesterday:
- [completed work]

📅 Today:
- [planned work]

🚧 Blockers:
- [blockers, or "None"]
\`\`\`

## Standup notes
{{Notes}}

Keep it concise. Use bullet points. Highlight any cross-team dependencies.`,
    vars: { Team: 'Frontend', Notes: 'Alice finished the auth flow. Bob is working on the dashboard. Carol is blocked on the API spec.' },
    starred: false,
    folder: 'Productivity',
    createdAt: '2025-10-01T13:00:00Z',
    updatedAt: '2025-11-15T11:20:00Z',
    usageCount: 23,
  },
  {
    id: 4,
    title: 'UI Component Designer',
    tags: ['design', 'ui', 'react'],
    preview: 'Design a {{Component}} component for a React app. Style: {{Style}}. Use {{Library}}…',
    path: 'Development/UI Component Designer',
    content: `Design a **{{Component}}** component for a modern React application.

## Specifications
- **Style**: {{Style}} (Tailwind CSS preferred)
- **Component library**: {{Library}}
- **Accessibility**: WCAG 2.1 AA compliant
- **Variants**: primary, secondary, ghost, danger
- **Sizes**: sm, md, lg

## Deliverables
1. JSX/TSX component code
2. Props interface (TypeScript)
3. Storybook stories for all variants
4. Basic usage example
5. ARIA attributes list

Follow the existing design system tokens. Use **forwardRef** where appropriate. Include proper keyboard navigation.`,
    vars: { Component: 'Button', Style: 'modern minimal', Library: 'shadcn/ui' },
    starred: false,
    folder: 'Development',
    createdAt: '2025-09-22T16:45:00Z',
    updatedAt: '2025-11-19T17:15:00Z',
    usageCount: 31,
  },
  {
    id: 5,
    title: 'Email Subject Line A/B',
    tags: ['email', 'marketing', 'copywriting'],
    preview: 'Generate 10 email subject line variations for A/B testing. Goal: {{Goal}}…',
    path: 'Marketing/Email Subject Lines',
    content: `Generate **10 high-converting email subject line variations** for A/B testing.

**Campaign goal**: {{Goal}}
**Target audience**: {{Audience}}
**Product/service**: {{Product}}

## Requirements
- Mix of styles: curiosity, urgency, benefit-driven, question-based
- Keep under 50 characters where possible
- Avoid spam triggers (FREE, GUARANTEED, $$$)
- Personalization tokens where appropriate ({{first_name}})

For each subject line, provide:
1. The subject line
2. Style category
3. Predicted open-rate boost (low/medium/high)
4. Reasoning`,
    vars: { Goal: 'drive webinar signups', Audience: 'B2B SaaS founders', Product: 'AI analytics tool' },
    starred: false,
    folder: 'Marketing',
    createdAt: '2025-10-15T12:30:00Z',
    updatedAt: '2025-11-21T10:00:00Z',
    usageCount: 56,
  },
  {
    id: 6,
    title: 'SQL Query Optimizer',
    tags: ['sql', 'database', 'performance'],
    preview: 'Optimize the following SQL query for {{Database}}. Current execution time: {{Time}}…',
    path: 'Development/SQL Optimizer',
    content: `You are a **database performance expert** specializing in {{Database}}.

Optimize the following SQL query:

\`\`\`sql
{{Query}}
\`\`\`

## Context
- **Database**: {{Database}}
- **Current execution time**: {{Time}}
- **Table row count**: {{Rows}}
- **Index information**: {{Indexes}}

## Deliverables
1. Optimized query
2. Recommended index changes (CREATE INDEX statements)
3. EXPLAIN ANALYZE interpretation
4. Trade-offs and considerations
5. Estimated performance improvement`,
    vars: { Database: 'PostgreSQL 15', Query: 'SELECT * FROM orders o JOIN users u ON o.user_id = u.id WHERE o.created_at > NOW() - INTERVAL \'30 days\'', Time: '4.2s', Rows: '~10M orders', Indexes: 'B-tree on users.id, B-tree on orders.user_id' },
    starred: true,
    folder: 'Development',
    createdAt: '2025-08-30T14:00:00Z',
    updatedAt: '2025-11-17T09:45:00Z',
    usageCount: 18,
  },
  {
    id: 7,
    title: 'Customer Support Reply',
    tags: ['support', 'customer-service'],
    preview: 'Draft a professional, empathetic reply to a customer complaint about {{Issue}}…',
    path: 'Productivity/Support Reply',
    content: `Draft a **professional and empathetic** customer support reply.

## Customer's message
> {{Message}}

## Context
- Issue: {{Issue}}
- Order ID: {{OrderID}}
- Resolution offered: {{Resolution}}

## Guidelines
- Acknowledge the frustration first
- Apologize sincerely (without over-apologizing)
- Explain what happened (briefly)
- Offer concrete resolution
- End with confidence-restoring statement
- Sign off as {{AgentName}}

Keep it under 200 words. Avoid corporate jargon. Sound human.`,
    vars: { Message: 'My order is 2 weeks late and I haven\'t received any updates. This is unacceptable.', Issue: 'shipping delay', OrderID: '#12345', Resolution: '20% refund + express reshipment', AgentName: 'Sarah' },
    starred: false,
    folder: 'Productivity',
    createdAt: '2025-10-20T11:15:00Z',
    updatedAt: '2025-11-21T15:30:00Z',
    usageCount: 64,
  },
  {
    id: 8,
    title: 'API Endpoint Designer',
    tags: ['api', 'backend', 'rest'],
    preview: 'Design a RESTful API endpoint for {{Resource}}. Operations: {{Operations}}…',
    path: 'Development/API Designer',
    content: `Design a **RESTful API** for **{{Resource}}**.

## Requirements
- **Operations**: {{Operations}}
- **Authentication**: {{Auth}} (JWT, OAuth2, API key, etc.)
- **Pagination**: cursor-based
- **Rate limiting**: 100 req/min/user
- **Versioning**: URL path (/v1/)

## Deliverables
1. Endpoint list with HTTP methods and paths
2. Request/response schemas (JSON)
3. Error responses (400, 401, 403, 404, 422, 500)
4. OpenAPI 3.1 spec snippet
5. Example curl commands
6. Database schema changes if needed

Follow REST best practices. Use proper HTTP status codes. Include idempotency keys for POST.`,
    vars: { Resource: 'user notifications', Operations: 'CRUD + mark as read + bulk delete', Auth: 'JWT' },
    starred: false,
    folder: 'Development',
    createdAt: '2025-11-01T09:30:00Z',
    updatedAt: '2025-11-20T16:20:00Z',
    usageCount: 12,
  },
  {
    id: 9,
    title: 'Image Alt Text Writer',
    tags: ['accessibility', 'seo', 'images'],
    preview: 'Write SEO-friendly and accessible alt text for an image showing {{Description}}…',
    path: 'Marketing/Alt Text Writer',
    content: `Write **accessible, SEO-friendly alt text** for an image.

**Image description**: {{Description}}
**Context**: {{Context}}
**Target keyword** (optional): {{Keyword}}

## Requirements
- Concise (under 125 characters)
- Descriptive of the actual content
- Include keyword naturally if provided
- No "image of" or "picture of" prefixes
- Mention if image contains text
- Decorative images: return empty string

Provide 3 variations:
1. Concise (under 80 chars)
2. Standard (under 125 chars)
3. Detailed (for complex images)`,
    vars: { Description: 'a laptop on a wooden desk showing a code editor with colorful syntax highlighting', Context: 'blog post about programming productivity', Keyword: 'best code editor' },
    starred: false,
    folder: 'Marketing',
    createdAt: '2025-11-05T13:40:00Z',
    updatedAt: '2025-11-19T12:00:00Z',
    usageCount: 28,
  },
  {
    id: 10,
    title: 'Bug Report Formatter',
    tags: ['qa', 'bugs', 'development'],
    preview: 'Format the following raw bug description into a structured bug report…',
    path: 'Development/Bug Report',
    content: `You are a meticulous **QA engineer**. Transform the following raw bug description into a well-structured bug report.

## Raw input
{{Description}}

## Output format

### Title
[Short, descriptive title]

### Environment
- OS:
- Browser/App version:
- Device:
- User account type:

### Steps to Reproduce
1.
2.
3.

### Expected Behavior

### Actual Behavior

### Severity
[Blocker | Critical | Major | Minor | Trivial]

### Screenshots/Videos
[Reference any mentioned]

### Additional Context

### Suggested Fix (optional)
[If you can infer the cause]`,
    vars: { Description: 'when I click the save button on the profile page, the page reloads and my changes are lost. happens in chrome only.' },
    starred: false,
    folder: 'Development',
    createdAt: '2025-10-28T10:00:00Z',
    updatedAt: '2025-11-18T15:10:00Z',
    usageCount: 19,
  },
  {
    id: 11,
    title: 'Story Idea Generator',
    tags: ['creative', 'writing', 'fiction'],
    preview: 'Generate 5 unique story ideas for the {{Genre}} genre. Theme: {{Theme}}…',
    path: 'Creative/Story Ideas',
    content: `You are a **published author and storytelling coach**. Generate 5 unique, compelling story ideas.

**Genre**: {{Genre}}
**Theme**: {{Theme}}
**Tone**: {{Tone}}
**Target length**: {{Length}}

For each idea, provide:
- **Title** (evocative, not generic)
- **Logline** (1–2 sentences)
- **Main character** (name, age, defining trait, internal conflict)
- **Setting** (time, place, atmosphere)
- **Inciting incident**
- **Three-act outline** (1 line each)
- **Why it works** (thematic resonance, originality)

Aim for variety: different sub-genres, perspectives, and stakes. Avoid clichés.`,
    vars: { Genre: 'science fiction', Theme: 'memory and identity', Tone: 'thoughtful, melancholic', Length: 'novella' },
    starred: true,
    folder: 'Creative',
    createdAt: '2025-09-18T18:30:00Z',
    updatedAt: '2025-11-21T11:45:00Z',
    usageCount: 7,
  },
  {
    id: 12,
    title: 'Meeting Agenda Builder',
    tags: ['meetings', 'productivity', 'management'],
    preview: 'Create a structured meeting agenda for: {{Topic}}. Duration: {{Duration}}…',
    path: 'Productivity/Meeting Agenda',
    content: `Create a **structured meeting agenda** for the following meeting.

**Topic**: {{Topic}}
**Duration**: {{Duration}}
**Attendees**: {{Attendees}}
**Goal**: {{Goal}}

## Output format

### Pre-meeting
- **Pre-read materials**: [list]
- **Decisions to make**: [list]
- **Parking lot items**: [list]

### Agenda

| Time | Topic | Owner | Type |
|------|-------|-------|------|
| 0:00 | Welcome & context | | discussion |
| 0:05 | … | | |

**Legend**: discussion | decision | info | workshop

### Post-meeting
- Action items template
- Follow-up date
- Notes taker assignment

Include time-boxing. Make it scannable.`,
    vars: { Topic: 'Q4 product roadmap review', Duration: '60 min', Attendees: 'PM, Eng Lead, Design Lead, CEO', Goal: 'align on Q4 priorities and resource allocation' },
    starred: false,
    folder: 'Productivity',
    createdAt: '2025-11-08T14:20:00Z',
    updatedAt: '2025-11-20T17:00:00Z',
    usageCount: 11,
  },
];

const seedFolders: Folder[] = [
  { name: 'Development', parent: null, children: [], icon: 'Code2', color: '#4A8EC9', order: 0 },
  { name: 'Marketing', parent: null, children: [], icon: 'Megaphone', color: '#FF6B35', order: 1 },
  { name: 'Productivity', parent: null, children: [], icon: 'Zap', color: '#35C98A', order: 2 },
  { name: 'Creative', parent: null, children: [], icon: 'Sparkles', color: '#C678DD', order: 3 },
];

interface PromtovaState {
  prompts: Prompt[];
  folders: Folder[];
  tags: Tag[];
  selectedPromptId: number | null;
  selectedFolder: string; // 'all' | 'starred' | folder name
  searchQuery: string;
  activeTagFilters: string[];
  editorMode: EditorMode;
  sortBy: SortKey;
  isDirty: boolean;
  lastSavedAt: string | null;
  sidebarCollapsed: boolean;

  // CRUD
  selectPrompt: (id: number | null) => void;
  createPrompt: (folder?: string) => number;
  updatePrompt: (id: number, patch: Partial<Prompt>) => void;
  deletePrompt: (id: number) => void;
  duplicatePrompt: (id: number) => void;
  toggleStar: (id: number) => void;
  incrementUsage: (id: number) => void;

  // Vars
  updateVar: (id: number, key: string, value: string) => void;
  addVar: (id: number, key: string, value: string) => void;
  removeVar: (id: number, key: string) => void;

  // Folders
  selectFolder: (folder: string) => void;
  createFolder: (name: string, parent?: string | null) => void;
  renameFolder: (oldName: string, newName: string) => void;
  deleteFolder: (name: string) => void;

  // Tags
  toggleTagFilter: (tag: string) => void;
  clearTagFilters: () => void;
  addTagToPrompt: (id: number, tag: string) => void;
  removeTagFromPrompt: (id: number, tag: string) => void;
  createTag: (name: string) => void;

  // UI
  setSearchQuery: (q: string) => void;
  setEditorMode: (m: EditorMode) => void;
  setSortBy: (s: SortKey) => void;
  setDirty: (d: boolean) => void;
  markSaved: () => void;
  toggleSidebar: () => void;
}

const slugify = (s: string) => s.trim().replace(/\s+/g, '-').toLowerCase();

const recomputeTags = (prompts: Prompt[]): Tag[] => {
  const map = new Map<string, number>();
  prompts.forEach((p) => {
    p.tags.forEach((t) => map.set(t, (map.get(t) || 0) + 1));
  });
  return Array.from(map.entries()).map(([name, count]) => ({
    id: slugify(name),
    name,
    count,
  }));
};

const makePreview = (content: string) =>
  content.replace(/[#*`>_\-\[\]]/g, '').replace(/\s+/g, ' ').trim().slice(0, 120);

export const usePromtovaStore = create<PromtovaState>()(
  persist(
    (set, get) => ({
      prompts: seedPrompts,
      folders: seedFolders,
      tags: recomputeTags(seedPrompts),
      selectedPromptId: 1,
      selectedFolder: 'all',
      searchQuery: '',
      activeTagFilters: [],
      editorMode: 'edit',
      sortBy: 'updated',
      isDirty: false,
      lastSavedAt: new Date().toISOString(),
      sidebarCollapsed: false,

      selectPrompt: (id) => set({ selectedPromptId: id, isDirty: false }),

      createPrompt: (folder = 'Development') => {
        const id = Date.now();
        const now = new Date().toISOString();
        const newPrompt: Prompt = {
          id,
          title: 'Новый промпт',
          tags: [],
          preview: '',
          path: `${folder}/Новый промпт`,
          content: `# Новый промпт\n\nОпишите здесь ваш промпт…\n\nИспользуйте переменные в формате {{имя_переменной}} для подстановки.\n`,
          vars: {},
          starred: false,
          folder,
          createdAt: now,
          updatedAt: now,
          usageCount: 0,
        };
        set((s) => ({
          prompts: [newPrompt, ...s.prompts],
          selectedPromptId: id,
          isDirty: false,
        }));
        return id;
      },

      updatePrompt: (id, patch) => {
        set((s) => {
          const prompts = s.prompts.map((p) =>
            p.id === id
              ? {
                  ...p,
                  ...patch,
                  updatedAt: new Date().toISOString(),
                  preview: patch.content !== undefined ? makePreview(patch.content) : p.preview,
                }
              : p,
          );
          return { prompts, tags: recomputeTags(prompts) };
        });
      },

      deletePrompt: (id) => {
        set((s) => {
          const prompts = s.prompts.filter((p) => p.id !== id);
          const wasSelected = s.selectedPromptId === id;
          return {
            prompts,
            tags: recomputeTags(prompts),
            selectedPromptId: wasSelected ? (prompts[0]?.id ?? null) : s.selectedPromptId,
          };
        });
      },

      duplicatePrompt: (id) => {
        const src = get().prompts.find((p) => p.id === id);
        if (!src) return;
        const newId = Date.now();
        const now = new Date().toISOString();
        const copy: Prompt = {
          ...src,
          id: newId,
          title: `${src.title} (копия)`,
          path: `${src.path} (копия)`,
          starred: false,
          usageCount: 0,
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ prompts: [copy, ...s.prompts], selectedPromptId: newId }));
      },

      toggleStar: (id) => {
        set((s) => ({
          prompts: s.prompts.map((p) => (p.id === id ? { ...p, starred: !p.starred } : p)),
        }));
      },

      incrementUsage: (id) => {
        set((s) => ({
          prompts: s.prompts.map((p) => (p.id === id ? { ...p, usageCount: p.usageCount + 1 } : p)),
        }));
      },

      updateVar: (id, key, value) => {
        set((s) => ({
          prompts: s.prompts.map((p) =>
            p.id === id ? { ...p, vars: { ...p.vars, [key]: value } } : p,
          ),
        }));
      },

      addVar: (id, key, value) => {
        set((s) => ({
          prompts: s.prompts.map((p) =>
            p.id === id ? { ...p, vars: { ...p.vars, [key]: value } } : p,
          ),
        }));
      },

      removeVar: (id, key) => {
        set((s) => ({
          prompts: s.prompts.map((p) => {
            if (p.id !== id) return p;
            const next = { ...p.vars };
            delete next[key];
            return { ...p, vars: next };
          }),
        }));
      },

      selectFolder: (folder) => set({ selectedFolder: folder, activeTagFilters: [] }),

      createFolder: (name, parent = null) => {
        if (!name.trim()) return;
        set((s) => {
          if (s.folders.some((f) => f.name === name)) return s;
          return {
            folders: [
              ...s.folders,
              {
                name,
                parent,
                children: [],
                icon: 'Folder',
                color: '#FF6B35',
                order: s.folders.length,
              },
            ],
          };
        });
      },

      renameFolder: (oldName, newName) => {
        if (!newName.trim() || oldName === newName) return;
        set((s) => ({
          folders: s.folders.map((f) => (f.name === oldName ? { ...f, name: newName } : f)),
          prompts: s.prompts.map((p) =>
            p.folder === oldName ? { ...p, folder: newName, path: p.path.replace(oldName, newName) } : p,
          ),
          selectedFolder: s.selectedFolder === oldName ? newName : s.selectedFolder,
        }));
      },

      deleteFolder: (name) => {
        set((s) => ({
          folders: s.folders.filter((f) => f.name !== name),
          prompts: s.prompts.filter((p) => p.folder !== name),
          selectedFolder: s.selectedFolder === name ? 'all' : s.selectedFolder,
        }));
      },

      toggleTagFilter: (tag) => {
        set((s) => ({
          activeTagFilters: s.activeTagFilters.includes(tag)
            ? s.activeTagFilters.filter((t) => t !== tag)
            : [...s.activeTagFilters, tag],
        }));
      },

      clearTagFilters: () => set({ activeTagFilters: [] }),

      addTagToPrompt: (id, tag) => {
        const clean = tag.replace(/^#/, '').trim();
        if (!clean) return;
        set((s) => {
          const prompts = s.prompts.map((p) =>
            p.id === id && !p.tags.includes(clean)
              ? { ...p, tags: [...p.tags, clean] }
              : p,
          );
          return { prompts, tags: recomputeTags(prompts) };
        });
      },

      removeTagFromPrompt: (id, tag) => {
        set((s) => {
          const prompts = s.prompts.map((p) =>
            p.id === id ? { ...p, tags: p.tags.filter((t) => t !== tag) } : p,
          );
          return { prompts, tags: recomputeTags(prompts) };
        });
      },

      createTag: (_name) => {
        // Tags are derived; this is a no-op but kept for API consistency
      },

      setSearchQuery: (q) => set({ searchQuery: q }),
      setEditorMode: (m) => set({ editorMode: m }),
      setSortBy: (s) => set({ sortBy: s }),
      setDirty: (d) => set({ isDirty: d }),
      markSaved: () => set({ isDirty: false, lastSavedAt: new Date().toISOString() }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
    }),
    {
      name: 'promtova-state',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        prompts: s.prompts,
        folders: s.folders,
        selectedFolder: s.selectedFolder,
        editorMode: s.editorMode,
        sortBy: s.sortBy,
        sidebarCollapsed: s.sidebarCollapsed,
      }),
    },
  ),
);

// ============= THEME STORE =============
export interface CustomTheme {
  id: string;
  name: string;
  isCustom: true;
  colors: Record<string, string>;
}

interface ThemeState {
  currentTheme: string;
  customThemes: CustomTheme[];
  setTheme: (id: string) => void;
  addCustomTheme: (theme: CustomTheme) => void;
  removeCustomTheme: (id: string) => void;
  updateCustomTheme: (id: string, theme: Partial<CustomTheme>) => void;
}

const presetThemes = {
  warm: {
    'bg-primary': '#1A0F0A',
    'bg-sidebar': '#1F1308',
    'bg-panel': '#241708',
    'bg-elevated': '#2A1B0C',
    'bg-hover': '#2F1F10',
    'bg-active': '#352414',
    'accent-primary': '#FF9B3D',
    'accent-hover': '#FFAB55',
    'accent-subtle': '#3D2518',
    'text-primary': '#FFE9D2',
    'text-secondary': '#C9A88A',
    'text-muted': '#8A6E58',
    'border-primary': '#3D2A1A',
    'border-subtle': '#2A1B0C',
  },
  ocean: {
    'bg-primary': '#0A1118',
    'bg-sidebar': '#0C141E',
    'bg-panel': '#0F1825',
    'bg-elevated': '#131D2C',
    'bg-hover': '#172233',
    'bg-active': '#1B2739',
    'accent-primary': '#3DA8FF',
    'accent-hover': '#5BB7FF',
    'accent-subtle': '#10243A',
    'text-primary': '#E6F1FF',
    'text-secondary': '#A7BBD0',
    'text-muted': '#6B82A0',
    'border-primary': '#1F2C3F',
    'border-subtle': '#15202E',
  },
  mint: {
    'bg-primary': '#0A1410',
    'bg-sidebar': '#0C1814',
    'bg-panel': '#0F1E18',
    'bg-elevated': '#13261F',
    'bg-hover': '#172D26',
    'bg-active': '#1B352D',
    'accent-primary': '#3DC9A8',
    'accent-hover': '#52D8B8',
    'accent-subtle': '#0F2A22',
    'text-primary': '#E0F5ED',
    'text-secondary': '#A0C7BA',
    'text-muted': '#688A7D',
    'border-primary': '#1E3A30',
    'border-subtle': '#142822',
  },
  lavender: {
    'bg-primary': '#120A18',
    'bg-sidebar': '#160C1E',
    'bg-panel': '#1A0F25',
    'bg-elevated': '#1F132D',
    'bg-hover': '#241736',
    'bg-active': '#291B3F',
    'accent-primary': '#B07AFF',
    'accent-hover': '#C094FF',
    'accent-subtle': '#241636',
    'text-primary': '#EFE3FF',
    'text-secondary': '#B8A5D4',
    'text-muted': '#7C6A95',
    'border-primary': '#2D1F3F',
    'border-subtle': '#1F142A',
  },
  mono: {
    'bg-primary': '#000000',
    'bg-sidebar': '#0A0A0A',
    'bg-panel': '#111111',
    'bg-elevated': '#1A1A1A',
    'bg-hover': '#222222',
    'bg-active': '#2A2A2A',
    'accent-primary': '#FFFFFF',
    'accent-hover': '#E5E5E5',
    'accent-subtle': '#1A1A1A',
    'text-primary': '#FFFFFF',
    'text-secondary': '#B0B0B0',
    'text-muted': '#707070',
    'border-primary': '#2A2A2A',
    'border-subtle': '#1A1A1A',
  },
};

export const applyTheme = (themeId: string, customThemes: CustomTheme[] = []) => {
  const root = document.documentElement;
  root.setAttribute('data-theme', themeId);

  if (themeId.startsWith('custom-')) {
    const theme = customThemes.find((t) => t.id === themeId);
    if (theme) {
      Object.entries(theme.colors).forEach(([k, v]) => {
        root.style.setProperty(`--${k}`, v);
      });
    }
  } else if (Object.prototype.hasOwnProperty.call(presetThemes, themeId)) {
    const preset = (presetThemes as Record<string, Record<string, string>>)[themeId];
    Object.entries(preset).forEach(([k, v]) => {
      root.style.setProperty(`--${k}`, v);
    });
  } else {
    // For built-in themes, remove inline overrides
    const allVars = [
      'bg-primary', 'bg-sidebar', 'bg-panel', 'bg-elevated', 'bg-hover', 'bg-active',
      'accent-primary', 'accent-hover', 'accent-subtle',
      'text-primary', 'text-secondary', 'text-muted',
      'border-primary', 'border-subtle',
    ];
    allVars.forEach((v) => root.style.removeProperty(`--${v}`));
  }
};

export const presetThemeIds = ['dark', 'light', 'warm', 'ocean', 'mint', 'lavender', 'mono'];

// ============= UI STORE (modals, toasts) =============
export interface Toast {
  id: number;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

interface UIState {
  settingsOpen: boolean;
  exportOpen: boolean;
  folderModalOpen: boolean;
  tagModalOpen: boolean;
  themeEditorOpen: boolean;
  shortcutsOpen: boolean;
  toasts: Toast[];
  openSettings: () => void;
  closeSettings: () => void;
  openExport: () => void;
  closeExport: () => void;
  openFolderModal: () => void;
  closeFolderModal: () => void;
  openThemeEditor: () => void;
  closeThemeEditor: () => void;
  openShortcuts: () => void;
  closeShortcuts: () => void;
  pushToast: (t: Omit<Toast, 'id'>) => void;
  dismissToast: (id: number) => void;
}

let toastCounter = 0;

export const useUIStore = create<UIState>((set) => ({
  settingsOpen: false,
  exportOpen: false,
  folderModalOpen: false,
  tagModalOpen: false,
  themeEditorOpen: false,
  shortcutsOpen: false,
  toasts: [],

  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),
  openExport: () => set({ exportOpen: true }),
  closeExport: () => set({ exportOpen: false }),
  openFolderModal: () => set({ folderModalOpen: true }),
  closeFolderModal: () => set({ folderModalOpen: false }),
  openThemeEditor: () => set({ themeEditorOpen: true }),
  closeThemeEditor: () => set({ themeEditorOpen: false }),
  openShortcuts: () => set({ shortcutsOpen: true }),
  closeShortcuts: () => set({ shortcutsOpen: false }),

  pushToast: (t) => {
    const id = ++toastCounter;
    set((s) => ({ toasts: [...s.toasts, { id, ...t }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) }));
    }, 3200);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}));

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      currentTheme: 'dark',
      customThemes: [],
      setTheme: (id) => set({ currentTheme: id }),
      addCustomTheme: (theme) => set((s) => ({ customThemes: [...s.customThemes, theme] })),
      removeCustomTheme: (id) =>
        set((s) => ({
          customThemes: s.customThemes.filter((t) => t.id !== id),
          currentTheme: s.currentTheme === id ? 'dark' : s.currentTheme,
        })),
      updateCustomTheme: (id, patch) =>
        set((s) => ({
          customThemes: s.customThemes.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        })),
    }),
    {
      name: 'promtova-theme',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
