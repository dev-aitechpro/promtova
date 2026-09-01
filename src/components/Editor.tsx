import { useState, useEffect, useRef, useMemo } from 'react';
import Button from './ui/Button';
import { IconButton } from './ui/Button';
import { usePromtovaStore, useUIStore } from '../store/usePromtovaStore';
import { substituteVariables, extractVariables, renderMarkdown, formatRelative, countWords, countChars, getPromptText } from '../utils/promtova';
import { copyToClipboard, promptTextForCopy } from '../utils/copy';
import { folderNameById, folderPath } from '../utils/folders';
import { Tag as TagIcon, Plus, Star, Eye, Pencil, Save, Copy, CopyPlus, Trash2, ChevronRight, X, Check, Sparkles, Hash, Keyboard, Folder, Zap, Palette, Layers, ArrowLeft, FileCode2, Type, FolderInput } from 'lucide-react';

// =============== Editor ===============
const Editor = () => {
  const {
    selectedPromptId,
    prompts,
    folders,
    tags,
    editorMode,
    setEditorMode,
    updatePrompt,
    markSaved,
    setDirty,
    duplicatePrompt,
    deletePrompt,
    toggleStar,
    incrementUsage,
    setVar,
    pruneVars,
    movePromptToFolder,
    autosave,
    editorFontSize,
    addTagToPrompt,
    removeTagFromPrompt,
    isDirty,
    lastSavedAt,
  } = usePromtovaStore();
  const { pushToast } = useUIStore();
  const [tagInput, setTagInput] = useState('');
  const [tagFocused, setTagFocused] = useState(false);
  const saveTimerRef = useRef<number | null>(null);

  const prompt = prompts.find((p) => p.id === selectedPromptId);

  const availableTags = useMemo(() => tags.filter((t) => !prompt?.tags.includes(t.name)), [tags, prompt?.tags]);
  const filteredTags = useMemo(() => {
    const q = tagInput.trim().toLowerCase();
    if (!q) return availableTags.slice(0, 12);
    return availableTags.filter((t) => t.name.toLowerCase().includes(q)).slice(0, 12);
  }, [availableTags, tagInput]);
  const showTagDropdown = tagFocused && filteredTags.length > 0;

  // Auto-save with debounce (отключаемая настройка — §8.3)
  useEffect(() => {
    if (!autosave || !isDirty || !prompt) return;
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      markSaved();
    }, 500);
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [autosave, isDirty, prompt, markSaved]);

  // ⌘S / ⌘C / ⌘⇧C / ⌘N / F2 обрабатываются глобально (см. useGlobalHotkeys, §8.1)

  if (!prompt) {
    return (
      <section
        className="flex h-full flex-1 flex-col items-center justify-center"
        style={{ background: 'var(--bg-primary)' }}
      >
        <div
          className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl"
          style={{
            background: 'linear-gradient(135deg, var(--accent-subtle), var(--bg-elevated))',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <Sparkles size={32} style={{ color: 'var(--accent-primary)' }} strokeWidth={2} />
        </div>
        <h3 className="text-[18px] font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
          Добро пожаловать в Промтовую
        </h3>
        <p className="mt-2 max-w-sm text-center text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
          IDE для промт-инжиниринга. Выберите промпт слева или создайте новый, чтобы начать работу.
        </p>
        <div className="mt-5 flex items-center gap-2">
          <Button
            variant="primary"
            size="md"
            onClick={() => {
              const s = usePromtovaStore.getState();
              const target =
                s.selectedFolderId === 'all' || s.selectedFolderId === 'starred'
                  ? 'Development'
                  : folderNameById(s.folders, s.selectedFolderId) ?? 'Development';
              const id = s.createPrompt(target);
              s.selectPrompt(id);
            }}
          >
            <Plus size={14} /> Новый промпт
          </Button>
          <Button
            variant="secondary"
            size="md"
            onClick={() => useUIStore.getState().openShortcuts()}
          >
            <Keyboard size={13} /> Горячие клавиши
          </Button>
        </div>

        {/* Quick tips */}
        <div className="mt-8 grid max-w-lg grid-cols-3 gap-3">
          {[
            { icon: <Zap size={14} />, title: 'Переменные', desc: '{{имя}} подставляются при копировании' },
            { icon: <Hash size={14} />, title: 'Теги', desc: 'Организуйте и фильтруйте базу' },
            { icon: <Palette size={14} />, title: 'Темы', desc: 'Тёмная, светлая и кастомные' },
          ].map((t, i) => (
            <div
              key={i}
              className="rounded-lg border p-3"
              style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}
            >
              <div className="mb-1.5" style={{ color: 'var(--accent-primary)' }}>{t.icon}</div>
              <p className="text-[11.5px] font-semibold" style={{ color: 'var(--text-primary)' }}>{t.title}</p>
              <p className="mt-0.5 text-[10.5px]" style={{ color: 'var(--text-muted)' }}>{t.desc}</p>
            </div>
          ))}
        </div>
      </section>
    );
  }

  const isTemplate = prompt.useTemplate === true;
  // переменные считаются по объединённому тексту промпта (§4.2)
  const vars = extractVariables(getPromptText(prompt));

  const handleContentChange = (newContent: string) => {
    updatePrompt(prompt.id, { content: newContent });
    setDirty(true);
  };

  const handleTitleChange = (newTitle: string) => {
    updatePrompt(prompt.id, { title: newTitle, path: `${prompt.folder}/${newTitle}` });
    setDirty(true);
  };

  /** Изменение блока шаблонного режима (§4.1). */
  const handleTemplateChange = (field: 'system' | 'context' | 'output', value: string) => {
    updatePrompt(
      prompt.id,
      field === 'system' ? { system: value } : field === 'context' ? { context: value } : { output: value },
    );
    setDirty(true);
  };

  /** Переключение «Обычный / Шаблонный» без потери текста (§4.1). */
  const handleToggleTemplate = (on: boolean) => {
    if (on) {
      updatePrompt(prompt.id, {
        useTemplate: true,
        system: prompt.system || prompt.content,
        context: prompt.context ?? '',
        output: prompt.output ?? '',
      });
    } else {
      updatePrompt(prompt.id, { useTemplate: false, content: getPromptText(prompt) });
    }
    setDirty(true);
  };

  const handleCopy = async (withVars: boolean) => {
    const ok = await copyToClipboard(promptTextForCopy(prompt, withVars));
    if (ok) {
      incrementUsage(prompt.id);
      pushToast({
        type: 'success',
        message: withVars ? 'Скопировано с подстановкой переменных' : 'Скопировано в буфер обмена',
      });
    } else {
      pushToast({ type: 'error', message: 'Не удалось скопировать' });
    }
  };

  const handleCopyTitle = async () => {
    const ok = await copyToClipboard(prompt.title);
    pushToast({ type: ok ? 'success' : 'error', message: ok ? 'Название скопировано' : 'Не удалось скопировать' });
  };

  const handleSave = () => {
    markSaved();
    pushToast({ type: 'success', message: 'Сохранено' });
  };

  const handleDelete = () => {
    if (confirm(`Удалить "${prompt.title}"?`)) {
      deletePrompt(prompt.id);
      pushToast({ type: 'warning', message: 'Промпт удалён' });
    }
  };

  // Превью считается по объединённому тексту промпта (§4.1)
  const fullText = getPromptText(prompt);
  const previewHtml = renderMarkdown(substituteVariables(fullText, prompt.vars));
  const previewEl = (extraClass = '') => (
    <div
      className={`md-body ${extraClass}`}
      style={{ color: 'var(--editor-text)' }}
      dangerouslySetInnerHTML={{ __html: previewHtml }}
    />
  );

  return (
    <section className="flex h-full flex-1 flex-col" style={{ background: 'var(--bg-primary)' }}>
      {/* Editor Header */}
      <header
        className="flex items-center justify-between border-b px-6 py-3.5"
        style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-panel)' }}
      >
        <div className="flex min-w-0 flex-1 flex-col">
          {editorMode === 'edit' ? (
            <input
              type="text"
              value={prompt.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="bg-transparent text-[17px] font-semibold outline-none"
              style={{ color: 'var(--text-primary)' }}
              placeholder="Название промпта"
            />
          ) : (
            <h1 className="truncate text-[17px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              {prompt.title}
            </h1>
          )}
          <div className="mt-1.5 flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
            <Folder size={11} />
            <span>{prompt.folder}</span>
            <ChevronRight size={10} />
            <span className="truncate">{prompt.title}</span>
            <span className="mx-1 h-3 w-px" style={{ background: 'var(--border-subtle)' }} />
            <FolderInput size={11} />
            <select
              value={prompt.folder}
              onChange={(e) => {
                movePromptToFolder(prompt.id, e.target.value);
                pushToast({ type: 'success', message: `Перемещён в «${e.target.value}»` });
                setDirty(true);
              }}
              aria-label="Переместить в папку"
              title="Переместить в папку"
              className="max-w-[160px] rounded border px-1.5 py-0.5 text-[11px] outline-none"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', borderColor: 'var(--border-subtle)' }}
            >
              {folders.map((f) => (
                <option key={f.id} value={f.name}>{folderPath(folders, f.id)}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <IconButton
            title={prompt.starred ? 'Убрать из избранного' : 'В избранное'}
            active={prompt.starred}
            onClick={() => toggleStar(prompt.id)}
          >
            <Star size={15} fill={prompt.starred ? 'currentColor' : 'none'} />
          </IconButton>

          <div
            className="mx-1 h-5 w-px"
            style={{ background: 'var(--border-subtle)' }}
          />

          <div
            className="flex items-center gap-0.5 rounded-md p-0.5"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
          >
            <button
              onClick={() => setEditorMode('view')}
              className="flex items-center gap-1 rounded px-2 py-1 text-[11.5px] font-medium transition-colors"
              style={{
                background: editorMode === 'view' ? 'var(--bg-active)' : 'transparent',
                color: editorMode === 'view' ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
              title="Только просмотр"
            >
              <Eye size={11} />
            </button>
            <button
              onClick={() => setEditorMode('split')}
              className="flex items-center gap-1 rounded px-2 py-1 text-[11.5px] font-medium transition-colors"
              style={{
                background: editorMode === 'split' ? 'var(--bg-active)' : 'transparent',
                color: editorMode === 'split' ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
              title="Разделённый вид"
            >
              <Layers size={11} />
            </button>
            <button
              onClick={() => setEditorMode('edit')}
              className="flex items-center gap-1 rounded px-2 py-1 text-[11.5px] font-medium transition-colors"
              style={{
                background: editorMode === 'edit' ? 'var(--bg-active)' : 'transparent',
                color: editorMode === 'edit' ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
              title="Только редактирование"
            >
              <Pencil size={11} />
            </button>
          </div>

          {/* Режим промпта: обычный / шаблонный (§4.1) */}
          <div
            role="group"
            aria-label="Режим промпта"
            className="flex items-center gap-0.5 rounded-md p-0.5"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
          >
            <button
              onClick={() => handleToggleTemplate(false)}
              aria-pressed={!isTemplate}
              className="rounded px-2 py-1 text-[11.5px] font-medium transition-colors"
              style={{
                background: !isTemplate ? 'var(--bg-active)' : 'transparent',
                color: !isTemplate ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
              title="Обычный промпт"
            >
              Обычный
            </button>
            <button
              onClick={() => handleToggleTemplate(true)}
              aria-pressed={isTemplate}
              className="flex items-center gap-1 rounded px-2 py-1 text-[11.5px] font-medium transition-colors"
              style={{
                background: isTemplate ? 'var(--bg-active)' : 'transparent',
                color: isTemplate ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
              title="Шаблонный промпт: System / Context / Output"
            >
              <FileCode2 size={11} /> Шаблонный
            </button>
          </div>

          <div className="mx-1 h-5 w-px" style={{ background: 'var(--border-subtle)' }} />

          <IconButton title="Копировать название" onClick={handleCopyTitle}>
            <Type size={14} />
          </IconButton>
          <Button variant="secondary" size="sm" onClick={() => { duplicatePrompt(prompt.id); pushToast({ type: 'info', message: 'Создана копия' }); }}>
            <CopyPlus size={13} /> Копия
          </Button>
          <Button variant="secondary" size="sm" onClick={handleSave}>
            <Save size={13} /> Сохранить
          </Button>
          <Button variant="secondary" size="sm" onClick={() => handleCopy(true)} title="⌘⇧C — подставить значения переменных">
            <Zap size={13} /> С подстановкой
          </Button>
          <Button variant="primary" size="sm" onClick={() => handleCopy(false)} title="⌘C — скопировать как есть">
            <Copy size={13} /> Копировать
          </Button>
          <IconButton title="Удалить" onClick={handleDelete}>
            <Trash2 size={14} />
          </IconButton>
        </div>
      </header>

      {/* Tags row — с выбором существующих тегов без ручного ввода */}
      <div
        className="flex flex-wrap items-center gap-1.5 border-b px-6 py-2.5"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <TagIcon size={12} style={{ color: 'var(--text-muted)' }} />
        {prompt.tags.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-mono"
            style={{
              background: 'var(--accent-subtle)',
              color: 'var(--accent-primary)',
              border: '1px solid rgba(255,107,53,0.25)',
            }}
          >
            #{t}
            <button
              onClick={() => removeTagFromPrompt(prompt.id, t)}
              className="ml-0.5 rounded-sm hover:bg-white/10"
            >
              <X size={10} />
            </button>
          </span>
        ))}
        <div className="relative">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onFocus={() => setTagFocused(true)}
            onBlur={() => setTimeout(() => setTagFocused(false), 150)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && tagInput.trim()) {
                addTagToPrompt(prompt.id, tagInput);
                setTagInput('');
              }
              if (e.key === 'Escape') setTagFocused(false);
            }}
            placeholder="Добавить тег..."
            className="rounded-md px-2 py-0.5 text-[11px] outline-none"
            style={{
              background: 'transparent',
              color: 'var(--text-primary)',
              border: '1px dashed var(--border-primary)',
              minWidth: '110px',
            }}
          />
          {showTagDropdown && (
            <div
              className="absolute left-0 top-full z-20 mt-1 max-h-40 w-48 overflow-y-auto rounded-md border p-1 shadow-lg"
              style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-primary)', boxShadow: 'var(--shadow-md)' }}
              onMouseDown={(e) => e.preventDefault()}
            >
              <div className="mb-1 px-1 text-[9px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                {tagInput.trim() ? 'Найдено' : 'Существующие теги'} · клик чтобы добавить
              </div>
              {filteredTags.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    addTagToPrompt(prompt.id, t.name);
                    setTagInput('');
                    setTagFocused(false);
                  }}
                  className="flex w-full items-center justify-between rounded px-2 py-1 text-left text-[11px] transition-colors"
                  style={{ color: 'var(--text-primary)' }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)')}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                >
                  <span>#{t.name}</span>
                  <span className="font-mono text-[9px]" style={{ color: 'var(--text-muted)' }}>{t.count}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        {availableTags.length > 0 && !tagFocused && !tagInput && (
          <span className="hidden items-center gap-1 sm:inline-flex">
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>·</span>
            {availableTags.slice(0, 6).map((t) => (
              <button
                key={t.id}
                onClick={() => addTagToPrompt(prompt.id, t.name)}
                className="rounded px-1.5 py-0.5 text-[10px] font-mono transition-colors"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}
                title={`Добавить #${t.name}`}
              >
                +#{t.name}
              </button>
            ))}
          </span>
        )}
      </div>

      {/* Variables panel */}
      {vars.length > 0 && (
        <div
          className="border-b px-6 py-3"
          style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-panel)' }}
        >
          <div className="mb-2 flex items-center gap-1.5">
            <Zap size={12} style={{ color: 'var(--accent-primary)' }} />
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
              Переменные ({vars.length})
            </span>
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              · подставляются при копировании с ⌘⇧C
            </span>
            <button
              onClick={() => {
                pruneVars(prompt.id);
                pushToast({ type: 'info', message: 'Неиспользуемые значения удалены' });
              }}
              className="ml-auto rounded px-2 py-0.5 text-[10px] transition-colors"
              style={{ color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}
              title="Удалить значения переменных, которых нет в тексте (§4.2)"
            >
              Очистить лишние
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {vars.map((v) => {
              const defined = prompt.vars[v] !== undefined && prompt.vars[v] !== '';
              return (
                <div
                  key={v}
                  className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5"
                  style={{
                    background: 'var(--bg-elevated)',
                    borderColor: defined ? 'var(--border-subtle)' : 'rgba(229, 107, 111, 0.35)',
                  }}
                >
                  <span
                    className="font-mono text-[11px] font-medium"
                    style={{ color: 'var(--accent-primary)' }}
                  >
                    {`{{${v}}}`}
                  </span>
                  <ArrowLeft size={10} style={{ color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    value={prompt.vars[v] || ''}
                    onChange={(e) => setVar(prompt.id, v, e.target.value)}
                    placeholder="значение…"
                    className="flex-1 bg-transparent text-[11.5px] outline-none"
                    style={{ color: 'var(--text-primary)' }}
                  />
                  {!defined && (
                    <span
                      className="rounded px-1.5 py-0.5 text-[9px] font-mono"
                      style={{ background: 'rgba(229, 107, 111, 0.15)', color: 'var(--status-error)' }}
                    >
                      не заполнено
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Editor body */}
      <div className="flex flex-1 overflow-hidden">
        {isTemplate ? (
          // Шаблонный режим: три логических блока (§4.1)
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {editorMode === 'view' ? (
              previewEl('')
            ) : (
              <div className="space-y-4">
                {(
                  [
                    { key: 'system', label: 'System Prompt', hint: 'Инструкция для модели', value: prompt.system ?? '' },
                    { key: 'context', label: 'Context', hint: 'Контекст и данные', value: prompt.context ?? '' },
                    { key: 'output', label: 'Output format', hint: 'Требуемый формат вывода', value: prompt.output ?? '' },
                  ] as const
                ).map((f) => (
                  <div key={f.key}>
                    <div className="mb-1.5 flex items-baseline gap-2">
                      <label
                        htmlFor={`tpl-${f.key}`}
                        className="text-[11px] font-semibold uppercase tracking-wider"
                        style={{ color: 'var(--accent-primary)' }}
                      >
                        {f.label}
                      </label>
                      <span className="text-[10.5px]" style={{ color: 'var(--text-muted)' }}>{f.hint}</span>
                    </div>
                    <textarea
                      id={`tpl-${f.key}`}
                      value={f.value}
                      onChange={(e) => handleTemplateChange(f.key, e.target.value)}
                      spellCheck={false}
                      placeholder="Переменные вида {{имя}} поддерживаются"
                      className="editor-textarea w-full resize-y rounded-md border px-3 py-2.5 outline-none"
                      style={{
                        background: 'var(--editor-bg)',
                        color: 'var(--editor-text)',
                        borderColor: 'var(--border-subtle)',
                        minHeight: '110px',
                        fontSize: editorFontSize,
                      }}
                    />
                  </div>
                ))}

                {editorMode === 'split' && (
                  <div className="border-t pt-4" style={{ borderColor: 'var(--border-subtle)' }}>
                    <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                      Превью · Markdown
                    </div>
                    {previewEl('')}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : editorMode === 'split' ? (
          <>
            <div className="flex-1 overflow-y-auto border-r" style={{ borderColor: 'var(--border-subtle)' }}>
              <textarea
                value={prompt.content}
                onChange={(e) => handleContentChange(e.target.value)}
                spellCheck={false}
                aria-label="Текст промпта"
                className="editor-textarea h-full w-full resize-none px-6 py-5 outline-none"
                style={{
                  background: 'var(--editor-bg)',
                  color: 'var(--editor-text)',
                  minHeight: '100%',
                  fontSize: editorFontSize,
                }}
              />
            </div>
            <div className="flex-1 overflow-y-auto" style={{ background: 'var(--bg-primary)' }}>
              <div className="px-6 py-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Превью · Markdown
              </div>
              {previewEl('px-6 pb-5')}
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {editorMode === 'edit' ? (
              <textarea
                value={prompt.content}
                onChange={(e) => handleContentChange(e.target.value)}
                spellCheck={false}
                aria-label="Текст промпта"
                className="editor-textarea h-full w-full resize-none px-6 py-5 outline-none"
                style={{
                  background: 'var(--editor-bg)',
                  color: 'var(--editor-text)',
                  minHeight: '100%',
                  fontSize: editorFontSize,
                }}
              />
            ) : (
              previewEl('h-full px-6 py-5')
            )}
          </div>
        )}
      </div>

      {/* Editor footer */}
      <footer
        className="flex items-center justify-between border-t px-6 py-2 text-[10.5px]"
        style={{ borderColor: 'var(--border-subtle)', background: 'var(--bg-panel)', color: 'var(--text-muted)' }}
      >
        <div className="flex items-center gap-4">
          <span>
            {countWords(fullText)} слов · {countChars(fullText)} симв.
          </span>
          <span>·</span>
          <span>{vars.length} переменных</span>
          <span>·</span>
          <span>{prompt.usageCount} использований</span>
        </div>
        <div className="flex items-center gap-2">
          {isDirty ? (
            <span className="flex items-center gap-1.5">
              <span
                className="inline-block h-1.5 w-1.5 rounded-full animate-pulse-dot"
                style={{ background: 'var(--status-warning)' }}
              />
              Не сохранено…
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <Check size={11} style={{ color: 'var(--status-success)' }} />
              Сохранено · {lastSavedAt ? formatRelative(lastSavedAt) : ''}
            </span>
          )}
        </div>
      </footer>
    </section>
  );
};

export default Editor;
