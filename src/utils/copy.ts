// Копирование промпта в буфер обмена (§7.2).
import type { Prompt } from '../shared/types';
import { getPromptText, substituteVariables } from './promtova';

/** Текст промпта для копирования; при `substitute` переменные подставляются. */
export const promptTextForCopy = (p: Prompt, substitute: boolean): string => {
  const text = getPromptText(p);
  return substitute ? substituteVariables(text, p.vars) : text;
};

/** Копирование с фолбэком для сборок без secure context (file://). */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // ниже — фолбэк
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
};
