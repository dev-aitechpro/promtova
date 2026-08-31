import { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { IconButton } from '../ui/Button';
import { useUIStore, useThemeStore, usePromtovaStore, applyTheme } from '../../store/usePromtovaStore';
import { Save, Trash2, Download, Check, AlertTriangle, Sparkles, Sun, Moon, Palette, Type, Layers, HardDrive } from 'lucide-react';
import { getDataPath, resetAllData } from '../../storage/nativeStorage';
import { openExternal } from '../../utils/openExternal';

// =============== Modals ===============
const SettingsModal = () => {
  const { settingsOpen, closeSettings, openShortcuts, openThemeEditor, openExport } = useUIStore();
  const { currentTheme, setTheme, customThemes, removeCustomTheme } = useThemeStore();
  const { autosave, setAutosave, editorFontSize, setEditorFontSize, prompts } = usePromtovaStore();
  const dataPath = getDataPath(); // путь к файлу данных в Electron, null в веб-режиме

  const themes = [
    { id: 'dark', name: 'Тёмный графит', icon: <Moon size={14} />, swatch: ['#0B0D10', '#FF6B35', '#F5F7FA'] },
    { id: 'light', name: 'Светлый айс', icon: <Sun size={14} />, swatch: ['#F8F9FA', '#FF6B35', '#111318'] },
    { id: 'warm', name: 'Тёплый янтарь', icon: <Sparkles size={14} />, swatch: ['#1A0F0A', '#FF9B3D', '#FFE9D2'] },
    { id: 'ocean', name: 'Холодный океан', icon: <Sparkles size={14} />, swatch: ['#0A1118', '#3DA8FF', '#E6F1FF'] },
    { id: 'mint', name: 'Мятная свежесть', icon: <Sparkles size={14} />, swatch: ['#0A1410', '#3DC9A8', '#E0F5ED'] },
    { id: 'lavender', name: 'Лавандовый', icon: <Sparkles size={14} />, swatch: ['#120A18', '#B07AFF', '#EFE3FF'] },
    { id: 'mono', name: 'Монохром', icon: <Sparkles size={14} />, swatch: ['#000000', '#FFFFFF', '#FFFFFF'] },
  ];

  return (
    <Modal
      open={settingsOpen}
      onClose={closeSettings}
      title="Настройки"
      width="640px"
      footer={
        <>
          <Button variant="ghost" onClick={openShortcuts}>Горячие клавиши</Button>
          <Button variant="ghost" onClick={openThemeEditor}>Создать тему</Button>
          <Button variant="primary" onClick={closeSettings}>Готово</Button>
        </>
      }
    >
      <div className="space-y-5">
        <section>
          <h3 className="mb-2.5 text-[12px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            Тема оформления
          </h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {themes.map((t) => {
              const active = currentTheme === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setTheme(t.id);
                    applyTheme(t.id, customThemes);
                  }}
                  className="group flex items-center gap-2.5 rounded-lg border p-2.5 text-left transition-all"
                  style={{
                    background: active ? 'var(--accent-subtle)' : 'var(--bg-panel)',
                    borderColor: active ? 'var(--accent-primary)' : 'var(--border-subtle)',
                  }}
                  onMouseEnter={(e) => {
                    if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)';
                  }}
                  onMouseLeave={(e) => {
                    if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--bg-panel)';
                  }}
                >
                  <div className="flex shrink-0 overflow-hidden rounded" style={{ border: '1px solid var(--border-subtle)' }}>
                    {t.swatch.map((c, i) => (
                      <div key={i} className="h-7 w-2" style={{ background: c }} />
                    ))}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>{t.name}</p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{active ? 'Активна' : 'Применить'}</p>
                  </div>
                  {active && <Check size={14} style={{ color: 'var(--accent-primary)' }} />}
                </button>
              );
            })}
          </div>

          {customThemes.length > 0 && (
            <div className="mt-3 space-y-1.5">
              <h4 className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Кастомные темы
              </h4>
              {customThemes.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                  style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-subtle)' }}
                >
                  <div className="flex items-center gap-2">
                    <Palette size={13} style={{ color: 'var(--accent-primary)' }} />
                    <span className="text-[12.5px] font-medium" style={{ color: 'var(--text-primary)' }}>{t.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="secondary" size="sm" onClick={() => { setTheme(t.id); applyTheme(t.id, customThemes); }}>Применить</Button>
                    <IconButton title="Удалить" onClick={() => { removeCustomTheme(t.id); if (currentTheme === t.id) applyTheme('dark', customThemes); }}>
                      <Trash2 size={13} />
                    </IconButton>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h3 className="mb-2.5 text-[12px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            Редактор
          </h3>
          <div className="space-y-2">
            <SettingRow
              icon={<Save size={13} />}
              title="Автосохранение"
              desc={autosave ? 'Изменения сохраняются через 500 мс' : 'Только вручную: ⌘S или кнопка «Сохранить»'}
              control={<Toggle checked={autosave} onChange={setAutosave} />}
            />
            <SettingRow
              icon={<Type size={13} />}
              title="Шрифт редактора"
              desc={`JetBrains Mono · ${editorFontSize}px`}
              control={
                <div className="flex items-center gap-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setEditorFontSize(editorFontSize - 1)}
                    disabled={editorFontSize <= 10}
                    aria-label="Уменьшить шрифт"
                  >
                    −
                  </Button>
                  <span
                    className="w-7 text-center font-mono text-[11.5px]"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {editorFontSize}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setEditorFontSize(editorFontSize + 1)}
                    disabled={editorFontSize >= 20}
                    aria-label="Увеличить шрифт"
                  >
                    +
                  </Button>
                </div>
              }
            />
            <SettingRow
              icon={<Layers size={13} />}
              title="Формат файлов"
              desc="Импорт и экспорт: .prmt (JSON), .md, .txt"
              control={<span className="font-mono text-[11px]" style={{ color: 'var(--text-muted)' }}>.prmt</span>}
            />
          </div>
        </section>

        <section>
          <h3 className="mb-2.5 text-[12px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            Данные
          </h3>
          <div className="space-y-2">
            {/* §8: показываем, где физически лежат данные */}
            <SettingRow
              icon={<HardDrive size={13} />}
              title="Расположение данных"
              desc={
                dataPath
                  ? `Файл на этом ПК: ${dataPath}`
                  : 'В памяти этой сессии (веб-режим: данные не сохраняются на диск)'
              }
              control={
                <span className="font-mono text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  {prompts.length} промптов
                </span>
              }
            />
            <SettingRow
              icon={<Download size={13} />}
              title="Резервная копия"
              desc="Выгрузить всю базу в файл .prmt"
              control={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    closeSettings();
                    openExport();
                  }}
                >
                  Экспорт
                </Button>
              }
            />
            <SettingRow
              icon={<AlertTriangle size={13} />}
              title="Сбросить все данные"
              desc="Удалить все промпты и настройки"
              control={
                <Button
                  variant="danger"
                  size="sm"
                  onClick={async () => {
                    if (!confirm('Удалить ВСЕ промпты и сбросить настройки? Это действие необратимо.')) return;
                    // чистим нативный файл (через IPC) и in-memory, затем перезапускаемся
                    await resetAllData();
                    location.reload();
                  }}
                >
                  Сбросить
                </Button>
              }
            />
          </div>
        </section>

        <section
          className="rounded-md border p-3 text-[11px]"
          style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
        >
          <strong style={{ color: 'var(--text-secondary)' }}>Промтовая</strong> · v1.2.1 · MIT License<br />
          © Pavel K. / Neurocode · {new Date().getFullYear()}
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              className="cursor-pointer underline hover:opacity-80"
              style={{ color: 'var(--accent)' }}
              onClick={() => openExternal('https://t.me/dev_aitech')}
            >
              Telegram @dev_aitech
            </button>
            <button
              type="button"
              className="cursor-pointer underline hover:opacity-80"
              style={{ color: 'var(--accent)' }}
              onClick={() => openExternal('https://boosty.to/kpavels1997/donate')}
            >
              Поддержать на boosty
            </button>
          </div>
        </section>
      </div>
    </Modal>
  );
};

const SettingRow = ({
  icon,
  title,
  desc,
  control,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  control: React.ReactNode;
}) => (
  <div
    className="flex items-center justify-between gap-3 rounded-md border px-3 py-2.5"
    style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-subtle)' }}
  >
    <div className="flex min-w-0 items-start gap-2.5">
      <div className="mt-0.5 shrink-0" style={{ color: 'var(--accent-primary)' }}>{icon}</div>
      <div className="min-w-0">
        <p className="truncate text-[12.5px] font-medium" style={{ color: 'var(--text-primary)' }}>{title}</p>
        <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{desc}</p>
      </div>
    </div>
    <div className="shrink-0">{control}</div>
  </div>
);

const Toggle = ({
  checked,
  onChange,
  defaultChecked,
}: {
  checked?: boolean;
  onChange?: (v: boolean) => void;
  defaultChecked?: boolean;
}) => {
  const [uncontrolled, setUncontrolled] = useState(!!defaultChecked);
  const on = checked ?? uncontrolled;
  const toggle = () => {
    const next = !on;
    if (checked === undefined) setUncontrolled(next);
    onChange?.(next);
  };
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={toggle}
      className="relative h-5 w-9 rounded-full transition-colors"
      style={{
        background: on ? 'var(--accent-primary)' : 'var(--bg-active)',
      }}
    >
      <span
        className="absolute top-0.5 h-4 w-4 rounded-full transition-all"
        style={{
          background: '#fff',
          left: on ? '18px' : '2px',
        }}
      />
    </button>
  );
};

export default SettingsModal;
