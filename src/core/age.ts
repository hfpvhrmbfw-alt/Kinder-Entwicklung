/**
 * Altersberechnung inkl. korrigiertem Alter bei Frühgeburt.
 *
 * Fachliche Grundlage: Bei Frühgeborenen wird in der Pädiatrie üblicherweise
 * bis etwa zum 2. Geburtstag das korrigierte Alter (ab errechnetem Termin)
 * für die Entwicklungsbeurteilung herangezogen. Die Grenze von 24 Monaten ist
 * als Konstante hinterlegt und im Content-Review als „zu prüfen“ markiert.
 */
import { addMonths, compareDates, daysBetween, parseDate, daysInMonth } from './dates';
import type { AgeBand, MonthRange } from './models/content';
import type { Child } from './models/user';

/** Bis zu diesem chronologischen Alter (in Monaten) gilt das korrigierte Alter. Zu prüfen. */
export const CORRECTED_AGE_LIMIT_MONTHS = 24;

/** Durchschnittliche Monatslänge, nur für Dezimal-Monate (Filter, Diagramme). */
const AVG_DAYS_PER_MONTH = 30.436875;

export interface AgeSpan {
  /** Volle Kalendermonate. */
  months: number;
  /** Resttage nach den vollen Monaten. */
  days: number;
  /** Gesamtzahl Tage. */
  totalDays: number;
}

/**
 * Alter in vollen Kalendermonaten und Resttagen.
 * Ein Monat ist vollendet, wenn der Monatstag erreicht ist; fehlt der Tag
 * im Monat (Geburt am 31.), zählt der Monatsletzte.
 */
export function ageSpan(birthDate: string, onDate: string): AgeSpan {
  if (compareDates(onDate, birthDate) < 0) {
    throw new Error('Stichtag liegt vor dem Geburtsdatum');
  }
  const b = parseDate(birthDate);
  const t = parseDate(onDate);
  let months = (t.year - b.year) * 12 + (t.month - b.month);
  const anniversaryDay = Math.min(b.day, daysInMonth(t.year, t.month));
  if (t.day < anniversaryDay) months -= 1;
  const lastMonthiversary = addMonths(birthDate, months);
  return { months, days: daysBetween(lastMonthiversary, onDate), totalDays: daysBetween(birthDate, onDate) };
}

/** Alter als Dezimalzahl in Monaten (z. B. 9.5), für Filter und Empfehlung. */
export function spanToDecimalMonths(span: AgeSpan): number {
  return span.months + span.days / AVG_DAYS_PER_MONTH;
}

export interface ChildAge {
  chronological: AgeSpan;
  /** Nur gesetzt, wenn ein korrigiertes Alter berechnet werden kann. */
  corrected?: AgeSpan;
  /** Das korrigierte Alter wird gerade für Empfehlungen genutzt. */
  usesCorrected: boolean;
  /** Errechneter Termin liegt noch in der Zukunft (korrigiertes Alter < 0). */
  beforeDueDate: boolean;
  /** Maßgebliches Alter in Dezimal-Monaten für Meilensteine, Filter, Empfehlung. */
  effectiveMonths: number;
  /** Frühgeburt in Wochen vor Termin, falls bekannt. */
  weeksPremature?: number;
}

/** Berechnet alle Altersangaben eines Kindes zum Stichtag. */
export function childAge(child: Pick<Child, 'birthDate' | 'dueDate' | 'useCorrectedAge'>, onDate: string): ChildAge {
  const chronological = ageSpan(child.birthDate, onDate);
  const result: ChildAge = {
    chronological,
    usesCorrected: false,
    beforeDueDate: false,
    effectiveMonths: spanToDecimalMonths(chronological),
  };

  const due = child.dueDate;
  if (!due || compareDates(due, child.birthDate) <= 0) return result;

  const prematureDays = daysBetween(child.birthDate, due);
  result.weeksPremature = Math.floor(prematureDays / 7);

  // Korrigiertes Alter = Alter ab errechnetem Termin.
  if (compareDates(onDate, due) < 0) {
    result.beforeDueDate = true;
    result.corrected = { months: 0, days: 0, totalDays: 0 };
  } else {
    result.corrected = ageSpan(due, onDate);
  }

  if (child.useCorrectedAge && chronological.months < CORRECTED_AGE_LIMIT_MONTHS) {
    result.usesCorrected = true;
    result.effectiveMonths = spanToDecimalMonths(result.corrected);
  }
  return result;
}

/** Liegt ein Alter (Dezimal-Monate) im Bereich? Untergrenze inklusiv, Obergrenze exklusiv. */
export function inRange(months: number, range: MonthRange, toleranceMonths = 0): boolean {
  return months >= range.minMonths - toleranceMonths && months < range.maxMonths + toleranceMonths;
}

/** Findet das Altersband für ein Alter; über dem letzten Band wird das letzte zurückgegeben. */
export function ageBandFor(months: number, bands: AgeBand[]): AgeBand | undefined {
  const sorted = [...bands].sort((a, b) => a.minMonths - b.minMonths);
  const hit = sorted.find((band) => inRange(months, band));
  if (hit) return hit;
  const last = sorted[sorted.length - 1];
  return last && months >= last.maxMonths ? last : undefined;
}
