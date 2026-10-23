import { expect, type Page } from '@playwright/test';

/** Fester „heute“-Tag, damit Altersangaben und Zeiträume stabil bleiben. */
export const TODAY = '2026-10-22';

/** Geburtsdatum für ein Kind von gut fünf Monaten (U5 fällig). */
export const BIRTH = '2026-05-15';

/** Startet die App mit fester Uhrzeit und legt über die Begrüßung ein erstes Kind an. */
export async function startWithChild(page: Page, name = 'Mia', birthDate = BIRTH): Promise<void> {
  await page.clock.setFixedTime(new Date(`${TODAY}T10:00:00+02:00`));
  await page.goto('./');
  await page.getByRole('button', { name: "Los geht's" }).click();
  await page.getByLabel('Name oder Spitzname').fill(name);
  await page.getByLabel('Geburtsdatum').fill(birthDate);
  await page.getByRole('button', { name: 'Speichern' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Guten/);
}

/** Wechselt über die Tab-Leiste unten. */
export async function tab(page: Page, name: 'Heute' | 'Entwicklung' | 'Ideen' | 'Verlauf' | 'Mehr'): Promise<void> {
  await page.getByRole('navigation', { name: 'Hauptnavigation' }).getByRole('link', { name, exact: true }).click();
}
