/** Barrierefreiheit: automatische Prüfung (axe, WCAG 2.1 AA) aller Seiten, hell und dunkel. */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { startWithChild } from './helpers';

const PAGES = [
  '', 'entwicklung', 'ideen', 'ideen/a-baby-massage', 'ideen/eigene/neu', 'verlauf', 'rueckblick', 'vorsorge', 'arzt',
  'mehr', 'kinder', 'kinder/neu', 'einstellungen', 'sicherung', 'quellen', 'hinweise', 'datenschutz',
];

async function audit(page: Page) {
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  return result.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.slice(0, 3).map((n) => n.target.join(' ')) }));
}

for (const scheme of ['light', 'dark'] as const) {
  test(`Alle Seiten ohne Verstöße (${scheme === 'light' ? 'hell' : 'dunkel'})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: 'reduce' });
    await startWithChild(page);
    const found: Record<string, unknown> = {};
    for (const path of PAGES) {
      await page.goto(`./#/${path}`);
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      const violations = await audit(page);
      if (violations.length) found[path || 'heute'] = violations;
    }
    expect(found).toEqual({});
  });
}

test('Begrüßung ohne Verstöße', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(await audit(page)).toEqual([]);
});

test('Dialog ohne Verstöße', async ({ page }) => {
  await startWithChild(page);
  await page.goto('./#/ideen/a-baby-massage');
  await page.getByRole('button', { name: 'Haben wir gemacht' }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await audit(page)).toEqual([]);
});
