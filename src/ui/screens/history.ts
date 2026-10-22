/** Verlauf: erledigte Aktivitäten und erreichte Meilensteine als Zeitleiste; Meilensteine lassen sich ausblenden. */
import type { ActivityLog, MilestoneRecord } from '../../core/models/user';
import { localize } from '../../core/text';
import { getLocale, t } from '../../i18n';
import type { AppContext } from '../app';
import { confirmDialog, emptyState } from '../components/common';
import { formatDate } from '../format';
import { h, icon, ICONS } from '../lib/h';

type Entry = { kind: 'log'; date: string; log: ActivityLog } | { kind: 'milestone'; date: string; record: MilestoneRecord };

export async function historyScreen(ctx: AppContext): Promise<HTMLElement> {
  const child = ctx.activeChild;
  const loc = getLocale();
  const logs = await ctx.repo.listLogs(child?.id);
  const allRecords = child ? await ctx.repo.listMilestoneRecords(child.id) : [];
  const showMilestones = !ctx.settings.historyHideMilestones;
  const records = showMilestones ? allRecords : [];
  const entries: Entry[] = [
    ...logs.map((log): Entry => ({ kind: 'log', date: log.date, log })),
    ...records.filter((r) => !r.dateUnknown).map((record): Entry => ({ kind: 'milestone', date: record.achievedOn, record })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  // Ohne Datum abgehakte Meilensteine stehen gesammelt am Ende.
  const undated = records.filter((r) => r.dateUnknown);

  const milestoneToggle =
    allRecords.length > 0 &&
    h(
      'div',
      { class: 'chip-group' },
      h(
        'label',
        { class: 'chip' },
        h('input', {
          type: 'checkbox',
          checked: showMilestones,
          onchange: async (e: Event) => {
            await ctx.saveSettings({ historyHideMilestones: !(e.target as HTMLInputElement).checked });
            await ctx.reload();
          },
        }),
        t('history.showMilestones', { n: allRecords.length }),
      ),
    );

  const reviewLink = child && h('a', { class: 'btn btn--block', href: '#/rueckblick', style: 'margin-bottom: var(--space-4)' }, t('history.toReview'));
  if (!entries.length && !undated.length) {
    return h('section', null, h('h1', { class: 'page-title', tabIndex: -1 }, t('history.title')), milestoneToggle, emptyState(allRecords.length ? t('history.emptyLogs') : t('history.empty')));
  }

  // Nach Monat gruppieren
  const groups = new Map<string, Entry[]>();
  for (const e of entries) {
    const key = e.date.slice(0, 7);
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }

  const names = new Map(ctx.children.map((c) => [c.id, c.name]));

  const logCard = (log: ActivityLog) => {
    const a = ctx.activityById(log.activityRef.id);
    const card = h(
      'li',
      { class: 'card' },
      h('p', { class: 'card__title' }, a ? h('a', { href: `#/ideen/${a.id}` }, localize(a.title, loc)) : t('history.unknownActivity')),
      h(
        'p',
        { class: 'card__meta', style: 'margin: 0' },
        [formatDate(log.date), log.enjoyment && t(`enjoyment.${log.enjoyment}`), log.durationMinutes && t('common.minutes', { n: log.durationMinutes }), ctx.children.length > 1 && log.childIds.map((id) => names.get(id)).filter(Boolean).join(', ')]
          .filter(Boolean)
          .join(' · '),
      ),
      log.note && h('p', { style: 'margin: var(--space-2) 0 0; white-space: pre-wrap' }, log.note),
      h(
        'button',
        {
          class: 'btn btn--ghost btn--danger small',
          onclick: async () => {
            if (!(await confirmDialog(t('history.deleteConfirm'), t('common.delete')))) return;
            await ctx.repo.deleteLog(log.id);
            card.remove();
            ctx.toast(t('common.deleted'), { label: t('common.undo'), run: async () => (await ctx.repo.saveLog(log), await ctx.reload()) });
          },
        },
        t('common.delete'),
      ),
    );
    return card;
  };

  const milestoneCard = (r: MilestoneRecord) => {
    const m = ctx.milestoneById(r.milestoneId);
    // Schmale Zeile statt Karte, damit die gespielten Ideen im Vordergrund bleiben.
    return h(
      'li',
      { class: 'histmilestone' },
      h('span', { class: 'histmilestone__icon', 'aria-hidden': 'true' }, icon(ICONS.check)),
      h('span', { class: 'histmilestone__title' }, h('span', { class: 'visually-hidden' }, `${t('history.milestoneLabel')}: `), m ? localize(m.title, loc) : r.milestoneId),
      !r.dateUnknown && h('span', { class: 'histmilestone__date' }, formatDate(r.achievedOn, { day: 'numeric', month: 'short' })),
    );
  };

  return h(
    'section',
    null,
    h('h1', { class: 'page-title', tabIndex: -1 }, t('history.title')),
    reviewLink,
    milestoneToggle,
    [...groups].map(([month, list]) =>
      h(
        'section',
        null,
        h('h2', null, formatDate(`${month}-01`, { month: 'long', year: 'numeric' })),
        h('ul', { class: 'plain' }, list.map((e) => (e.kind === 'log' ? logCard(e.log) : milestoneCard(e.record)))),
      ),
    ),
    undated.length > 0 && h('section', null, h('h2', null, t('history.noDate')), h('ul', { class: 'plain' }, undated.map(milestoneCard))),
  );
}
