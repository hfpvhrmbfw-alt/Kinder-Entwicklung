/**
 * Übersetzung: t('library.title'), t('age.months', { n: 3 }).
 * Texte liegen in locales/<sprache>.json. Fehlende Schlüssel fallen auf Deutsch zurück.
 */
import de from './locales/de.json';

type Dict = { [key: string]: string | Dict };
const locales: Record<string, Dict> = { de };
let current = 'de';

export function setLocale(locale: string): void {
  current = locales[locale] ? locale : 'de';
  document.documentElement.lang = current;
}

export function getLocale(): string {
  return current;
}

function lookup(dict: Dict | undefined, key: string): string | undefined {
  let node: string | Dict | undefined = dict;
  for (const part of key.split('.')) {
    if (!node || typeof node === 'string') return undefined;
    node = node[part];
  }
  return typeof node === 'string' ? node : undefined;
}

export function t(key: string, params: Record<string, string | number> = {}): string {
  const raw = lookup(locales[current], key) ?? lookup(locales.de, key) ?? key;
  return raw.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? `{${name}}`));
}

/** Einzahl/Mehrzahl: Schlüssel `key.one` / `key.other`. */
export function tn(key: string, n: number, params: Record<string, string | number> = {}): string {
  return t(`${key}.${n === 1 ? 'one' : 'other'}`, { n, ...params });
}
