/**
 * Pages CMS: .pages.yml passt zum Content, deckt alle Felder ab, und so gespeicherte Dateien bleiben gültig.
 */
import Ajv2020 from 'ajv/dist/2020';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
// @ts-expect-error: reines JS-Skript ohne Typen
import { buildPagesConfig, pagesConfig } from '../scripts/pages-config.mjs';
import schema from '../content/schema/content.schema.json';

const root = fileURLToPath(new URL('..', import.meta.url));
const contentDir = join(root, 'content');
const entries = (sub: string) =>
  readdirSync(join(contentDir, sub))
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(contentDir, sub, f), 'utf8')) as Record<string, unknown>);

interface Field {
  name: string;
  fields?: Field[];
}

/** Alle Feldpfade einer Datei, Listen ohne Index (z. B. "steps.de"). */
function keyPaths(value: unknown, prefix = ''): string[] {
  if (Array.isArray(value)) return value.flatMap((v) => keyPaths(v, prefix));
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([k, v]) => {
      const p = prefix ? `${prefix}.${k}` : k;
      return [p, ...keyPaths(v, p)];
    });
  }
  return [];
}
function fieldPaths(fields: Field[], prefix = ''): Set<string> {
  const out = new Set<string>();
  for (const f of fields) {
    const p = prefix ? `${prefix}.${f.name}` : f.name;
    out.add(p);
    if (f.fields) for (const sub of fieldPaths(f.fields, p)) out.add(sub);
  }
  return out;
}

/** Wie Pages CMS beim Speichern: leere Texte, leere Listen und leere Objekte fallen weg. */
function sanitize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitize).filter((v) => v !== '' && v != null);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      const s = sanitize(v);
      if (s === '' || s == null) continue;
      if (Array.isArray(s) && s.length === 0) continue;
      if (typeof s === 'object' && !Array.isArray(s) && Object.keys(s as object).length === 0) continue;
      out[k] = s;
    }
    return out;
  }
  return value;
}

const ajv = new Ajv2020({ allErrors: true, strict: true });
ajv.addSchema(schema);

describe('Pages CMS', () => {
  it('.pages.yml ist aktuell (sonst: npm run cms:config)', () => {
    expect(readFileSync(join(root, '.pages.yml'), 'utf8')).toBe(buildPagesConfig(contentDir));
  });

  const collections = pagesConfig(contentDir).content as { name: string; path: string; fields: Field[] }[];
  for (const [sub, def] of [
    ['activities', 'activityFile'],
    ['milestones', 'milestoneFile'],
  ] as const) {
    const fields = fieldPaths(collections.find((c) => c.path === `content/${sub}`)!.fields);
    const files = entries(sub);

    it(`${sub}: jedes Feld ist im CMS bearbeitbar`, () => {
      const missing = new Set(files.flatMap((e) => keyPaths(e)).filter((p) => p !== 'origin' && !fields.has(p)));
      expect([...missing]).toEqual([]);
    });

    it(`${sub}: vom CMS gespeicherte Dateien bleiben gültig`, () => {
      const validate = ajv.getSchema(`${schema.$id}#/$defs/${def}`)!;
      const invalid = files.filter((e) => !validate(sanitize(e))).map((e) => `${e.id}: ${JSON.stringify(validate.errors?.[0])}`);
      expect(invalid).toEqual([]);
    });
  }
});
