// Сид-данные приложения. Id промптов — строки (§4.3).
import type { Folder, Prompt } from '../shared/types';

export const seedPrompts: Prompt[] = [

  {
    id: 'seed-1',
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
    id: 'seed-2',
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
    id: 'seed-3',
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
    id: 'seed-4',
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
    id: 'seed-5',
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
    id: 'seed-6',
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
    id: 'seed-7',
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
    id: 'seed-8',
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
    id: 'seed-9',
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
    id: 'seed-10',
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
    id: 'seed-11',
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
    id: 'seed-12',
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

  {
    id: 'seed-13',
    title: 'Генератор Release Notes',
    tags: ['release', 'changelog', 'development'],
    preview: 'Собери Release Notes для версии {{Version}} на основе списка изменений…',
    path: 'Development/Генератор Release Notes',
    content: [
      'Ты — технический писатель, который готовит Release Notes для разработчиков.',
      '',
      '## Изменения между версиями',
      '{{Changelog}}',
      '',
      '## Формат вывода',
      '1. Заголовок с версией и датой',
      '2. Разделы: Features / Fixes / Breaking Changes',
      '3. Краткое описание каждого изменения (1 строка)',
      '4. Блок «Как обновиться» при наличии Breaking Changes',
    ].join('\n'),
    system: 'Ты — технический писатель, который готовит Release Notes для разработчиков. Пиши по-русски, кратко и по делу, без маркетинговых прилагательных.',
    context: '## Версия\n{{Version}}\n\n## Изменения между версиями\n{{Changelog}}',
    output: '## Формат вывода\n1. Заголовок с версией и датой\n2. Разделы: Features / Fixes / Breaking Changes\n3. Краткое описание каждого изменения (1 строка)\n4. Блок «Как обновиться» при наличии Breaking Changes\n\nВыведи результат в Markdown.',
    useTemplate: true,
    vars: {
      Version: '2.4.0',
      Changelog:
        '- Добавлен экспорт в Markdown\n- Исправлена утечка памяти при поиске\n- Удалены устаревшие методы API v1',
    },
    starred: true,
    folder: 'Development',
    createdAt: '2025-11-10T10:00:00Z',
    updatedAt: '2025-11-22T09:15:00Z',
    usageCount: 6,
  },
  {
    id: 'seed-14',
    title: 'Отчёт аналитика данных',
    tags: ['analytics', 'data', 'report'],
    preview: 'Проанализируй датасет {{Dataset}} и ответь на вопрос: {{Question}}…',
    path: 'Productivity/Отчёт аналитика данных',
    content: [
      'Ты — senior data analyst. Проанализируй данные и дай обоснованный вывод.',
      '',
      '## Датасет',
      '{{Dataset}}',
      '',
      '## Вопрос',
      '{{Question}}',
    ].join('\n'),
    system: 'Ты — senior data analyst с 10-летним опытом. Опирайся только на переданные данные, явно помечай гипотезы и не выдумывай цифры.',
    context: '## Датасет\n{{Dataset}}\n\n## Вопрос\n{{Question}}',
    output: 'Структура ответа:\n1. Краткое резюме (3-5 строк)\n2. Метод и допущения\n3. Ключевые находки с цифрами\n4. Рекомендации\n5. Ограничения анализа\n\nФормат — Markdown, с таблицами где уместно.',
    useTemplate: true,
    vars: {
      Dataset: 'sales_2025.csv — 1.2M строк, поля: date, region, channel, revenue',
      Question: 'Почему выручка просела в Q3 по сравнению с Q2?',
    },
    starred: false,
    folder: 'Productivity',
    createdAt: '2025-11-12T15:30:00Z',
    updatedAt: '2025-11-23T12:40:00Z',
    usageCount: 3,
  },
];

export const seedFolders: Folder[] = [

  { id: 'folder-development', name: 'Development', parent: null, children: [], icon: 'Code2', color: '#4A8EC9', order: 0 },
  { id: 'folder-marketing', name: 'Marketing', parent: null, children: [], icon: 'Megaphone', color: '#FF6B35', order: 1 },
  { id: 'folder-productivity', name: 'Productivity', parent: null, children: [], icon: 'Zap', color: '#35C98A', order: 2 },
  { id: 'folder-creative', name: 'Creative', parent: null, children: [], icon: 'Sparkles', color: '#C678DD', order: 3 },
];
