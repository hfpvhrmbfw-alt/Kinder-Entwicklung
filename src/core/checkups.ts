/**
 * U-Untersuchungen (U1–U9): Zeiträume je Kind und Status.
 *
 * Gerechnet wird immer ab dem tatsächlichen Geburtsdatum, nicht mit korrigiertem Alter:
 * Die Kinder-Richtlinie richtet die Zeiträume nach dem Lebensalter aus.
 * Die Richtlinie kennt außerdem Toleranzzeiten; die App zeigt den regulären Zeitraum.
 */
import { addDays, addMonths, daysBetween } from './dates';
import type { Checkup } from './models/content';
import type { CheckupRecord, DateString } from './models/user';

/** So lange vor Beginn des Zeitraums gilt eine Untersuchung als „bald“ (Zeit zum Termin vereinbaren). */
export const CHECKUP_SOON_DAYS = 42;

export type CheckupPhase =
  | 'done' // als erledigt eingetragen
  | 'upcoming' // Zeitraum beginnt später
  | 'soon' // beginnt in höchstens CHECKUP_SOON_DAYS Tagen
  | 'due' // Zeitraum läuft
  | 'past'; // Zeitraum vorbei, nichts eingetragen (neutral, kein Warnsignal)

export interface CheckupWindow {
  /** Erster Tag des Zeitraums. */
  start: DateString;
  /** Letzter Tag des Zeitraums (inklusiv). */
  end: DateString;
}

export interface CheckupStatus {
  checkup: Checkup;
  window: CheckupWindow;
  phase: CheckupPhase;
  record?: CheckupRecord;
  /** Tage bis zum Beginn (negativ, wenn schon begonnen). */
  daysUntilStart: number;
}

function offset(birthDate: DateString, unit: Checkup['window']['unit'], n: number): DateString {
  if (unit === 'month') return addMonths(birthDate, n);
  return addDays(birthDate, unit === 'week' ? n * 7 : n);
}

export function checkupWindow(c: Checkup, birthDate: DateString): CheckupWindow {
  const start = offset(birthDate, c.window.unit, c.window.from);
  const end = addDays(offset(birthDate, c.window.unit, c.window.to), -1);
  return { start, end };
}

export function checkupStatus(c: Checkup, birthDate: DateString, today: DateString, records: CheckupRecord[]): CheckupStatus {
  const window = checkupWindow(c, birthDate);
  const record = records.find((r) => r.checkupId === c.id);
  const daysUntilStart = daysBetween(today, window.start);
  let phase: CheckupPhase;
  if (record) phase = 'done';
  else if (today > window.end) phase = 'past';
  else if (today >= window.start) phase = 'due';
  else if (daysUntilStart <= CHECKUP_SOON_DAYS) phase = 'soon';
  else phase = 'upcoming';
  return { checkup: c, window, phase, record, daysUntilStart };
}

/** Alle Untersuchungen eines Kindes in zeitlicher Reihenfolge. */
export function checkupStatuses(checkups: Checkup[], birthDate: DateString, today: DateString, records: CheckupRecord[]): CheckupStatus[] {
  return checkups
    .map((c) => checkupStatus(c, birthDate, today, records))
    .sort((a, b) => a.window.start.localeCompare(b.window.start));
}

/** Die Untersuchung, um die man sich jetzt kümmern sollte: läuft gerade oder beginnt bald. */
export function currentCheckup(statuses: CheckupStatus[]): CheckupStatus | undefined {
  return statuses.find((s) => s.phase === 'due') ?? statuses.find((s) => s.phase === 'soon');
}

/** Die nächste noch nicht erledigte, deren Zeitraum nicht vorbei ist. */
export function nextCheckup(statuses: CheckupStatus[]): CheckupStatus | undefined {
  return statuses.find((s) => s.phase === 'due' || s.phase === 'soon' || s.phase === 'upcoming');
}

/** Letzte erledigte Untersuchung mit Datum (für „Seit der letzten U“). */
export function lastDoneCheckup(statuses: CheckupStatus[]): CheckupStatus | undefined {
  return statuses
    .filter((s) => s.record?.doneOn)
    .sort((a, b) => b.record!.doneOn!.localeCompare(a.record!.doneOn!))[0];
}
