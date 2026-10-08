/** Startseite: Tagesvorschlag und „Was passt heute?“. */
import type { LocationChoice } from '../../core/filter';
import { dailySuggestion, recommend } from '../../core/recommend';
import { t } from '../../i18n';
import type { AppContext } from '../app';
import { activityCard, emptyState, segmented } from '../components/common';
import { formatChildAge } from '../format';
import { h, replaceChildren } from '../lib/h';

type TimeChoice = 'any' | '10' | '20' | '30' | '60';

// Auswahl bleibt erhalten, solange die App offen ist.
const state: { time: TimeChoice; location: LocationChoice; shown: boolean } = { time: '20', location: 'any', shown: false };

export async function todayScreen(ctx: AppContext): Promise<HTMLElement> {
  const child = ctx.activeChild;
  if (!child) {
    return h('section', null, h('h1', { class: 'page-title', tabIndex: -1 }, t('today.title')), emptyState(t('today.noChild'), h('a', { class: 'btn btn--primary', href: '#/kinder/neu' }, t('today.addChild'))));
  }

  const age = ctx.ageOf(child);
  const [records, logs, favorites] = await Promise.all([
    ctx.repo.listMilestoneRecords(child.id),
    ctx.repo.listLogs(child.id),
    ctx.repo.listFavorites(),
  ]);
  const base = {
    activities: ctx.content.activities,
    milestones: ctx.content.milestones,
    ageMonths: age.effectiveMonths,
    today: ctx.today,
    milestoneRecords: records,
    logs,
    favoriteIds: favorites.map((f) => f.activityRef.id),
  };

  const daily = dailySuggestion({ ...base, childId: child.id });
  const results = h('div', { 'aria-live': 'polite' });

  const showResults = () => {
    state.shown = true;
    const ranked = recommend({
      ...base,
      seed: `${ctx.today}:${child.id}:${state.time}:${state.location}`,
      availableMinutes: state.time === 'any' ? undefined : Number(state.time),
      location: state.location,
      limit: 5,
    });
    replaceChildren(
      results,
      h('h2', null, t('today.resultsTitle')),
      ranked.length ? ranked.map((r) => activityCard(ctx, r.activity, r.reasons)) : h('p', { class: 'muted' }, t('today.noResults')),
    );
  };

  const timeOptions: { value: TimeChoice; label: string }[] = [
    { value: '10', label: '10' },
    { value: '20', label: '20' },
    { value: '30', label: '30' },
    { value: '60', label: '60' },
    { value: 'any', label: t('today.timeAny') },
  ];

  const section = h(
    'section',
    null,
    h('h1', { class: 'page-title', tabIndex: -1 }, t('today.title')),
    h('p', null, t('today.hello', { name: child.name, age: formatChildAge(age) })),
    age.beforeDueDate && h('p', { class: 'notice' }, t('age.beforeDueDate')),
    h('h2', null, t('today.dailyTitle')),
    daily ? activityCard(ctx, daily.activity, daily.reasons, true) : h('p', { class: 'muted' }, t('today.dailyEmpty')),
    h('h2', null, t('today.whatFitsTitle')),
    h(
      'div',
      { class: 'card' },
      segmented(`${t('today.time')} (${t('common.minutes', { n: '' }).trim()})`, timeOptions, state.time, (v) => {
        state.time = v;
        if (state.shown) showResults();
      }),
      segmented(
        t('today.where'),
        [
          { value: 'indoor', label: t('location.indoor') },
          { value: 'outdoor', label: t('location.outdoor') },
          { value: 'any', label: t('location.any') },
        ],
        state.location,
        (v) => {
          state.location = v;
          if (state.shown) showResults();
        },
      ),
      h('button', { class: 'btn btn--primary btn--block', onclick: showResults }, t('today.show')),
    ),
    results,
  );
  if (state.shown) showResults();
  return section;
}
