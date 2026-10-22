import { describe, expect, it } from 'vitest';
import { buildCustomActivity, linesToList, listToLines, validateCustomActivity, type CustomActivityInput } from '../src/core/customActivity';
import { filterActivities } from '../src/core/filter';

const input: CustomActivityInput = {
  title: '  Kissenburg bauen ',
  summary: '',
  minMonths: 24,
  maxMonths: 72,
  domain: 'grossMotor',
  category: 'play',
  location: 'indoor',
  minutes: 20,
  materials: 'Sofakissen\n\n- Decke',
  steps: '1. Kissen holen\n2) Burg bauen\n• reinkrabbeln',
  tips: '',
};

describe('Eigene Ideen', () => {
  it('Zeilen werden zu Listen, Aufzählungszeichen fallen weg', () => {
    expect(linesToList(input.steps).map((l) => l.de)).toEqual(['Kissen holen', 'Burg bauen', 'reinkrabbeln']);
    expect(listToLines(linesToList(input.materials))).toBe('Sofakissen\nDecke');
  });

  it('prüft Name, Alter und Dauer', () => {
    expect(validateCustomActivity(input)).toBeUndefined();
    expect(validateCustomActivity({ ...input, title: ' ' })).toBe('title');
    expect(validateCustomActivity({ ...input, minMonths: 72, maxMonths: 24 })).toBe('age');
    expect(validateCustomActivity({ ...input, maxMonths: 120 })).toBe('age');
    expect(validateCustomActivity({ ...input, minutes: 0 })).toBe('minutes');
    expect(validateCustomActivity({ ...input, minutes: 2.5 })).toBe('minutes');
  });

  it('baut eine vollständige Aktivität, die Filter und Suche verstehen', () => {
    const a = buildCustomActivity(input, 'custom-1');
    expect(a).toMatchObject({ id: 'custom-1', origin: 'custom', title: { de: 'Kissenburg bauen' }, durationMinutes: { min: 20, max: 20 }, ageRange: { minMonths: 24, maxMonths: 72 } });
    expect(a.materialsText?.map((m) => m.de)).toEqual(['Sofakissen', 'Decke']);
    expect(a.guidanceTips).toEqual([]);
    expect(filterActivities([a], { ageMonths: 30, query: 'kissen' }).map((x) => x.id)).toEqual(['custom-1']);
    expect(filterActivities([a], { ageMonths: 12 })).toEqual([]);
  });

  it('Bearbeiten behält ID und Erstellungsfelder, leeres Material verschwindet', () => {
    const a = buildCustomActivity(input, 'custom-1');
    const b = buildCustomActivity({ ...input, materials: '', domain: 'cognition' }, 'neu', { ...a, domains: { primary: 'grossMotor', secondary: ['cognition', 'language'] } });
    expect(b.id).toBe('custom-1');
    expect(b.materialsText).toBeUndefined();
    expect(b.domains).toEqual({ primary: 'cognition', secondary: ['language'] });
  });
});
