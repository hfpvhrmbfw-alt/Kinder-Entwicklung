/**
 * Erzeugt die öffentliche Webseite unter site/, die über GitHub Pages veröffentlicht wird.
 * Kleine Schritte gibt es nur als iPhone-App. Die Web-App dient allein der Entwicklung und wird nicht veröffentlicht.
 * Online bleibt nur, was der App Store braucht:
 *   site/index.html        kurze Startseite
 *   site/datenschutz.html  Datenschutzerklärung (Datenschutz-URL in App Store Connect)
 *   site/sw.js             räumt den Service Worker der früher veröffentlichten Web-App ab
 *
 * Die Texte kommen aus src/i18n/locales/de.json („privacy“) mit den iPhone-Texten aus
 * ios/KleineSchritte/KleineSchritte/Resources/ios-de.json, also genau so, wie sie in der iPhone-App stehen.
 *
 * Aufruf: npm run privacy:page  (ein Test prüft, dass die Dateien aktuell sind)
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(import.meta.dirname, '..');
export const SECTIONS = ['s1', 's2', 's3', 's4', 's5', 's6', 's7'];
export const SITE_DIR = join(root, 'site');

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/** Legt die iPhone-Texte über die gemeinsamen Texte (wie Strings in KleineSchritteCore). */
export function mergeTexts(base, overrides) {
  const out = { ...base };
  for (const [k, v] of Object.entries(overrides)) {
    out[k] = v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object' ? mergeTexts(base[k], v) : v;
  }
  return out;
}

const page = (title, body) => `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="no-referrer">
<title>${esc(title)}</title>
<style>
body{margin:0;background:#EADFCC;color:#1E1A16;font:16px/1.6 system-ui,sans-serif;padding:48px 20px}
main{max-width:620px;margin:0 auto}h1{font:700 34px/1.1 Georgia,serif;margin:0 0 16px}h2{font:600 21px/1.25 Georgia,serif;margin:32px 0 8px}
.intro{background:#D6DEE6;border-radius:16px;padding:14px 18px}a{color:#A9461C}small{color:#5C5247}
@media (prefers-color-scheme:dark){body{background:#1C1B1A;color:#EFE6D6}.intro{background:#25303B}a{color:#FF9A70}small{color:#B6AB9B}}
</style></head><body><main>
${body}
</main></body></html>
`;

export function renderPrivacyPage(de) {
  const p = de.privacy;
  const sections = SECTIONS.map((s) => {
    const link = p[`${s}link`] ? `\n<p><a href="${esc(p[`${s}link`])}" rel="noopener noreferrer">${esc(p[`${s}link`].replace(/^https:\/\//, ''))}</a></p>` : '';
    return `<h2>${esc(p[`${s}h`])}</h2>\n<p>${esc(p[`${s}p`])}</p>${link}`;
  }).join('\n');
  return page(`${p.title} · ${de.app.name}`, `<h1>${esc(p.title)}</h1>
<p class="intro">${esc(p.intro)}</p>
${sections}
<p><small>${esc(p.updated)} · <a href="./">${esc(de.app.name)}</a></small></p>`);
}

export function renderIndexPage(de) {
  return page(de.app.name, `<h1>${esc(de.app.name)}</h1>
<p class="intro">Ideen für Spiel und Alltag, passend zu Alter und Entwicklung deines Kindes. Kleine Schritte gibt es als App für das iPhone.</p>
<p>${esc(de.more.aboutText)}</p>
<p><a href="datenschutz.html">${esc(de.privacy.title)}</a></p>`);
}

/**
 * Wer die frühere Web-App geöffnet hat, hat noch ihren Service Worker. Der Browser lädt beim nächsten Besuch
 * diese Datei als Update, sie löscht die Caches, meldet sich ab und lädt offene Seiten neu.
 */
export const SERVICE_WORKER_CLEANUP = `// Die Web-App wird nicht mehr veröffentlicht. Dieser Service Worker räumt den alten ab.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) await caches.delete(key);
    await self.registration.unregister();
    for (const client of await self.clients.matchAll({ type: 'window' })) client.navigate(client.url);
  })());
});
`;

export function loadTexts() {
  const de = JSON.parse(readFileSync(join(root, 'src', 'i18n', 'locales', 'de.json'), 'utf8'));
  const ios = JSON.parse(readFileSync(join(root, 'ios', 'KleineSchritte', 'KleineSchritte', 'Resources', 'ios-de.json'), 'utf8'));
  return mergeTexts(de, ios);
}

export function siteFiles(texts = loadTexts()) {
  return {
    'index.html': renderIndexPage(texts),
    'datenschutz.html': renderPrivacyPage(texts),
    'sw.js': SERVICE_WORKER_CLEANUP,
  };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  mkdirSync(SITE_DIR, { recursive: true });
  for (const [name, content] of Object.entries(siteFiles())) {
    writeFileSync(join(SITE_DIR, name), content);
    console.log(`geschrieben: site/${name}`);
  }
}
