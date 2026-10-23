/**
 * Content-Validierung: JSON-Schema + fachliche Regeln.
 * Fehler lassen die CI scheitern, Warnungen werden nur ausgegeben.
 */
import Ajv2020 from 'ajv/dist/2020';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { checkContent } from '../src/core/contentRules';
import { normalizeActivity, normalizeMilestone } from '../src/core/normalize';
import type { ContentBundle } from '../src/core/models/content';
import schema from '../content/schema/content.schema.json';
import { makeActivity } from './helpers';

const root = fileURLToPath(new URL('../content', import.meta.url));
const read = (p: string) => JSON.parse(readFileSync(join(root, p), 'utf8'));
const dir = (d: string) => readdirSync(join(root, d)).filter((f) => f.endsWith('.json')).map((f) => `${d}/${f}`);

const ajv = new Ajv2020({ allErrors: true, strict: true });
ajv.addSchema(schema);
const validator = (def: string) => ajv.getSchema(`${schema.$id}#/$defs/${def}`)!;

const files: [string, string][] = [
  ['age-bands.json', 'ageBandFile'],
  ['domains.json', 'domainFile'],
  ['categories.json', 'categoryFile'],
  ['materials.json', 'materialFile'],
  ['references.json', 'referenceFile'],
  ['checkups.json', 'checkupFile'],
  ...dir('milestones').map((f): [string, string] => [f, 'milestoneFile']),
  ...dir('activities').map((f): [string, string] => [f, 'activityFile']),
];

describe('Content-Schema', () => {
  for (const [file, def] of files) {
    it(file, () => {
      const validate = validator(def);
      const ok = validate(read(file));
      expect(ok, JSON.stringify(validate.errors?.slice(0, 5), null, 2)).toBe(true);
    });
  }
});

describe('Fachliche Regeln', () => {
  const bundle: ContentBundle = {
    ageBands: read('age-bands.json'),
    domains: read('domains.json'),
    categories: read('categories.json'),
    materials: read('materials.json'),
    references: read('references.json'),
    milestones: dir('milestones').map(read).map(normalizeMilestone),
    activities: dir('activities').map(read).map(normalizeActivity),
    checkups: read('checkups.json'),
  };
  const issues = checkContent(bundle);

  it('keine Fehler', () => {
    const errors = issues.filter((i) => i.level === 'error');
    expect(errors, errors.map((e) => `${e.id}: ${e.message}`).join('\n')).toEqual([]);
  });

  it('Warnungen (nur Ausgabe)', () => {
    const warnings = issues.filter((i) => i.level === 'warning');
    if (warnings.length) console.info(`Content-Warnungen (${warnings.length}):\n` + warnings.map((w) => `  ${w.id}: ${w.message}`).join('\n'));
    console.info(`Content: ${bundle.milestones.length} Meilensteine, ${bundle.activities.length} Aktivitäten`);
  });
});

describe('Sicherheitsregeln für Luftballon und Schnur', () => {
  const base: ContentBundle = { ageBands: [], domains: [], categories: [], materials: [], references: [{ id: 'x', kind: 'theory', title: 'x', summary: { de: '' }, citationVerified: true }], milestones: [], activities: [], checkups: [] };
  const errorsFor = (a: ReturnType<typeof makeActivity>) => checkContent({ ...base, activities: [a] }).filter((i) => i.level === 'error').map((i) => i.message);

  it('Luftballon benutzt ohne Hinweis ist ein Fehler, als Malmotiv nicht', () => {
    expect(errorsFor(makeActivity({ id: 'a', variations: { easier: [{ de: 'Mit einem Luftballon üben.' }], harder: [] } }))).toHaveLength(1);
    expect(errorsFor(makeActivity({ id: 'a', steps: [{ de: 'Malt Kreise: Sonne, Luftballons.' }] }))).toHaveLength(0);
    expect(
      errorsFor(makeActivity({ id: 'a', steps: [{ de: 'Mit einem Luftballon üben.' }], safety: [{ kind: 'choking', text: { de: 'Luftballon nur unter Aufsicht.' } }] })),
    ).toHaveLength(0);
  });

  it('Schnur unter 3 Jahren braucht einen Schnur-Hinweis', () => {
    const a = makeActivity({ id: 'a', ageRange: { minMonths: 24, maxMonths: 48 }, steps: [{ de: 'Ein Seil am Kuscheltier befestigen.' }] });
    expect(errorsFor(a)).toHaveLength(1);
    expect(errorsFor({ ...a, safety: [{ kind: 'cord', text: { de: 'Seil danach wegräumen.' } }] })).toHaveLength(0);
    expect(errorsFor({ ...a, ageRange: { minMonths: 36, maxMonths: 60 } })).toHaveLength(0);
  });
});
