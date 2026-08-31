import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { useUIStore, useThemeStore, applyTheme, type CustomTheme } from '../../store/usePromtovaStore';
import { Check } from 'lucide-react';

const ThemeEditorModal = () => {
  const { themeEditorOpen, closeThemeEditor, pushToast } = useUIStore();
  const { addCustomTheme, customThemes } = useThemeStore();
  const [name, setName] = useState('Моя тема');
  const [colors, setColors] = useState<Record<string, string>>({
    'bg-primary': '#0B0D10',
    'bg-sidebar': '#0E1014',
    'bg-panel': '#111419',
    'bg-elevated': '#15181E',
    'bg-hover': '#191D23',
    'bg-active': '#1C2027',
    'accent-primary': '#FF6B35',
    'accent-hover': '#FF7847',
    'accent-subtle': '#3D2518',
    'text-primary': '#F5F7FA',
    'text-secondary': '#A7ADB7',
    'text-muted': '#737A86',
    'border-primary': '#242932',
    'border-subtle': '#1B1F26',
  });

  useEffect(() => {
    if (!themeEditorOpen) return;
    // preview: keep current built-in dark as base; live color edits applied via inline styles
  }, [themeEditorOpen]);

  const colorFields: Array<{ key: string; label: string; group: string }> = [
    { key: 'bg-primary', label: 'Основной фон', group: 'Базовые' },
    { key: 'bg-sidebar', label: 'Sidebar', group: 'Базовые' },
    { key: 'bg-panel', label: 'Панель', group: 'Базовые' },
    { key: 'bg-elevated', label: 'Elevated', group: 'Базовые' },
    { key: 'bg-hover', label: 'Hover', group: 'Базовые' },
    { key: 'bg-active', label: 'Active', group: 'Базовые' },
    { key: 'text-primary', label: 'Основной текст', group: 'Текст' },
    { key: 'text-secondary', label: 'Второстепенный', group: 'Текст' },
    { key: 'text-muted', label: 'Приглушённый', group: 'Текст' },
    { key: 'accent-primary', label: 'Основной акцент', group: 'Акценты' },
    { key: 'accent-hover', label: 'Акцент hover', group: 'Акценты' },
    { key: 'accent-subtle', label: 'Акцент subtle', group: 'Акценты' },
    { key: 'border-primary', label: 'Граница', group: 'Границы' },
    { key: 'border-subtle', label: 'Тонкая граница', group: 'Границы' },
  ];

  const groups = Array.from(new Set(colorFields.map((f) => f.group)));

  return (
    <Modal
      open={themeEditorOpen}
      onClose={closeThemeEditor}
      title="Редактор темы"
      width="640px"
      footer={
        <>
          <Button variant="ghost" onClick={closeThemeEditor}>Отмена</Button>
          <Button
            variant="primary"
            onClick={() => {
              const id = `custom-${Date.now()}`;
              const theme: CustomTheme = { id, name: name.trim() || 'Без названия', isCustom: true, colors };
              addCustomTheme(theme);
              applyTheme(id, [...customThemes, theme]);
              pushToast({ type: 'success', message: 'Тема создана' });
              closeThemeEditor();
            }}
          >
            <Check size={13} /> Сохранить
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            Название темы
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-[13px] outline-none"
            style={{ background: 'var(--bg-panel)', color: 'var(--text-primary)', borderColor: 'var(--border-primary)' }}
          />
        </div>

        {groups.map((g) => (
          <div key={g}>
            <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              {g}
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {colorFields
                .filter((f) => f.group === g)
                .map((f) => (
                  <div key={f.key} className="flex items-center gap-2 rounded-md border px-2.5 py-1.5" style={{ background: 'var(--bg-panel)', borderColor: 'var(--border-subtle)' }}>
                    <input
                      type="color"
                      value={colors[f.key]}
                      onChange={(e) => {
                        const newColors = { ...colors, [f.key]: e.target.value };
                        setColors(newColors);
                        // Live preview
                        const root = document.documentElement;
                        root.style.setProperty(`--${f.key}`, e.target.value);
                      }}
                      className="h-6 w-6 cursor-pointer rounded border-0"
                      style={{ background: 'transparent' }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-[11.5px] font-medium" style={{ color: 'var(--text-primary)' }}>{f.label}</p>
                      <input
                        type="text"
                        value={colors[f.key]}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) {
                            setColors({ ...colors, [f.key]: v });
                            document.documentElement.style.setProperty(`--${f.key}`, v);
                          }
                        }}
                        className="w-full bg-transparent font-mono text-[10px] outline-none"
                        style={{ color: 'var(--text-muted)' }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
};

export default ThemeEditorModal;
