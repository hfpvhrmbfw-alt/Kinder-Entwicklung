/** Nach dem ersten Besuch läuft die App ohne Netz, und schmale Bildschirme scrollen nicht seitlich. */
import { expect, test } from '@playwright/test';
import { startWithChild, tab } from './helpers';

test.describe('offline', () => {
  test.use({ serviceWorkers: 'allow' });

  test('App startet nach dem ersten Besuch auch ohne Netz', async ({ page, context }) => {
    await startWithChild(page);
    // Warten, bis der Service Worker alles vorab gespeichert hat; er übernimmt die Seite ab dem nächsten Laden.
    await page.evaluate(async () => void (await navigator.serviceWorker.ready));
    await page.reload();
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
    await context.setOffline(true);
    await page.reload();
    await expect(page.getByRole('heading', { name: '5 Monate' })).toBeVisible();
    await tab(page, 'Ideen');
    await expect(page.getByRole('heading', { level: 1, name: 'Ideen' })).toBeVisible();
  });
});

test.describe('schmaler Bildschirm', () => {
  test.use({ viewport: { width: 320, height: 640 } });

  test('keine Seite ist breiter als der Bildschirm', async ({ page }) => {
    await startWithChild(page);
    const wide: string[] = [];
    for (const path of ['', 'entwicklung', 'ideen', 'ideen/a-baby-massage', 'verlauf', 'rueckblick', 'vorsorge', 'arzt', 'mehr', 'sicherung', 'datenschutz']) {
      await page.goto(`./#/${path}`);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (overflow > 0) wide.push(`${path || 'heute'} (+${overflow}px)`);
    }
    expect(wide).toEqual([]);
  });
});
