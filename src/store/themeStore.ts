import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { CustomTheme } from '../shared/types';
import { nativeStorage } from '../storage/nativeStorage';

interface ThemeState {
  currentTheme: string;
  customThemes: CustomTheme[];
  setTheme: (id: string) => void;
  addCustomTheme: (theme: CustomTheme) => void;
  removeCustomTheme: (id: string) => void;
}

const presetThemes: Record<string, Record<string, string>> = {
  warm: {
    'bg-primary':'#1A0F0A','bg-sidebar':'#1F1308','bg-panel':'#241708','bg-elevated':'#2A1B0C','bg-hover':'#2F1F10','bg-active':'#352414',
    'accent-primary':'#FF9B3D','accent-hover':'#FFAB55','accent-subtle':'#3D2518','text-primary':'#FFE9D2','text-secondary':'#C9A88A','text-muted':'#8A6E58','border-primary':'#3D2A1A','border-subtle':'#2A1B0C',
  },
  ocean: {
    'bg-primary':'#0A1118','bg-sidebar':'#0C141E','bg-panel':'#0F1825','bg-elevated':'#131D2C','bg-hover':'#172233','bg-active':'#1B2739',
    'accent-primary':'#3DA8FF','accent-hover':'#61B8FF','accent-subtle':'#112942','text-primary':'#E2F1FF','text-secondary':'#A7C0D6','text-muted':'#6F8A9F','border-primary':'#203447','border-subtle':'#162735',
  },
  mint: {
    'bg-primary':'#0A1410','bg-sidebar':'#0C1814','bg-panel':'#0F1E18','bg-elevated':'#13261F','bg-hover':'#172D26','bg-active':'#1B352D',
    'accent-primary':'#3DC9A8','accent-hover':'#52D8B8','accent-subtle':'#0F2A22','text-primary':'#E0F5ED','text-secondary':'#A0C7BA','text-muted':'#688A7D','border-primary':'#1E3A30','border-subtle':'#142822',
  },
  lavender: {
    'bg-primary':'#120A18','bg-sidebar':'#160C1E','bg-panel':'#1A0F25','bg-elevated':'#1F132D','bg-hover':'#241736','bg-active':'#291B3F',
    'accent-primary':'#B07AFF','accent-hover':'#C094FF','accent-subtle':'#241636','text-primary':'#EFE3FF','text-secondary':'#B8A5D4','text-muted':'#7C6A95','border-primary':'#2D1F3F','border-subtle':'#1F142A',
  },
  mono: {
    'bg-primary':'#000000','bg-sidebar':'#0A0A0A','bg-panel':'#111111','bg-elevated':'#1A1A1A','bg-hover':'#222222','bg-active':'#2A2A2A',
    'accent-primary':'#FFFFFF','accent-hover':'#E5E5E5','accent-subtle':'#1A1A1A','text-primary':'#FFFFFF','text-secondary':'#B0B0B0','text-muted':'#707070','border-primary':'#2A2A2A','border-subtle':'#1A1A1A',
  },
};

const cssVariableKeys = [
  'bg-primary','bg-sidebar','bg-panel','bg-elevated','bg-hover','bg-active',
  'accent-primary','accent-hover','accent-subtle','text-primary','text-secondary','text-muted',
  'border-primary','border-subtle',
];

export const applyTheme = (themeId: string, customThemes: CustomTheme[] = []) => {
  const root = document.documentElement;
  root.setAttribute('data-theme', themeId);
  const theme = themeId.startsWith('custom-')
    ? customThemes.find((item) => item.id === themeId)?.colors
    : presetThemes[themeId];
  if (theme) Object.entries(theme).forEach(([key, value]) => root.style.setProperty(`--${key}`, value));
  else cssVariableKeys.forEach((key) => root.style.removeProperty(`--${key}`));
};

export const presetThemeIds = ['dark', 'light', 'warm', 'ocean', 'mint', 'lavender', 'mono'] as const;

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      currentTheme: 'dark',
      customThemes: [],
      setTheme: (id) => set({ currentTheme: id }),
      addCustomTheme: (theme) => set((state) => ({ customThemes: [...state.customThemes, theme] })),
      removeCustomTheme: (id) => set((state) => ({
        customThemes: state.customThemes.filter((theme) => theme.id !== id),
        currentTheme: state.currentTheme === id ? 'dark' : state.currentTheme,
      })),
    }),
    { name: 'promtova-theme', storage: createJSONStorage(() => nativeStorage) },
  ),
);

export type { CustomTheme };
