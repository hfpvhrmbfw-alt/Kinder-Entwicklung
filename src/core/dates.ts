/**
 * Reine Kalenderrechnung auf "YYYY-MM-DD"-Strings.
 *
 * Bewusst ohne `Date`-Objekte mit Uhrzeit: So gibt es keine Zeitzonen- oder
 * Sommerzeit-Fehler (ein Geburtstag ist ein Kalendertag, kein Zeitpunkt).
 * Swift-Pendant: `DateComponents` mit `Calendar(identifier: .gregorian)` in UTC.
 */

export interface CalendarDate {
  year: number;
  month: number; // 1–12
  day: number; // 1–31
}

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(year: number, month: number): number {
  const table = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return table[month - 1] ?? 30;
}

export function parseDate(value: string): CalendarDate {
  const m = DATE_RE.exec(value);
  if (!m) throw new Error(`Ungültiges Datum: "${value}" (erwartet YYYY-MM-DD)`);
  const date = { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
  if (date.month < 1 || date.month > 12 || date.day < 1 || date.day > daysInMonth(date.year, date.month)) {
    throw new Error(`Ungültiges Datum: "${value}"`);
  }
  return date;
}

export function isValidDate(value: string): boolean {
  try {
    parseDate(value);
    return true;
  } catch {
    return false;
  }
}

export function formatDate(d: CalendarDate): string {
  const pad = (n: number, len = 2) => String(n).padStart(len, '0');
  return `${pad(d.year, 4)}-${pad(d.month)}-${pad(d.day)}`;
}

/** Tage seit 1970-01-01 (proleptischer Gregorianischer Kalender). */
export function toDayNumber(d: CalendarDate): number {
  return Math.round(Date.UTC(d.year, d.month - 1, d.day) / 86_400_000);
}

export function fromDayNumber(n: number): CalendarDate {
  const dt = new Date(n * 86_400_000);
  return { year: dt.getUTCFullYear(), month: dt.getUTCMonth() + 1, day: dt.getUTCDate() };
}

export function compareDates(a: string, b: string): number {
  return toDayNumber(parseDate(a)) - toDayNumber(parseDate(b));
}

export function daysBetween(from: string, to: string): number {
  return toDayNumber(parseDate(to)) - toDayNumber(parseDate(from));
}

export function addDays(date: string, days: number): string {
  return formatDate(fromDayNumber(toDayNumber(parseDate(date)) + days));
}

/**
 * Monate addieren. Existiert der Tag im Zielmonat nicht, wird auf den
 * Monatsletzten gekürzt (31. Jan + 1 Monat = 28./29. Feb).
 */
export function addMonths(date: string, months: number): string {
  const d = parseDate(date);
  const total = d.year * 12 + (d.month - 1) + months;
  const year = Math.floor(total / 12);
  const month = (total % 12) + 1;
  return formatDate({ year, month, day: Math.min(d.day, daysInMonth(year, month)) });
}

/** Heutiges Datum in lokaler Zeit (der Kalendertag, den Eltern gerade erleben). */
export function todayLocal(now: Date = new Date()): string {
  return formatDate({ year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() });
}
