import type { LocalizedText } from './models/content';

/** Liefert den Text in der gewünschten Sprache, sonst Deutsch. */
export function localize(text: LocalizedText | undefined, locale: string = 'de'): string {
  if (!text) return '';
  const value = (text as unknown as Record<string, string | undefined>)[locale];
  return value ?? text.de;
}

/** Normalisiert für die Volltextsuche: Kleinbuchstaben, ohne Akzente, ß → ss. */
export function normalizeForSearch(value: string): string {
  return value
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}
