import { describe, expect, it } from 'vitest';
import { ageBandFor, ageSpan, childAge, inRange } from '../src/core/age';
import { addMonths, isValidDate } from '../src/core/dates';
import cases from './fixtures/age-cases.json';
import type { AgeBand } from '../src/core/models/content';

describe('ageSpan (gemeinsame Fixtures)', () => {
  for (const c of cases.ageSpan) {
    it(`${c.birth} → ${c.on}`, () => {
      expect(ageSpan(c.birth, c.on)).toEqual({ months: c.months, days: c.days, totalDays: c.totalDays });
    });
  }

  it('wirft bei Stichtag vor Geburt', () => {
    expect(() => ageSpan('2025-05-01', '2025-04-30')).toThrow();
  });
});

describe('childAge (gemeinsame Fixtures)', () => {
  for (const c of cases.childAge) {
    it(c.name, () => {
      const age = childAge(c.child, c.on);
      expect(age.chronological.months).toBe(c.chronologicalMonths);
      expect(age.usesCorrected).toBe(c.usesCorrected);
      expect(Math.floor(age.effectiveMonths)).toBe(c.effectiveMonthsFloor);
      if ('correctedMonths' in c) expect(age.corrected?.months).toBe(c.correctedMonths);
      if ('weeksPremature' in c) expect(age.weeksPremature).toBe(c.weeksPremature);
      expect(age.beforeDueDate).toBe('beforeDueDate' in c ? c.beforeDueDate : false);
    });
  }

  it('ignoriert einen Termin, der nicht nach der Geburt liegt', () => {
    const age = childAge({ birthDate: '2025-05-10', dueDate: '2025-05-01', useCorrectedAge: true }, '2025-08-10');
    expect(age.corrected).toBeUndefined();
    expect(age.usesCorrected).toBe(false);
  });
});

describe('Hilfsfunktionen', () => {
  it('addMonths kürzt auf Monatsletzten', () => {
    expect(addMonths('2025-01-31', 1)).toBe('2025-02-28');
    expect(addMonths('2024-01-31', 1)).toBe('2024-02-29');
    expect(addMonths('2025-11-15', 3)).toBe('2026-02-15');
  });

  it('isValidDate erkennt ungültige Daten', () => {
    expect(isValidDate('2025-02-29')).toBe(false);
    expect(isValidDate('2024-02-29')).toBe(true);
    expect(isValidDate('15.03.2025')).toBe(false);
  });

  const bands: AgeBand[] = [
    { id: 'm00-03', minMonths: 0, maxMonths: 3, label: { de: '0–3 Monate' } },
    { id: 'm03-06', minMonths: 3, maxMonths: 6, label: { de: '3–6 Monate' } },
  ];

  it('ageBandFor: Obergrenze exklusiv, über dem letzten Band das letzte', () => {
    expect(ageBandFor(2.99, bands)?.id).toBe('m00-03');
    expect(ageBandFor(3, bands)?.id).toBe('m03-06');
    expect(ageBandFor(9, bands)?.id).toBe('m03-06');
  });

  it('inRange mit Toleranz', () => {
    expect(inRange(7, { minMonths: 9, maxMonths: 12 })).toBe(false);
    expect(inRange(7, { minMonths: 9, maxMonths: 12 }, 2)).toBe(true);
  });
});
