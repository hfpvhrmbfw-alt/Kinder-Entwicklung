/**
 * Startseite im Stil des Zyklus-Trackers: Begrüßung, Kinderkarte mit Abschnitt und Fortschritt,
 * Spielwoche, Ausblick-Kacheln, Tagesvorschlag und „Was passt heute?“.
 */
import { ageBandFor } from '../../core/age';
import { addDays, addMonths, daysBetween, parseDate } from '../../core/dates';
import type { LocationChoice } from '../../core/filter';
import { activeMilestones, upcomingMilestones } from '../../core/milestones';
import type { ActivityLog, Enjoyment } from '../../core/models/user';
import { dailySuggestion, recommend } from '../../core/recommend';
import { localize } from '../../core/text';
import { getLocale, t, tn } from '../../i18n';
import type { AppContext } from '../app';
import { art, CARD_ART, DAY_ICON, EMPTY_DAY, scene, stageFor } from '../art';
import { activityCard, segmented } from '../components/common';
import { formatDate, formatMonths, formatSpan } from '../format';
import { h, icon, ICONS, replaceChildren } from '../lib/h';

type TimeChoice = 'any' | '10' | '20' | '30' | '60';

// Auswahl bleibt erhalten, solange die App offen ist.
const state: { time: TimeChoice; location: LocationChoice; shown: boolean } = { time: '20', location: 'any', shown: false };

export function greeting(hour: number): string {
  if (hour < 5) return t('today.greetNight');
  if (hour < 11) return t('today.greetMorning');
  if (hour < 14) return t('today.greetNoon');
  if (hour < 18) return t('today.greetDay');
  if (hour < 23) return t('today.greetEvening');
  return t('today.greetNight');
}

const sep = () => h('span', { class: 'sep', 'aria-hidden': 'true' }, '·');

function head(ctx: AppContext): HTMLElement[] {
  return [
    h('h1', { class: 'page-title', tabIndex: -1 }, greeting(new Date().getHours())),
    h('p', { class: 'page-sub' }, formatDate(ctx.today, { weekday: 'long', day: 'numeric', month: 'long' })),
  ];
}

/** Restzeit bis zum nächsten Abschnitt in Tagen, Wochen oder Monaten. */
function formatRemaining(days: number): string {
  if (days < 14) return tn('age.days', Math.max(days, 1));
  if (days < 9 * 7) return tn('age.weeks', Math.round(days / 7));
  return tn('age.months', Math.round(days / 30.44));
}

function tile(label: string, value: string | number, sub: string, artKey: keyof typeof CARD_ART, href: string, size: '' | 'big' | 'sm' = ''): HTMLElement {
  return h(
    'a',
    { class: 'tile', href },
    h('span', { class: 'tile__label' }, label),
    h('span', { class: `tile__value${size ? ` tile__value--${size}` : ''}` }, String(value)),
    sub && h('span', { class: 'tile__sub' }, sub),
    h('span', { class: 'tile__art', 'aria-hidden': 'true' }, art(CARD_ART[artKey])),
  );
}

/** Woche Mo–So mit heute; Bild je Tag nach der besten Bewertung der gespielten Ideen. */
function week(ctx: AppContext, logs: ActivityLog[]): HTMLElement {
  const today = parseDate(ctx.today);
  const weekday = (new Date(Date.UTC(today.year, today.month - 1, today.day)).getUTCDay() + 6) % 7;
  const monday = addDays(ctx.today, -weekday);
  const rank: Record<Enjoyment, number> = { low: 1, medium: 2, high: 3 };
  const short = (date: string) => formatDate(date, { weekday: 'short' }).replace('.', '');

  return h(
    'div',
    { class: 'week' },
    Array.from({ length: 7 }, (_, i) => {
      const date = addDays(monday, i);
      const dayLogs = logs.filter((l) => l.date === date);
      const isToday = date === ctx.today;
      const future = date > ctx.today;
      const best = dayLogs.reduce<Enjoyment | undefined>((acc, l) => (l.enjoyment && (!acc || rank[l.enjoyment] > rank[acc]) ? l.enjoyment : acc), undefined);
      const pic = dayLogs.length ? DAY_ICON[best ?? 'done'] : future ? '<svg aria-hidden="true"></svg>' : EMPTY_DAY;
      const label = [
        formatDate(date, { weekday: 'long', day: 'numeric', month: 'long' }),
        isToday && t('today.weekToday'),
        !future && (dayLogs.length ? tn('today.weekPlayed', dayLogs.length) : t('today.weekNothing')),
      ]
        .filter(Boolean)
        .join(', ');
      return h(
        'a',
        { class: `wday${isToday ? ' wday--today' : ''}${future ? ' wday--future' : ''}`, href: '#/verlauf', 'aria-label': label },
        h('span', { class: 'wday__wl', 'aria-hidden': 'true' }, short(date)),
        h('span', { class: 'wday__wn', 'aria-hidden': 'true' }, String(parseDate(date).day)),
        art(pic),
        h('span', { class: 'wday__count', 'aria-hidden': 'true' }, dayLogs.length > 1 ? `×${dayLogs.length}` : ''),
      );
    }),
  );
}

export async function todayScreen(ctx: AppContext): Promise<HTMLElement> {
  const child = ctx.activeChild;
  if (!child) {
    return h(
      'section',
      null,
      head(ctx),
      h(
        'div',
        { class: 'card hero' },
        h(
          'div',
          { class: 'hero__text' },
          h('p', { class: 'hero__sub' }, t('app.name')),
          h('h2', null, t('today.heroWelcome')),
          h('a', { class: 'btn btn--primary', href: '#/kinder/neu' }, t('today.addChild'), icon(ICONS.arrow)),
        ),
        h('div', { class: 'hero__art' }, art(scene('none'))),
        h('div', { class: 'hero__foot' }, t('today.heroWelcomeText')),
      ),
    );
  }

  const loc = getLocale();
  const age = ctx.ageOf(child);
  const months = age.effectiveMonths;
  const [records, logs, favorites] = await Promise.all([
    ctx.repo.listMilestoneRecords(child.id),
    ctx.repo.listLogs(child.id),
    ctx.repo.listFavorites(),
  ]);
  const base = {
    activities: ctx.content.activities,
    milestones: ctx.content.milestones,
    ageMonths: months,
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
      h('div', { class: 'sechead' }, h('h2', null, t('today.resultsTitle'))),
      ranked.length ? ranked.map((r) => activityCard(ctx, r.activity, r.reasons)) : h('p', { class: 'muted' }, t('today.noResults')),
    );
  };

  // --- Kinderkarte: Alter, Abschnitt, Fortschritt bis zum nächsten Abschnitt ---
  const bands = [...ctx.content.ageBands].sort((a, b) => a.minMonths - b.minMonths);
  const band = ageBandFor(months, bands);
  const nextBand = band ? bands.find((b) => b.minMonths === band.maxMonths) : undefined;
  const shownAge = age.usesCorrected && age.corrected ? age.corrected : age.chronological;
  const ageStart = age.usesCorrected && child.dueDate ? child.dueDate : child.birthDate;
  let foot: HTMLElement[] = [];
  if (band) {
    const pct = Math.min(100, Math.max(0, ((months - band.minMonths) / (band.maxMonths - band.minMonths)) * 100));
    const remaining = daysBetween(ctx.today, addMonths(ageStart, band.maxMonths));
    foot = [
      h(
        'div',
        { class: 'progress', role: 'progressbar', 'aria-label': t('today.heroBand', { band: localize(band.label, loc) }), 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(Math.round(pct)) },
        h('i', { style: `width: ${pct.toFixed(1)}%` }),
      ),
      h('div', { class: 'progress-labels', 'aria-hidden': 'true' }, h('span', null, formatMonths(band.minMonths)), h('span', null, formatMonths(band.maxMonths))),
      h('p', null, nextBand && remaining > 0 ? t('today.heroNext', { time: formatRemaining(remaining), band: `„${localize(nextBand.label, loc)}“` }) : t('today.heroLast')),
    ];
  }

  const hero = h(
    'div',
    { class: 'card hero', 'aria-live': 'polite' },
    h(
      'div',
      { class: 'hero__text' },
      h('p', { class: 'hero__sub' }, child.name, sep(), t(`today.stage.${stageFor(months)}`)),
      h('h2', null, formatSpan(shownAge)),
      daily && h('a', { class: 'btn btn--primary', href: `#/ideen/${encodeURIComponent(daily.activity.id)}` }, t('today.toIdea'), icon(ICONS.arrow)),
    ),
    h('div', { class: 'hero__art' }, art(scene(stageFor(months)))),
    h('div', { class: 'hero__foot' }, band && h('p', { style: 'margin: 0 0 var(--space-3)' }, t('today.heroBand', { band: localize(band.label, loc) }), age.usesCorrected ? ` (${t('age.corrected', { age: '' }).trim()})` : ''), foot),
  );

  // --- Ausblick ---
  const active = activeMilestones(ctx.content.milestones, months, records);
  const soon = upcomingMilestones(ctx.content.milestones, months, 3)[0];
  const weekStart = addDays(ctx.today, -6);
  const thisWeek = logs.filter((l) => l.date >= weekStart && l.date <= ctx.today).length;

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
    head(ctx),
    hero,
    age.beforeDueDate && h('p', { class: 'notice' }, t('age.beforeDueDate')),

    h('div', { class: 'sechead' }, h('h2', null, t('today.weekTitle')), h('a', { class: 'more', href: '#/verlauf' }, t('today.weekAll'))),
    week(ctx, logs),

    h('div', { class: 'sechead' }, h('h2', null, t('today.outlookTitle'))),
    h(
      'div',
      { class: 'tiles' },
      tile(t('today.tileActive'), active.length, tn('today.tileActiveSub', active.length), 'leaf', '#/entwicklung', 'big'),
      soon
        ? tile(t('today.tileSoon'), localize(soon.title, loc), t('today.tileSoonSub', { age: formatMonths(soon.window.fromMonths) }), 'flower', `#/entwicklung?m=${encodeURIComponent(soon.id)}`, 'sm')
        : tile(t('today.tileSoon'), '–', t('today.tileSoonNone'), 'flower', '#/entwicklung'),
      tile(t('today.tileWeek'), thisWeek, tn('today.tileWeekSub', thisWeek), 'sun', '#/verlauf', 'big'),
      tile(t('today.tileFav'), favorites.length, tn('today.tileFavSub', favorites.length), 'heart', '#/ideen', 'big'),
    ),

    h('div', { class: 'sechead' }, h('h2', null, t('today.dailyTitle'))),
    daily ? activityCard(ctx, daily.activity, daily.reasons, true) : h('p', { class: 'muted' }, t('today.dailyEmpty')),

    h('div', { class: 'sechead' }, h('h2', null, t('today.whatFitsTitle'))),
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
    h('p', { class: 'notice notice--calm', style: 'margin-top: var(--space-7)' }, t('development.noDiagnosis')),
  );
  if (state.shown) showResults();
  return section;
}
