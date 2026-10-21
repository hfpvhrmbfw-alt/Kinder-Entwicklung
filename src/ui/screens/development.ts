/** Entwicklungsübersicht: Meilensteine je Bereich als Zeitfenster, abhakbar mit Datum. */
import { ageBandFor } from '../../core/age';
import { milestonesForOverview, splitOverview, upcomingMilestones, type MilestoneStatus } from '../../core/milestones';
import { DOMAIN_IDS } from '../../core/models/content';
import type { MilestoneRecord } from '../../core/models/user';
import { localize } from '../../core/text';
import { getLocale, t } from '../../i18n';
import { newId } from '../../storage/repository';
import type { AppContext } from '../app';
import { emptyState, nextId } from '../components/common';
import { domainBadge, formatChildAge, formatWindow } from '../format';
import { h } from '../lib/h';
import { currentQuery } from '../lib/router';

export async function developmentScreen(ctx: AppContext): Promise<HTMLElement> {
  const child = ctx.activeChild;
  if (!child) return h('section', null, h('h1', { class: 'page-title', tabIndex: -1 }, t('development.title')), emptyState(t('today.noChild'), h('a', { class: 'btn btn--primary', href: '#/kinder/neu' }, t('today.addChild'))));

  const loc = getLocale();
  const age = ctx.ageOf(child);
  const months = age.effectiveMonths;
  const band = ageBandFor(months, ctx.content.ageBands) ?? { minMonths: 0, maxMonths: 3 };
  let records = await ctx.repo.listMilestoneRecords(child.id);
  const statuses = milestonesForOverview(ctx.content.milestones, band, months, records);
  const focusId = currentQuery().get('m');

  // Gemeinsame Skala für alle Zeitfenster-Balken auf dieser Seite
  const scaleMin = Math.max(0, Math.min(months, ...statuses.map((s) => s.milestone.window.fromMonths)));
  const scaleMax = Math.max(months + 1, ...statuses.map((s) => s.milestone.window.toMonths));
  const pct = (m: number) => `${(((m - scaleMin) / (scaleMax - scaleMin)) * 100).toFixed(1)}%`;

  const row = (s: MilestoneStatus): HTMLElement => {
    const m = s.milestone;
    const checkboxId = nextId('ms');
    const dateId = nextId('msd');
    const checkbox = h('input', { type: 'checkbox', id: checkboxId, checked: s.achieved });
    // Datum ist freiwillig: leer = „geschafft, Datum unbekannt“, kann jederzeit nachgetragen werden.
    let record: MilestoneRecord | undefined = s.record;
    const knownDate = (r?: MilestoneRecord) => (r && !r.dateUnknown ? r.achievedOn : '');
    const dateInput = h('input', { type: 'date', id: dateId, value: knownDate(record), max: ctx.today, style: 'max-width: 12rem' });
    const clearBtn = h('button', { type: 'button', class: 'btn btn--ghost small' }, t('development.dateClear'));
    const unknownHint = h('p', { class: 'muted small', style: 'margin: 0' }, t('development.dateUnknownHint'));
    const dateField = h(
      'div',
      { class: 'field', hidden: !s.achieved, style: 'margin: var(--space-2) 0 0' },
      h('label', { for: dateId, class: 'small' }, t('development.whenAchieved')),
      h('div', { class: 'row' }, dateInput, clearBtn),
      unknownHint,
    );
    const hint = h('p', { class: 'notice notice--calm', hidden: !s.showConsultHint, style: 'margin-top: var(--space-2)' }, t('development.consultHint'));
    const syncDateUi = () => {
      const has = !!knownDate(record);
      clearBtn.hidden = !has;
      unknownHint.hidden = has;
    };
    syncDateUi();

    const saveDate = async (value: string) => {
      if (!record) return;
      // Ohne Datum bleibt achievedOn als Tag des Eintrags gesetzt (für ältere App-Versionen).
      const { dateUnknown: _, ...rest } = record;
      record = value ? { ...rest, achievedOn: value } : { ...rest, achievedOn: ctx.today, dateUnknown: true };
      await ctx.repo.saveMilestoneRecord(record);
      syncDateUi();
    };

    checkbox.addEventListener('change', async () => {
      if (checkbox.checked) {
        const date = dateInput.value && dateInput.value <= ctx.today ? dateInput.value : '';
        record = date
          ? { id: newId(), childId: child.id, milestoneId: m.id, achievedOn: date }
          : { id: newId(), childId: child.id, milestoneId: m.id, achievedOn: ctx.today, dateUnknown: true };
        await ctx.repo.saveMilestoneRecord(record);
        dateField.hidden = false;
        hint.hidden = true;
        syncDateUi();
      } else if (record) {
        const removed = record;
        await ctx.repo.deleteMilestoneRecord(removed.id);
        record = undefined;
        dateInput.value = '';
        dateField.hidden = true;
        hint.hidden = !s.showConsultHint;
        ctx.toast(t('common.deleted'), {
          label: t('common.undo'),
          run: async () => {
            await ctx.repo.saveMilestoneRecord(removed);
            await ctx.reload();
          },
        });
      }
      records = await ctx.repo.listMilestoneRecords(child.id);
    });
    dateInput.addEventListener('change', async () => {
      if (!dateInput.value) await saveDate('');
      else if (dateInput.value <= ctx.today) await saveDate(dateInput.value);
    });
    clearBtn.addEventListener('click', async () => {
      dateInput.value = '';
      await saveDate('');
      dateInput.focus();
    });

    const activities = ctx.content.activities.filter((a) => a.relatedMilestoneIds.includes(m.id));
    return h(
      'li',
      { class: 'card', id: `m-${m.id}` },
      h(
        'div',
        { class: 'milestone' },
        checkbox,
        h(
          'div',
          null,
          h('label', { for: checkboxId, style: 'font-weight: var(--font-weight-medium); cursor: pointer' }, localize(m.title, loc)),
          h('p', { class: 'muted small', style: 'margin: 0' }, t('development.window', { range: formatWindow(m.window.fromMonths, m.window.toMonths) })),
          h(
            'div',
            { class: 'window-bar', 'aria-hidden': 'true' },
            h('div', { class: 'window-bar__range', style: `left: ${pct(m.window.fromMonths)}; width: calc(${pct(m.window.toMonths)} - ${pct(m.window.fromMonths)})` }),
            h('div', { class: 'window-bar__now', style: `left: ${pct(Math.min(months, scaleMax))}` }),
          ),
          dateField,
          hint,
          h(
            'details',
            { open: focusId === m.id },
            h('summary', { class: 'small', style: 'cursor: pointer; min-height: var(--tap-target-min); display: flex; align-items: center' }, t('development.supportTips')),
            h('p', { class: 'small' }, localize(m.description, loc)),
            h('ul', { class: 'small' }, m.supportTips.map((tip) => h('li', null, localize(tip, loc)))),
            h('p', { class: 'small' }, h('strong', null, `${t('development.why')}: `), localize(m.rationale, loc)),
            activities.length > 0 &&
              h('p', { class: 'small' }, h('strong', null, `${t('development.ideas')}: `), activities.map((a, i) => [i > 0 && ', ', h('a', { href: `#/ideen/${a.id}` }, localize(a.title, loc))])),
          ),
        ),
      ),
    );
  };

  const upcoming = upcomingMilestones(ctx.content.milestones, months, 3);

  const section = h(
    'section',
    null,
    h('h1', { class: 'page-title', tabIndex: -1 }, t('development.title')),
    h('p', null, `${child.name}: ${formatChildAge(age)}`),
    age.usesCorrected && h('p', { class: 'notice' }, t('age.correctedHint')),
    h('p', { class: 'muted small' }, t('development.intro')),
    DOMAIN_IDS.map((d) => {
      const { current, earlier } = splitOverview(statuses.filter((s) => s.milestone.domain === d), band);
      const earlierOpen = earlier.some((s) => s.milestone.id === focusId);
      return h(
        'section',
        null,
        h('h2', { class: 'row' }, domainBadge(d)),
        current.length ? h('ul', { class: 'plain' }, current.map(row)) : h('p', { class: 'muted small' }, t('development.empty')),
        earlier.length > 0 &&
          h(
            'details',
            { class: 'disclosure', open: earlierOpen },
            h('summary', null, t('development.earlier', { n: earlier.length })),
            h('ul', { class: 'plain disclosure__body' }, earlier.map(row)),
          ),
      );
    }),
    upcoming.length > 0 &&
      h(
        'section',
        null,
        h('h2', null, t('development.upcoming')),
        h('ul', null, upcoming.map((m) => h('li', null, `${localize(m.title, loc)} (${t('development.window', { range: formatWindow(m.window.fromMonths, m.window.toMonths) })})`))),
      ),
    h('p', { class: 'muted small', style: 'margin-top: var(--space-5)' }, t('development.noDiagnosis')),
  );
  if (focusId) queueMicrotask(() => document.getElementById(`m-${focusId}`)?.scrollIntoView({ block: 'center' }));
  return section;
}
