/** Die wichtigsten Wege durch die App, so wie Eltern sie nutzen. */
import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { startWithChild, tab } from './helpers';

test('Begrüßung, erstes Kind und Startseite', async ({ page }) => {
  await startWithChild(page);
  await expect(page.getByText('Mia', { exact: false }).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: '5 Monate' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Idee für heute' })).toBeVisible();
  // Die laufende U-Untersuchung wird angekündigt
  await expect(page.getByText('U5 steht an')).toBeVisible();
});

test('Idee als gemacht eintragen: heute ohne Datumsfeld, erscheint im Verlauf', async ({ page }) => {
  await startWithChild(page);
  await page.getByRole('link', { name: 'Idee für heute' }).click();
  const title = (await page.getByRole('heading', { level: 1 }).textContent())!.trim();
  await page.getByRole('button', { name: 'Haben wir gemacht' }).first().click();

  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Heute, 22. Oktober')).toBeVisible();
  await expect(dialog.locator('input[type=date]')).toBeHidden();
  await dialog.getByText('Begeistert').click();
  await dialog.getByRole('button', { name: 'Speichern' }).click();
  await expect(page.getByText('Im Verlauf gespeichert')).toBeVisible();

  await tab(page, 'Verlauf');
  await expect(page.getByText(title)).toBeVisible();
});

test('Datum beim Eintragen nachträglich ändern', async ({ page }) => {
  await startWithChild(page);
  await page.getByRole('link', { name: 'Idee für heute' }).click();
  await page.getByRole('button', { name: 'Haben wir gemacht' }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Datum ändern' }).click();
  await dialog.locator('input[type=date]').fill('2026-10-20');
  await dialog.getByRole('button', { name: 'Speichern' }).click();
  await tab(page, 'Verlauf');
  await expect(page.getByText(/20\. Okt/).first()).toBeVisible();
});

test('Meilenstein abhaken und im Verlauf ein- und ausblenden', async ({ page }) => {
  await startWithChild(page);
  await tab(page, 'Entwicklung');
  const step = page.getByLabel('Dreht sich vom Bauch auf den Rücken');
  await step.check();
  await expect(step).toBeChecked();

  await tab(page, 'Verlauf');
  await expect(page.getByText('Dreht sich vom Bauch auf den Rücken')).toBeVisible();
  await page.getByText(/Meilensteine zeigen/).click();
  await expect(page.getByText('Dreht sich vom Bauch auf den Rücken')).toBeHidden();
});

test('U-Untersuchung mit einem Tipp abhaken, Datum später eintragen', async ({ page }) => {
  await startWithChild(page);
  await page.goto('./#/vorsorge');
  const u5 = page.locator('#u-u5');
  await u5.getByRole('button', { name: 'Erledigt', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('#u-u5').getByText('Erledigt', { exact: true }).first()).toBeVisible();

  await page.locator('#u-u5').getByRole('button', { name: 'Datum eintragen' }).click();
  await page.getByRole('dialog').getByLabel('Am (optional)').fill('2026-10-21');
  await page.getByRole('dialog').getByRole('button', { name: 'Speichern' }).click();
  await expect(page.locator('#u-u5').getByText('Erledigt am 21. Oktober 2026')).toBeVisible();
});

test('Eigene Idee anlegen und in den Ideen finden', async ({ page }) => {
  await startWithChild(page);
  await tab(page, 'Ideen');
  await page.getByRole('link', { name: 'Eigene Idee anlegen' }).click();
  await page.getByLabel('Name der Idee').fill('Kissenburg bauen');
  await page.getByLabel(/So geht/).fill('Kissen holen\nBurg bauen');
  await page.getByRole('button', { name: 'Speichern' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Kissenburg bauen');
  await expect(page.getByText('Burg bauen', { exact: true })).toBeVisible();

  await tab(page, 'Ideen');
  await page.getByText(/Nur eigene Ideen/).click();
  await expect(page.getByRole('link', { name: 'Kissenburg bauen' })).toBeVisible();
});

test('Sicherung herunterladen und wieder einspielen', async ({ page }, info) => {
  await startWithChild(page);
  await page.goto('./#/sicherung');
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Sicherung herunterladen' }).click()]);
  const file = info.outputPath('sicherung.json');
  await download.saveAs(file);
  const backup = JSON.parse(await readFile(file, 'utf8'));
  expect(backup.format).toBe('kleine-schritte-backup');
  expect(backup.children).toHaveLength(1);
  expect(backup.children[0].name).toBe('Mia');

  // Zweites Kind anlegen, dann die Sicherung zurückspielen: danach gibt es wieder nur Mia.
  await page.goto('./#/kinder/neu');
  await page.getByLabel('Name oder Spitzname').fill('Ben');
  await page.getByLabel('Geburtsdatum').fill('2024-01-10');
  await page.getByRole('button', { name: 'Speichern' }).click();
  await page.goto('./#/kinder');
  await expect(page.getByText('Ben')).toBeVisible();

  await page.goto('./#/sicherung');
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.getByRole('button', { name: 'Sicherung einspielen' }).click()]);
  await chooser.setFiles(file);
  await page.getByRole('dialog').getByRole('button', { name: 'Sicherung einspielen' }).click();
  await expect(page.getByText('Sicherung eingespielt')).toBeVisible();
  await page.goto('./#/kinder');
  await expect(page.getByText('Mia')).toBeVisible();
  await expect(page.getByText('Ben')).toHaveCount(0);
});

test('Daten bleiben nach dem Neuladen erhalten', async ({ page }) => {
  await startWithChild(page);
  await page.reload();
  await expect(page.getByRole('heading', { name: '5 Monate' })).toBeVisible();
});

test('Übersicht für den Arzttermin zeigt Kind und nächste U', async ({ page }) => {
  await startWithChild(page);
  await page.goto('./#/arzt');
  await expect(page.getByRole('heading', { name: 'Mia' })).toBeVisible();
  await expect(page.getByText(/U5/).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /Drucken|PDF/ })).toBeVisible();
});
