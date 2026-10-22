/**
 * Entwicklungsübersicht: Meilensteine je Bereich als Zeitfenster, abhakbar mit Datum.
 * Standardansicht „Offen“: Abgehakte verschwinden aus der Liste und stehen unter „Geschafft“.
 */
import { ageBandFor } from '../../core/age';
import { milestoneStatus, milestonesForOverview, milestonesForView, splitOverview, upcomingMilestones, type MilestoneStatus, type MilestoneView } from '../../core/milestones';
import { DOMAIN_IDS } from '../../core/models/content';
import type { MilestoneRecord } from '../../core/models/user';
import { localize } from '../../core/text';
import { getLocale, t, tn } from '../../i18n';
import { newId } from '../../storage/repository';
import type { AppContext } from '../app';
import { emptyState, nextId, segmented } from '../components/common';
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
  const focusId = currentQuery().get('m');
  let view: MilestoneView = ctx.settings.milestoneView ?? 'open';
  // Ein verlinkter Schritt (z. B. von der Heute-Seite) soll sichtbar sein, auch wenn er schon abgehakt ist.
  const focus = focusId ? ctx.milestoneById(focusId) : undefined;
  if (focus && view === 'open') {
    const s = milestoneStatus(focus, months, records);
    if (s.achieved || s.longPast) view = 'all';
  }
  const statuses = milestonesForView(ctx.content.milestones, band, months, records, view);

  // Zähler für die Umschaltung; ändern sich beim Abhaken ohne Neuaufbau der Seite.
  const counts = {
    open: milestonesForView(ctx.content.milestones, band, months, records, 'open').length,
    achieved: records.filter((r) => ctx.milestoneById(r.milestoneId)).length,
  };
  const viewLabel = (v: MilestoneView) => (v === 'all' ? t('development.viewAll') : t(`development.view_${v}`, { n: counts[v] }));
  const viewSwitch = segmented(
    t('development.viewLegend'),
    (['open', 'achieved', 'all'] as const).map((v) => ({ value: v, label: viewLabel(v) })),
    view,
    async (v) => {
      await ctx.saveSettings({ milestoneView: v });
      await ctx.reload();
    },
  );
  const refreshCounts = (delta: 1 | -1) => {
    counts.achieved += delta;
    counts.open -= delta;
    viewSwitch.querySelectorAll('label').forEach((label) => {
      const input = label.querySelector('input');
      if (input && label.lastChild) label.lastChild.textContent = viewLabel(input.value as MilestoneView);
    });
  };

  /** Karte sanft ausblenden; leere Liste bekommt einen Hinweis. */
  const leave = (li: HTMLElement) => {
    li.classList.add('card--leaving');
    window.setTimeout(() => {
      const list = li.parentElement;
      li.remove();
      if (list && !list.children.length) {
        const empty = h('p', { class: 'muted small' }, view === 'open' ? t('development.allDone') : t('development.emptyAchieved'));
        if (list.closest('details')) list.closest('details')!.replaceWith(empty);
        else list.replaceWith(empty);
      }
    }, 450);
  };

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
      const li = checkbox.closest('li') as HTMLElement;
      if (checkbox.checked) {
        const date = dateInput.value && dateInput.value <= ctx.today ? dateInput.value : '';
        record = date
          ? { id: newId(), childId: child.id, milestoneId: m.id, achievedOn: date }
          : { id: newId(), childId: child.id, milestoneId: m.id, achievedOn: ctx.today, dateUnknown: true };
        await ctx.repo.saveMilestoneRecord(record);
        refreshCounts(1);
        if (view === 'open') {
          const saved = record;
          leave(li);
          ctx.toast(t('development.hiddenDone', { name: child.name }), {
            label: t('common.undo'),
            run: async () => {
              await ctx.repo.deleteMilestoneRecord(saved.id);
              await ctx.reload();
            },
          });
        } else {
          dateField.hidden = false;
          hint.hidden = true;
          syncDateUi();
        }
      } else if (record) {
        const removed = record;
        await ctx.repo.deleteMilestoneRecord(removed.id);
        refreshCounts(-1);
        if (view === 'achieved') leave(li);
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
            m.background && h('p', { class: 'small' }, h('strong', null, `${t('pedagogy.title')}: `), localize(m.background, loc)),
            m.variety && h('p', { class: 'small' }, h('strong', null, `${t('pedagogy.variety')}: `), localize(m.variety, loc)),
            !!m.observe?.length &&
              h('div', { class: 'small' }, h('strong', null, `${t('pedagogy.observe')}:`), h('ul', null, m.observe.map((o) => h('li', null, localize(o, loc))))),
            activities.length > 0 &&
              h('p', { class: 'small' }, h('strong', null, `${t('development.ideas')}: `), activities.map((a, i) => [i > 0 && ', ', h('a', { href: `#/ideen/${a.id}` }, localize(a.title, loc))])),
          ),
        ),
      ),
    );
  };

  const upcoming = upcomingMilestones(ctx.content.milestones, months, 3);
  const overviewAll = milestonesForOverview(ctx.content.milestones, band, months, records);
  const longPastCount = overviewAll.filter((s) => s.longPast).length;

  const section = h(
    'section',
    null,
    h('h1', { class: 'page-title', tabIndex: -1 }, t('development.title')),
    h('p', null, `${child.name}: ${formatChildAge(age)}`),
    age.usesCorrected && h('p', { class: 'notice' }, t('age.correctedHint')),
    h('p', { class: 'muted small' }, t('development.intro')),
    viewSwitch,
    view === 'achieved' && statuses.length === 0 && emptyState(t('development.emptyAchieved')),
    view === 'open' && longPastCount > 0 && h('p', { class: 'muted small' }, tn('development.longPastHidden', longPastCount)),
    DOMAIN_IDS.map((d) => {
      const inDomain = statuses.filter((s) => s.milestone.domain === d);
      if (view === 'achieved') {
        return inDomain.length > 0 && h('section', null, h('h2', { class: 'row' }, domainBadge(d)), h('ul', { class: 'plain' }, inDomain.map(row)));
      }
      const { current, earlier } = splitOverview(inDomain, band);
      const earlierOpen = earlier.some((s) => s.milestone.id === focusId);
      const doneHere = view === 'open' ? overviewAll.filter((s) => s.milestone.domain === d && s.achieved).length : 0;
      return h(
        'section',
        null,
        h('h2', { class: 'row' }, domainBadge(d)),
        current.length
          ? h('ul', { class: 'plain' }, current.map(row))
          : h('p', { class: 'muted small' }, doneHere ? t('development.allDone') : t('development.empty')),
        earlier.length > 0 &&
          h(
            'details',
            { class: 'disclosure', open: earlierOpen },
            h('summary', null, t('development.earlier', { n: earlier.length })),
            h('ul', { class: 'plain disclosure__body' }, earlier.map(row)),
          ),
        doneHere > 0 && h('p', { class: 'muted small' }, tn('development.doneInDomain', doneHere)),
      );
    }),
    view !== 'achieved' &&
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
