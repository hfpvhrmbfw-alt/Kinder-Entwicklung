/** Anzeigeformate (Sprachabhängig, daher in der UI-Schicht, nicht in core). */
import type { AgeSpan, ChildAge } from '../core/age';
import { parseDate } from '../core/dates';
import type { Activity, DomainId, MonthRange } from '../core/models/content';
import { getLocale, t, tn } from '../i18n';
import { h } from './lib/h';

export function formatSpan(span: AgeSpan): string {
  if (span.months === 0) {
    return span.totalDays < 14 ? tn('age.days', span.totalDays) : tn('age.weeks', Math.floor(span.totalDays / 7));
  }
  if (span.months < 3) return tn('age.weeks', Math.floor(span.totalDays / 7));
  if (span.months < 24) return tn('age.months', span.months);
  const years = Math.floor(span.months / 12);
  const rest = span.months % 12;
  return rest ? `${tn('age.years', years)}, ${tn('age.months', rest)}` : tn('age.years', years);
}

export function formatChildAge(age: ChildAge): string {
  const base = formatSpan(age.chronological);
  if (age.corrected && age.usesCorrected) return `${base} (${t('age.corrected', { age: formatSpan(age.corrected) })})`;
  return base;
}

/** Monatsangabe für Zeitfenster: unter 24 Monaten in Monaten, sonst in Jahren. */
export function formatMonths(months: number): string {
  if (months < 24 || months % 12 !== 0) return tn('age.months', months);
  return tn('age.years', months / 12);
}

export function formatAgeRange(r: MonthRange): string {
  const { minMonths: a, maxMonths: b } = r;
  if (b <= 24 || a % 12 !== 0 || b % 12 !== 0) {
    if (a >= 24 && a % 12 === 0 && b % 12 === 0) return t('age.rangeYears', { min: a / 12, max: b / 12 });
    if (b > 24 && b % 12 === 0) return t('age.rangeMixed', { min: a, max: b / 12 });
    return t('age.rangeMonths', { min: a, max: b });
  }
  return t('age.rangeYears', { min: a / 12, max: b / 12 });
}

export function formatDuration(a: Activity): string {
  const { min, max } = a.durationMinutes;
  return min === max ? t('common.minutes', { n: min }) : t('common.minutesRange', { min, max });
}

export function formatDate(value: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }): string {
  const d = parseDate(value);
  return new Intl.DateTimeFormat(getLocale(), { ...opts, timeZone: 'UTC' }).format(Date.UTC(d.year, d.month - 1, d.day));
}

export function domainBadge(domain: DomainId): HTMLElement {
  return h('span', { class: 'badge badge--domain', style: `--badge-color: var(--color-domain-${domain})` }, t(`domain.${domain}`));
}

/** Zeitfenster im Satz „meist mit …“: „4–9 Monaten“, „3–4 Jahren“, „18 Monaten bis 3 Jahren“. */
export function formatWindow(fromMonths: number, toMonths: number): string {
  const years = (m: number) => m >= 24 && m % 12 === 0;
  if (years(fromMonths) && years(toMonths)) return t('age.windowYears', { from: fromMonths / 12, to: toMonths / 12 });
  if (years(toMonths) && toMonths > 24) return t('age.windowMixed', { from: fromMonths, to: toMonths / 12 });
  return t('age.windowMonths', { from: fromMonths, to: toMonths });
}

/** Zeitraum kurz: „14. Mai – 13. Juli 2026“, über den Jahreswechsel mit beiden Jahren, ein Tag ohne Strich. */
export function formatDateRange(start: string, end: string): string {
  if (start === end) return formatDate(start);
  const sameYear = start.slice(0, 4) === end.slice(0, 4);
  return `${formatDate(start, sameYear ? { day: 'numeric', month: 'long' } : undefined)} – ${formatDate(end)}`;
}

/** Datei auf dem Gerät speichern (Sicherung, Kalender). */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  const a = h('a', { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
