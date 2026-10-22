import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
// @ts-expect-error: reines JS-Skript ohne Typen
import { PRIVACY_PAGE, renderPrivacyPage, SECTIONS } from '../scripts/privacy-page.mjs';
import de from '../src/i18n/locales/de.json';

describe('Datenschutzerklärung als Webseite', () => {
  it('public/datenschutz.html ist aktuell (sonst: npm run privacy:page)', () => {
    expect(readFileSync(PRIVACY_PAGE, 'utf8')).toBe(renderPrivacyPage(de));
  });
  it('alle Abschnitte haben Überschrift und Text', () => {
    for (const s of SECTIONS as string[]) {
      expect((de.privacy as Record<string, string>)[`${s}h`]).toBeTruthy();
      expect((de.privacy as Record<string, string>)[`${s}p`]).toBeTruthy();
    }
  });
});
