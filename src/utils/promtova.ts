// Variable substitution & content utilities
import type { Prompt, PromptId } from '../shared/types';

/** Устойчивый id: crypto.randomUUID с фолбэком для окружений без Web Crypto (§4.3). */
export const newId = (): PromptId => {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

/**
 * Единый источник текста промпта (§4.1).
 * Обычный режим — `content`; шаблонный — склейка system/context/output.
 */
export const getPromptText = (p: Prompt): string => {
  if (p.useTemplate) {
    return [p.system, p.context, p.output].filter((s) => s && s.trim()).join('\n\n');
  }
  return p.content ?? '';
};

export const substituteVariables = (
  content: string,
  vars: Record<string, string>,
): string => {
  return content.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
    const trimmed = key.trim();
    return vars[trimmed] !== undefined && vars[trimmed] !== '' ? vars[trimmed] : `{{${trimmed}}}`;
  });
};

export const extractVariables = (content: string): string[] => {
  const set = new Set<string>();
  const re = /\{\{([^}]+)\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    set.add(m[1].trim());
  }
  return Array.from(set);
};

/**
 * Допускаем только безопасные схемы (§8.4). Всё прочее (`javascript:`, `data:` и т.п.)
 * отклоняется — ссылка остаётся обычным текстом.
 */
export const sanitizeUrl = (url: string): string | null => {
  const u = url.trim();
  if (!u) return null;
  // относительные ссылки и якоря всегда разрешены
  if (/^[#/]/.test(u) || u.startsWith('./') || u.startsWith('../')) return u;
  // есть явная схема — проверяем по белому списку
  if (/^[a-z][a-z0-9+.-]*:/i.test(u)) {
    return /^(https?:|mailto:)/i.test(u) ? u : null;
  }
  return u; // без схемы — считаем относительной
};

/** Экранирование кавычек: текст уже экранирован по `& < >`, защищаем только атрибут. */
const escapeAttr = (s: string) => s.replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// Lightweight Markdown -> HTML (covers our needs: headings, bold, italic, code, lists, blockquote, hr, links)
export const renderMarkdown = (md: string): string => {
  let html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Code blocks
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre><code class="lang-${lang}">${code.trim()}</code></pre>`;
  });

  // Inline code
  html = html.replace(/`([^`\n]+)`/g, '<code>$1</code>');

  // Variable tokens {{x}} -> styled
  html = html.replace(/\{\{([^}]+)\}\}/g, '<span class="var-token">{{$1}}</span>');

  // Headings
  html = html.replace(/^###### (.*)$/gm, '<h6>$1</h6>');
  html = html.replace(/^##### (.*)$/gm, '<h5>$1</h5>');
  html = html.replace(/^#### (.*)$/gm, '<h4>$1</h4>');
  html = html.replace(/^### (.*)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.*)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.*)$/gm, '<h1>$1</h1>');

  // Blockquote
  html = html.replace(/^> (.*)$/gm, '<blockquote>$1</blockquote>');

  // Horizontal rule
  html = html.replace(/^---$/gm, '<hr/>');

  // Bold / italic
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/(^|\W)_(.+?)_(\W|$)/g, '$1<em>$2</em>$3');
  html = html.replace(/(^|\W)\*(.+?)\*(\W|$)/g, '$1<em>$2</em>$3');

  // Links (href валидируется по схеме и экранируется — §8.4)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
    const safe = sanitizeUrl(url);
    if (!safe) return match; // небезопасная схема — оставляем исходный текст
    return `<a href="${escapeAttr(safe)}" target="_blank" rel="noopener noreferrer">${text}</a>`;
  });

  // Tables (simple)
  html = html.replace(/((?:\|[^\n]+\|\n)+)/g, (block) => {
    const rows = block.trim().split('\n');
    if (rows.length < 2) return block;
    const head = rows[0].split('|').slice(1, -1).map((c) => c.trim());
    const align = rows[1].split('|').slice(1, -1).map((c) => /:-+:?/.test(c.trim()));
    if (rows[1].split('|').length < 3) return block;
    const bodyRows = rows.slice(2).map((r) => r.split('|').slice(1, -1).map((c) => c.trim()));
    const ths = head.map((h, i) => `<th style="text-align:${align[i] ? (align[i] === true ? 'left' : 'center') : 'left'}">${h}</th>`).join('');
    const trs = bodyRows
      .map((cols) => {
        const tds = cols.map((c, i) => `<td style="text-align:${align[i] ? (align[i] === true ? 'left' : 'center') : 'left'}">${c}</td>`).join('');
        return `<tr>${tds}</tr>`;
      })
      .join('');
    return `<table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`;
  });

  // Unordered lists
  html = html.replace(/(?:^|\n)((?:- .+(?:\n|$))+)/g, (block) => {
    const items = block.trim().split('\n').map((l) => l.replace(/^- /, '').trim());
    return `\n<ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>`;
  });

  // Ordered lists
  html = html.replace(/(?:^|\n)((?:\d+\. .+(?:\n|$))+)/g, (block) => {
    const items = block.trim().split('\n').map((l) => l.replace(/^\d+\. /, '').trim());
    return `\n<ol>${items.map((i) => `<li>${i}</li>`).join('')}</ol>`;
  });

  // Paragraphs
  html = html
    .split(/\n{2,}/)
    .map((block) => {
      if (/^\s*<(h\d|ul|ol|pre|blockquote|hr|table)/.test(block)) return block;
      if (block.trim() === '') return '';
      return `<p>${block.replace(/\n/g, '<br/>')}</p>`;
    })
    .join('\n');

  return html;
};

export const fuzzyMatch = (text: string, query: string): boolean => {
  if (!query) return true;
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  if (t.includes(q)) return true;
  // simple fuzzy: every char of q appears in order in t
  let i = 0;
  for (const ch of t) {
    if (ch === q[i]) i++;
    if (i === q.length) return true;
  }
  return false;
};

export const formatRelative = (iso: string): string => {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'только что';
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)} дн назад`;
  if (diff < 31536000) return `${Math.floor(diff / 2592000)} мес назад`;
  return `${Math.floor(diff / 31536000)} г назад`;
};

export const countWords = (s: string): number => s.trim().split(/\s+/).filter(Boolean).length;
export const countChars = (s: string): number => s.length;

export const downloadFile = (filename: string, content: string, mimeType = 'application/json') => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const readFileAsText = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
