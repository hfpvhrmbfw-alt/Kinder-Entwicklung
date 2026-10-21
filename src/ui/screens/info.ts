/** „Mehr“: Einstellungen, Datensicherung, Quellen, Hinweise. */
import { BackupError, createBackup, parseBackup } from '../../core/backup';
import { localize } from '../../core/text';
import { getLocale, t } from '../../i18n';
import type { AppContext } from '../app';
import { confirmDialog, pageTitle, segmented } from '../components/common';
import { formatDate } from '../format';
import { h } from '../lib/h';
import { referenceLabel } from './activity';

export const APP_VERSION = __APP_VERSION__;
/** Ältere Versionen liegen unter <basis>/v/<version>/; SITE_ROOT ist immer die Basis der aktuellen Version. */
export const SITE_ROOT = import.meta.env.BASE_URL.replace(/v\/[^/]+\/$/, '');
export const IS_ARCHIVED = SITE_ROOT !== import.meta.env.BASE_URL;

export function moreScreen(ctx: AppContext): HTMLElement {
  const link = (href: string, label: string) => h('a', { class: 'card card--link', href }, h('span', { class: 'card__title' }, label));
  return h(
    'section',
    null,
    h('h1', { class: 'page-title', tabIndex: -1 }, t('more.title')),
    ctx.children.length > 1 &&
      segmented(
        t('children.switch'),
        ctx.children.map((c) => ({ value: c.id, label: c.name })),
        ctx.activeChild?.id ?? '',
        async (id) => {
          await ctx.saveSettings({ activeChildId: id });
          await ctx.reload();
        },
      ),
    link('#/kinder', t('more.children')),
    link('#/einstellungen', t('more.settings')),
    link('#/sicherung', t('more.backup')),
    link('#/quellen', t('more.sources')),
    link('#/hinweise', t('more.legal')),
    h('h2', null, t('more.about')),
    h('p', { class: 'muted small' }, t('more.aboutText')),
    h('p', { class: 'muted small' }, `Version ${APP_VERSION} · `, h('a', { href: `${SITE_ROOT}versionen.html` }, t('more.versions'))),
  );
}

export function settingsScreen(ctx: AppContext): HTMLElement {
  return h(
    'section',
    null,
    pageTitle(t('settings.title'), '#/mehr'),
    segmented(
      t('settings.theme'),
      [
        { value: 'system', label: t('settings.themeSystem') },
        { value: 'light', label: t('settings.themeLight') },
        { value: 'dark', label: t('settings.themeDark') },
      ],
      ctx.settings.theme,
      (theme) => ctx.saveSettings({ theme }),
    ),
  );
}

export function backupScreen(ctx: AppContext): HTMLElement {
  const fileInput = h('input', { type: 'file', accept: 'application/json,.json', class: 'visually-hidden', tabIndex: -1 });
  const error = h('p', { class: 'notice notice--calm', role: 'alert', hidden: true });

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (!file) return;
    error.hidden = true;
    try {
      const backup = parseBackup(await file.text());
      const ok = await confirmDialog(
        t('backup.importConfirm', { date: formatDate(backup.exportedAt.slice(0, 10)), n: backup.children.length }),
        t('backup.import'),
      );
      if (!ok) return;
      const { format: _f, schemaVersion: _s, exportedAt: _e, appVersion: _a, ...data } = backup;
      await ctx.repo.replaceAll(data);
      ctx.toast(t('backup.imported'));
      await ctx.reload();
    } catch (e) {
      error.textContent = t(`backup.error.${e instanceof BackupError ? e.code : 'invalid'}`);
      error.hidden = false;
    }
  });

  const exportBackup = async () => {
    const backup = createBackup(await ctx.repo.exportData(), APP_VERSION);
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = h('a', { href: url, download: `kleine-schritte-sicherung-${ctx.today}.json` });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return h(
    'section',
    null,
    pageTitle(t('backup.title'), '#/mehr'),
    h('p', null, t('backup.intro')),
    h('button', { class: 'btn btn--primary btn--block', onclick: exportBackup }, t('backup.export')),
    h('h2', null, t('backup.import')),
    h('p', { class: 'muted small' }, t('backup.importWarning')),
    fileInput,
    h('button', { class: 'btn btn--block', onclick: () => fileInput.click() }, t('backup.import')),
    error,
  );
}

export function sourcesScreen(ctx: AppContext): HTMLElement {
  const loc = getLocale();
  return h(
    'section',
    null,
    pageTitle(t('sources.title'), '#/mehr'),
    h('p', null, t('sources.intro')),
    h(
      'ul',
      { class: 'plain' },
      ctx.content.references.map((r) =>
        h(
          'li',
          { class: 'card' },
          h('p', { class: 'card__title' }, referenceLabel(r)),
          h('p', { class: 'small', style: 'margin: 0' }, localize(r.summary, loc)),
          r.url && h('p', { class: 'small', style: 'margin: var(--space-2) 0 0' }, h('a', { href: r.url, rel: 'noopener noreferrer', target: '_blank' }, r.url)),
          !r.citationVerified && h('p', { class: 'muted small', style: 'margin: var(--space-2) 0 0' }, t('sources.unverified')),
        ),
      ),
    ),
    h('h2', null, t('sources.statusTitle')),
    h('p', { class: 'small' }, t('sources.statusText')),
  );
}

export function legalParagraphs(): HTMLElement[] {
  return ['p1', 'p2', 'p3', 'p4'].map((k) => h('p', null, t(`legal.${k}`)));
}

export function legalScreen(): HTMLElement {
  return h('section', null, pageTitle(t('legal.title'), '#/mehr'), legalParagraphs());
}
