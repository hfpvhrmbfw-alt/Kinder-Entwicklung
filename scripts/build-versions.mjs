/**
 * Baut alle Versionen aus versions.json nach dist/v/<version>/ und schreibt dist/versionen.html.
 * Läuft im Deployment NACH dem normalen Build (dist/ enthält dann schon die aktuelle Version).
 *
 * Aufruf: BASE_PATH=/<repo>/ node scripts/build-versions.mjs
 * Ältere Versionen werden aus ihrem Commit gebaut (git worktree), die aktuelle aus dem Arbeitsverzeichnis.
 */
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const base = process.env.BASE_PATH ?? '/';
const versions = JSON.parse(readFileSync(join(root, 'versions.json'), 'utf8'));
const current = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version;
const dist = join(root, 'dist');
if (!existsSync(join(dist, 'index.html'))) throw new Error('Erst die aktuelle Version bauen (npm run build).');

const run = (cmd, args, cwd, env = {}) => execFileSync(cmd, args, { cwd, stdio: 'inherit', env: { ...process.env, ...env } });

for (const v of versions) {
  const out = join(dist, 'v', v.version);
  const vbase = `${base}v/${v.version}/`;
  let dir = root;
  if (v.version !== current) {
    if (!v.commit) throw new Error(`Version ${v.version}: Commit fehlt in versions.json`);
    dir = join(tmpdir(), `ks-${v.version}`);
    rmSync(dir, { recursive: true, force: true });
    run('git', ['worktree', 'add', '--detach', dir, v.commit], root);
    run('npm', ['ci', '--no-audit', '--no-fund'], dir);
  }
  const outDir = v.version === current ? join(tmpdir(), `ks-current-${v.version}`) : join(dir, 'dist');
  run('npx', ['vite', 'build', '--outDir', outDir, '--emptyOutDir'], dir, { BASE_PATH: vbase });
  mkdirSync(out, { recursive: true });
  cpSync(outDir, out, { recursive: true });
  if (dir !== root) run('git', ['worktree', 'remove', '--force', dir], root);
  console.log(`Version ${v.version} → ${out}`);
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const rows = [...versions]
  .reverse()
  .map((v) => `<li><a href="v/${esc(v.version)}/">Version ${esc(v.version)}</a>${v.version === current ? ' <b>aktuell</b>' : ''}<br><small>${esc(v.date)} · ${esc(v.title)}</small></li>`)
  .join('\n');
writeFileSync(
  join(dist, 'versionen.html'),
  `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Versionen · Kleine Schritte</title>
<style>
body{margin:0;background:#EADFCC;color:#1E1A16;font:16px/1.55 system-ui,sans-serif;padding:48px 20px}
main{max-width:520px;margin:0 auto}h1{font:700 34px/1.1 Georgia,serif;margin:0 0 12px}
ul{list-style:none;padding:0}li{background:#EFE6D6;border:1px solid #B9AA91;border-radius:20px;padding:16px 20px;margin:0 0 12px}
a{color:#A9461C;font-weight:600}small{color:#5C5247}b{font-size:12px;border:1px solid #5E8F6E;background:#BFD6C3;border-radius:99px;padding:2px 8px;margin-left:6px}
@media (prefers-color-scheme:dark){body{background:#1C1B1A;color:#EFE6D6}li{background:#252321;border-color:#4E4943}a{color:#FF9A70}small{color:#B6AB9B}b{background:#3B5446;border-color:#8DBB9A}}
</style></head><body><main>
<h1>Versionen</h1>
<p>Jede Version bleibt hier nutzbar. Alle Versionen verwenden dieselben Daten auf diesem Gerät.</p>
<p><a href="./">Zur aktuellen Version</a></p>
<ul>
${rows}
</ul>
</main></body></html>
`,
);
console.log('versionen.html geschrieben');
