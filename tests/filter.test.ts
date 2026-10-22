import { describe, expect, it } from 'vitest';
import { countActiveFilters, filterActivities, missingMaterials } from '../src/core/filter';
import { makeActivity } from './helpers';

const box = makeActivity({
  id: 'box-tunnel',
  title: { de: 'Karton-Tunnel' },
  ageRange: { minMonths: 9, maxMonths: 24 },
  domains: { primary: 'grossMotor', secondary: ['cognition'] },
  category: 'movement',
  durationMinutes: { min: 10, max: 20 },
  location: 'indoor',
  prepEffort: 'low',
  socialSettings: ['oneOnOne', 'siblings'],
  materials: [
    { materialId: 'cardboard-box', optional: false },
    { materialId: 'blanket', optional: true },
  ],
});
const walk = makeActivity({
  id: 'puddle-walk',
  title: { de: 'Pfützen-Spaziergang' },
  ageRange: { minMonths: 18, maxMonths: 72 },
  domains: { primary: 'grossMotor', secondary: [] },
  category: 'outing',
  durationMinutes: { min: 20, max: 60 },
  location: 'outdoor',
  socialSettings: ['group'],
});
const song = makeActivity({
  id: 'finger-song',
  title: { de: 'Fingerspiel „Zehn kleine Zappelmänner“' },
  ageRange: { minMonths: 12, maxMonths: 48 },
  domains: { primary: 'language', secondary: ['fineMotor'] },
  category: 'languageReading',
  durationMinutes: { min: 3, max: 10 },
  location: 'both',
});
const all = [box, walk, song];
const ids = (list: { id: string }[]) => list.map((a) => a.id);

describe('filterActivities', () => {
  it('schon gemachte lassen sich ausblenden', () => {
    expect(filterActivities([box, walk], { excludeIds: ['box-tunnel'] }).map((a) => a.id)).toEqual(['puddle-walk']);
    expect(countActiveFilters({ excludeIds: ['box-tunnel'] })).toBe(0);
  });

  it('ohne Filter: alles', () => {
    expect(ids(filterActivities(all, {}))).toEqual(['box-tunnel', 'puddle-walk', 'finger-song']);
  });

  it('Alter: Obergrenze exklusiv, Toleranz optional', () => {
    expect(ids(filterActivities(all, { ageMonths: 10 }))).toEqual(['box-tunnel']);
    expect(ids(filterActivities(all, { ageMonths: 24 }))).toEqual(['puddle-walk', 'finger-song']);
    expect(ids(filterActivities(all, { ageMonths: 10, ageToleranceMonths: 2 }))).toEqual(['box-tunnel', 'finger-song']);
  });

  it('Bereich zählt auch als Nebenbereich', () => {
    expect(ids(filterActivities(all, { domains: ['fineMotor'] }))).toEqual(['finger-song']);
    expect(ids(filterActivities(all, { domains: ['cognition'] }))).toEqual(['box-tunnel']);
  });

  it('Ort: "both" passt zu drinnen und draußen', () => {
    expect(ids(filterActivities(all, { location: 'indoor' }))).toEqual(['box-tunnel', 'finger-song']);
    expect(ids(filterActivities(all, { location: 'outdoor' }))).toEqual(['puddle-walk', 'finger-song']);
  });

  it('Dauer: Mindestdauer muss in die verfügbare Zeit passen', () => {
    expect(ids(filterActivities(all, { maxDurationMinutes: 10 }))).toEqual(['box-tunnel', 'finger-song']);
    expect(ids(filterActivities(all, { maxDurationMinutes: 5 }))).toEqual(['finger-song']);
  });

  it('Material: optionales Material ist nicht nötig', () => {
    expect(missingMaterials(box, ['blanket'])).toEqual(['cardboard-box']);
    expect(ids(filterActivities(all, { availableMaterialIds: ['cardboard-box'] }))).toEqual([
      'box-tunnel',
      'puddle-walk',
      'finger-song',
    ]);
    expect(ids(filterActivities(all, { availableMaterialIds: [] }))).toEqual(['puddle-walk', 'finger-song']);
    expect(ids(filterActivities(all, { usesMaterialIds: ['blanket'] }))).toEqual(['box-tunnel']);
  });

  it('Kategorie, Vorbereitung, Sozialform', () => {
    expect(ids(filterActivities(all, { categories: ['outing', 'movement'] }))).toEqual(['box-tunnel', 'puddle-walk']);
    expect(ids(filterActivities(all, { prepEfforts: ['none'] }))).toEqual(['puddle-walk', 'finger-song']);
    expect(ids(filterActivities(all, { socialSettings: ['siblings'] }))).toEqual(['box-tunnel']);
  });

  it('Suche ignoriert Groß-/Kleinschreibung und Umlaut-Akzente', () => {
    expect(ids(filterActivities(all, { query: 'pfutzen' }))).toEqual(['puddle-walk']); // tolerant bei Tippen ohne Umlaut
    expect(ids(filterActivities(all, { query: 'PFÜTZEN' }))).toEqual(['puddle-walk']);
    expect(ids(filterActivities(all, { query: 'karton tunnel' }))).toEqual(['box-tunnel']);
  });

  it('zählt aktive Filter', () => {
    expect(countActiveFilters({ ageMonths: 5, location: 'any' })).toBe(0);
    expect(countActiveFilters({ domains: ['language'], location: 'outdoor', maxDurationMinutes: 10 })).toBe(3);
  });
});
