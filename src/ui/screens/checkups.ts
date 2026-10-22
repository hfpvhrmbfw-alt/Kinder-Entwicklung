/** U-Untersuchungen U1–U9: Zeiträume für das aktive Kind, abhaken, in den Kalender übernehmen. */
import { checkupStatuses, type CheckupStatus } from '../../core/checkups';
import { buildIcs } from '../../core/ics';
import type { CheckupRecord } from '../../core/models/user';
import { localize } from '../../core/text';
import { getLocale, t } from '../../i18n';
import { newId } from '../../storage/repository';
import type { AppContext } from '../app';
import { confirmDialog, emptyState, nextId, openDialog, pageTitle } from '../components/common';
import { downloadFile, formatDate, formatDateRange } from '../format';
import { h, icon, ICONS } from '../lib/h';

/** Vorlauf der Kalender-Erinnerung: genug Zeit, um einen Termin zu bekommen. */
const CALENDAR_ALARM_DAYS = 21;

export async function checkupsScreen(ctx: AppContext): Promise<HTMLElement> {
  const child = ctx.activeChild;
  if (!child) return h('section', null, pageTitle(t('checkups.title'), '#/mehr'), emptyState(t('today.noChild'), h('a', { class: 'btn btn--primary', href: '#/kinder/neu' }, t('today.addChild'))));
  const loc = getLocale();
  const records = await ctx.repo.listCheckupRecords(child.id);
  const statuses = checkupStatuses(ctx.content.checkups, child.birthDate, ctx.today, records);
  const past = statuses.filter((s) => s.phase === 'past');
  const open = statuses.filter((s) => s.phase === 'due' || s.phase === 'soon' || s.phase === 'upcoming');

  const markDone = async (s: CheckupStatus) => {
    const id = nextId('u');
    const date = h('input', { type: 'date', id, max: ctx.today, min: child.birthDate, value: s.phase === 'due' ? ctx.today : '' });
    const body = h('div', { class: 'field' }, h('label', { for: id }, t('checkups.dateLabel')), date, h('span', { class: 'hint' }, t('checkups.dateHint')));
    const result = await openDialog<CheckupRecord>(t('checkups.dialogTitle', { name: s.checkup.name }), body, () => {
      if (date.value && date.value > ctx.today) {
        date.focus();
        return undefined;
      }
      return { id: newId(), childId: child.id, checkupId: s.checkup.id, ...(date.value ? { doneOn: date.value } : {}) };
    });
    if (!result) return;
    await ctx.repo.saveCheckupRecords([result]);
    await ctx.reload();
  };

  const undo = async (record: CheckupRecord) => {
    await ctx.repo.deleteCheckupRecord(record.id);
    ctx.toast(t('common.deleted'), { label: t('common.undo'), run: async () => (await ctx.repo.saveCheckupRecords([record]), await ctx.reload()) });
    await ctx.reload();
  };

  const markPast = async () => {
    if (!(await confirmDialog(t('checkups.markPastConfirm', { n: past.length }), t('common.save')))) return;
    await ctx.repo.saveCheckupRecords(past.map((s) => ({ id: newId(), childId: child.id, checkupId: s.checkup.id })));
    await ctx.reload();
  };

  const exportCalendar = () => {
    const events = open.map((s) => ({
      uid: `${child.id}-${s.checkup.id}@kleine-schritte`,
      title: t('checkups.calendarTitle', { name: child.name, checkup: s.checkup.name }),
      description: t('checkups.calendarText', { checkup: s.checkup.name, period: localize(s.checkup.period, loc) }),
      start: s.window.start,
      end: s.window.end,
      alarmDaysBefore: CALENDAR_ALARM_DAYS,
    }));
    downloadFile(buildIcs(events), `u-untersuchungen-${child.name.replace(/[^\p{L}\p{N}]+/gu, '-').toLowerCase()}.ics`, 'text/calendar');
  };

  const card = (s: CheckupStatus) => {
    const c = s.checkup;
    const done = s.record;
    return h(
      'li',
      { class: `card checkup checkup--${s.phase}${s.phase === 'due' ? ' card--highlight' : ''}`, id: `u-${c.id}` },
      h(
        'div',
        { class: 'checkup__head' },
        h('span', { class: 'checkup__name' }, c.name),
        h(
          'div',
          null,
          h('p', { class: 'card__title', style: 'margin: 0' }, localize(c.period, loc)),
          h('p', { class: 'card__meta', style: 'margin: 0' }, formatDateRange(s.window.start, s.window.end)),
        ),
        h('span', { class: 'badge checkup__phase' }, t(`checkups.phase.${s.phase}`)),
      ),
      done && h('p', { class: 'small', style: 'margin: var(--space-3) 0 0' }, done.doneOn ? t('checkups.doneOn', { date: formatDate(done.doneOn) }) : t('checkups.doneNoDate')),
      s.phase === 'past' && h('p', { class: 'muted small', style: 'margin: var(--space-3) 0 0' }, t('checkups.pastHint')),
      h(
        'details',
        { style: 'margin-top: var(--space-2)', open: s.phase === 'due' || s.phase === 'soon' },
        h('summary', { class: 'small', style: 'cursor: pointer; min-height: var(--tap-target-min); display: flex; align-items: center' }, t('checkups.focus')),
        h('p', { class: 'small' }, localize(c.focus, loc)),
        h('p', { class: 'small', style: 'margin-bottom: var(--space-1)' }, h('strong', null, t('checkups.prepare'))),
        h('ul', { class: 'small' }, c.prepare.map((p) => h('li', null, localize(p, loc)))),
        c.review.status !== 'reviewed' && h('p', { class: 'muted small' }, t('activity.reviewNeedsCheck')),
      ),
      h(
        'div',
        { class: 'row', style: 'margin-top: var(--space-2)' },
        done
          ? h('button', { class: 'btn btn--ghost small', onclick: () => undo(done) }, t('checkups.undo'))
          : s.phase !== 'upcoming' && h('button', { class: `btn small${s.phase === 'due' ? ' btn--primary' : ''}`, onclick: () => markDone(s) }, icon(ICONS.check), t('checkups.markDone')),
      ),
    );
  };

  return h(
    'section',
    null,
    pageTitle(t('checkups.title'), '#/entwicklung'),
    h('p', null, t('checkups.intro', { name: child.name })),
    h('p', { class: 'muted small' }, t('checkups.tolerance')),
    open.length > 0
      ? h(
          'div',
          { class: 'card', style: 'margin-bottom: var(--space-5)' },
          h('button', { class: 'btn btn--block', onclick: exportCalendar }, icon(ICONS.calendar), t('checkups.calendar')),
          h('p', { class: 'muted small', style: 'margin: var(--space-3) 0 0' }, t('checkups.calendarHint')),
        )
      : h('p', { class: 'notice notice--calm' }, t('checkups.calendarNone')),
    past.length > 1 && h('button', { class: 'btn btn--ghost btn--block', style: 'margin-bottom: var(--space-4)', onclick: markPast }, t('checkups.markPastDone', { n: past.length })),
    h('ul', { class: 'plain' }, statuses.map(card)),
    h('p', { class: 'muted small', style: 'margin-top: var(--space-5)' }, t('checkups.source')),
    h('p', { class: 'muted small' }, h('a', { href: '#/arzt' }, t('development.toDoctor'))),
  );
}
