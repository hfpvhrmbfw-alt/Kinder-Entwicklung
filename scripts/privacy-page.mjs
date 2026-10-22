/**
 * Erzeugt public/datenschutz.html aus den Texten in src/i18n/locales/de.json („privacy“).
 * Die Seite ist ohne JavaScript lesbar und dient als öffentliche Datenschutz-URL (z. B. für den App Store).
 *
 * Aufruf: npm run privacy:page  (ein Test prüft, dass die Datei aktuell ist)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(import.meta.dirname, '..');
export const SECTIONS = ['s1', 's2', 's3', 's4', 's5', 's6', 's7'];

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function renderPrivacyPage(de) {
  const p = de.privacy;
  const sections = SECTIONS.map((s) => {
    const link = p[`${s}link`] ? `\n<p><a href="${esc(p[`${s}link`])}" rel="noopener noreferrer">${esc(p[`${s}link`].replace(/^https:\/\//, ''))}</a></p>` : '';
    return `<h2>${esc(p[`${s}h`])}</h2>\n<p>${esc(p[`${s}p`])}</p>${link}`;
  }).join('\n');
  return `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="no-referrer">
<title>${esc(p.title)} · ${esc(de.app.name)}</title>
<style>
body{margin:0;background:#EADFCC;color:#1E1A16;font:16px/1.6 system-ui,sans-serif;padding:48px 20px}
main{max-width:620px;margin:0 auto}h1{font:700 34px/1.1 Georgia,serif;margin:0 0 16px}h2{font:600 21px/1.25 Georgia,serif;margin:32px 0 8px}
.intro{background:#D6DEE6;border-radius:16px;padding:14px 18px}a{color:#A9461C}small{color:#5C5247}
@media (prefers-color-scheme:dark){body{background:#1C1B1A;color:#EFE6D6}.intro{background:#25303B}a{color:#FF9A70}small{color:#B6AB9B}}
</style></head><body><main>
<h1>${esc(p.title)}</h1>
<p class="intro">${esc(p.intro)}</p>
${sections}
<p><small>${esc(p.updated)} · <a href="./">${esc(de.app.name)} öffnen</a></small></p>
</main></body></html>
`;
}

export const PRIVACY_PAGE = join(root, 'public', 'datenschutz.html');

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const de = JSON.parse(readFileSync(join(root, 'src', 'i18n', 'locales', 'de.json'), 'utf8'));
  writeFileSync(PRIVACY_PAGE, renderPrivacyPage(de));
  console.log(`geschrieben: ${PRIVACY_PAGE}`);
}
