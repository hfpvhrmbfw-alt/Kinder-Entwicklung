/**
 * Kalenderdatei (.ics, RFC 5545) für ganztägige Zeiträume mit Erinnerung.
 * Erinnerungen laufen über den Kalender des Geräts, ohne Push und ohne Server.
 */
import { addDays, parseDate } from './dates';
import type { DateString } from './models/user';

export interface IcsEvent {
  uid: string;
  title: string;
  description?: string;
  /** Erster Tag (inklusiv). */
  start: DateString;
  /** Letzter Tag (inklusiv). */
  end: DateString;
  /** Erinnerung so viele Tage vor Beginn. */
  alarmDaysBefore?: number;
}

const ymd = (date: DateString) => date.replace(/-/g, '');

/** Text nach RFC 5545 maskieren. */
export function escapeIcsText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** Zeilen auf 75 Oktette falten (Folgezeilen beginnen mit einem Leerzeichen). */
export function foldIcsLine(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let current = '';
  let size = 0;
  for (const ch of line) {
    const len = encoder.encode(ch).length;
    const limit = parts.length ? 74 : 75;
    if (size + len > limit) {
      parts.push(current);
      current = '';
      size = 0;
    }
    current += ch;
    size += len;
  }
  parts.push(current);
  return parts.join('\r\n ');
}

/** `now` als UTC-Zeitstempel im Format 20261022T163000Z. */
function stamp(now: Date): string {
  return now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

export function buildIcs(events: IcsEvent[], now: Date = new Date()): string {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Kleine Schritte//DE', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  for (const e of events) {
    parseDate(e.start);
    parseDate(e.end);
    lines.push(
      'BEGIN:VEVENT',
      `UID:${e.uid}`,
      `DTSTAMP:${stamp(now)}`,
      `DTSTART;VALUE=DATE:${ymd(e.start)}`,
      // DTEND ist bei ganztägigen Terminen exklusiv
      `DTEND;VALUE=DATE:${ymd(addDays(e.end, 1))}`,
      `SUMMARY:${escapeIcsText(e.title)}`,
      'TRANSP:TRANSPARENT',
    );
    if (e.description) lines.push(`DESCRIPTION:${escapeIcsText(e.description)}`);
    if (e.alarmDaysBefore !== undefined) {
      lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escapeIcsText(e.title)}`, `TRIGGER:-P${e.alarmDaysBefore}D`, 'END:VALARM');
    }
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(foldIcsLine).join('\r\n') + '\r\n';
}
