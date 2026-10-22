import { describe, expect, it } from 'vitest';
import { buildIcs, escapeIcsText, foldIcsLine } from '../src/core/ics';

describe('Kalenderdatei', () => {
  const ics = buildIcs(
    [{ uid: 'c1-u5@kleine-schritte', title: 'Mia: U5', description: 'Zeitraum; gelbes Heft, Impfpass\nmitnehmen', start: '2026-07-31', end: '2026-08-30', alarmDaysBefore: 21 }],
    new Date('2026-10-22T16:30:00.123Z'),
  );

  it('ganztägig, Ende exklusiv, mit Erinnerung', () => {
    expect(ics).toContain('DTSTART;VALUE=DATE:20260731\r\n');
    expect(ics).toContain('DTEND;VALUE=DATE:20260831\r\n');
    expect(ics).toContain('TRIGGER:-P21D\r\n');
    expect(ics).toContain('DTSTAMP:20261022T163000Z\r\n');
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
  });

  it('maskiert Sonderzeichen', () => {
    expect(escapeIcsText('a;b,c\\d\ne')).toBe('a\\;b\\,c\\\\d\\ne');
  });

  it('faltet lange Zeilen nach 75 Oktetten, ohne Umlaute zu zerteilen', () => {
    const line = `DESCRIPTION:${'ä'.repeat(80)}`;
    const folded = foldIcsLine(line);
    const enc = new TextEncoder();
    for (const part of folded.split('\r\n')) expect(enc.encode(part).length).toBeLessThanOrEqual(75);
    expect(folded.split('\r\n').map((p, i) => (i ? p.slice(1) : p)).join('')).toBe(line);
  });

  it('lehnt ungültige Daten ab', () => {
    expect(() => buildIcs([{ uid: 'x', title: 'x', start: '31.07.2026', end: '2026-08-01' }])).toThrow();
  });
});
