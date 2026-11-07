import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error: reines JS-Skript ohne Typen
import { loadTexts, SECTIONS, SITE_DIR, siteFiles } from '../scripts/privacy-page.mjs';

describe('Öffentliche Seite für den App Store (site/)', () => {
  const files = siteFiles() as Record<string, string>;

  it('site/ ist aktuell (sonst: npm run privacy:page)', () => {
    for (const [name, content] of Object.entries(files)) {
      expect(existsSync(join(SITE_DIR, name)), name).toBe(true);
      expect(readFileSync(join(SITE_DIR, name), 'utf8'), name).toBe(content);
    }
  });

  it('alle Abschnitte der Datenschutzerklärung haben Überschrift und Text', () => {
    const privacy = loadTexts().privacy as Record<string, string>;
    for (const s of SECTIONS as string[]) {
      expect(privacy[`${s}h`]).toBeTruthy();
      expect(privacy[`${s}p`]).toBeTruthy();
    }
  });

  it('die Datenschutzerklärung beschreibt die iPhone-App, nicht die Web-App', () => {
    const page = files['datenschutz.html'];
    expect(page).toContain('App Store');
    expect(page).not.toMatch(/Browser|GitHub Pages|Website-Daten/);
  });
});
