/** Rückblick „Das hat sich getan“: geschaffte Schritte, Lieblingsideen, Erinnerungen. */
import { buildReview, memories, periodStart, REVIEW_PERIODS, type ReviewPeriod } from '../../core/review';
import { localize } from '../../core/text';
import { getLocale, t, tn } from '../../i18n';
import type { AppContext } from '../app';
import { art, CARD_ART } from '../art';
import { emptyState, pageTitle, segmented } from '../components/common';
import { domainBadge, formatDate } from '../format';
import { h, replaceChildren } from '../lib/h';

// Gewählter Zeitraum bleibt, solange die App offen ist.
let period: ReviewPeriod = '6m';

export async function reviewScreen(ctx: AppContext): Promise<HTMLElement> {
  const child = ctx.activeChild;
  if (!child) return h('section', null, pageTitle(t('review.title'), '#/verlauf'), emptyState(t('today.noChild'), h('a', { class: 'btn btn--primary', href: '#/kinder/neu' }, t('today.addChild'))));
  const loc = getLocale();
  const [records, logs] = await Promise.all([ctx.repo.listMilestoneRecords(child.id), ctx.repo.listLogs(child.id)]);
  const activities = ctx.allActivities();
  const activityTitle = (id: string) => {
    const a = ctx.activityById(id);
    return a ? localize(a.title, loc) : t('history.unknownActivity');
  };
  const activityLink = (id: string) => (ctx.activityById(id) ? h('a', { href: `#/ideen/${encodeURIComponent(id)}` }, activityTitle(id)) : activityTitle(id));

  const content = h('div', { 'aria-live': 'polite' });
  const render = () => {
    const r = buildReview({ milestones: ctx.content.milestones, activities, records, logs, from: periodStart(period, ctx.today), to: ctx.today });
    const undated = period === 'all' ? records.filter((x) => x.dateUnknown && ctx.milestoneById(x.milestoneId)).length : 0;
    if (!r.milestones.length && !r.played) {
      replaceChildren(content, emptyState(t('review.empty')), undated > 0 && h('p', { class: 'muted small' }, tn('review.undated', undated)));
      return;
    }
    const tile = (label: string, value: number, sub: string, artKey: keyof typeof CARD_ART) =>
      h(
        'div',
        { class: 'tile' },
        h('span', { class: 'tile__label' }, label),
        h('span', { class: 'tile__value tile__value--big' }, String(value)),
        h('span', { class: 'tile__sub' }, sub),
        h('span', { class: 'tile__art', 'aria-hidden': 'true' }, art(CARD_ART[artKey])),
      );
    replaceChildren(
      content,
      h(
        'div',
        { class: 'tiles' },
        tile(t('review.tileMilestones'), r.milestones.length, tn('review.tileMilestonesSub', r.milestones.length), 'flower'),
        tile(t('review.tilePlayed'), r.played, `${tn('review.tilePlayedSub', r.played)}, ${tn('review.tileIdeasSub', r.distinctIdeas)}`, 'sun'),
      ),
      r.milestones.length > 0 &&
        h(
          'section',
          null,
          h('h2', null, t('review.milestonesTitle')),
          h(
            'ul',
            { class: 'plain' },
            r.milestones.map((m) =>
              h(
                'li',
                { class: 'card card--highlight' },
                h('p', { class: 'card__title' }, localize(m.milestone.title, loc)),
                h('div', { class: 'row' }, domainBadge(m.milestone.domain), h('span', { class: 'small' }, formatDate(m.date))),
              ),
            ),
          ),
          undated > 0 && h('p', { class: 'muted small' }, tn('review.undated', undated)),
        ),
      r.favorites.length > 0 &&
        h(
          'section',
          null,
          h('h2', null, t('review.favoritesTitle')),
          h(
            'ul',
            { class: 'plain' },
            r.favorites.map((f) =>
              h(
                'li',
                { class: 'card' },
                h('p', { class: 'card__title' }, activityLink(f.activityId)),
                h('p', { class: 'card__meta', style: 'margin: 0' }, [f.loved > 0 && tn('review.loved', f.loved), tn('review.played', f.count)].filter(Boolean).join(' · ')),
              ),
            ),
          ),
        ),
      r.domains.length > 0 &&
        h(
          'section',
          null,
          h('h2', null, t('review.domainsTitle')),
          h(
            'ul',
            { class: 'plain card review-domains' },
            r.domains.map((d) =>
              h(
                'li',
                { class: 'review-domain' },
                domainBadge(d.domain),
                h('span', { class: 'small muted' }, [d.milestones > 0 && tn('review.domainMilestones', d.milestones), d.ideas > 0 && tn('review.domainIdeas', d.ideas)].filter(Boolean).join(' · ')),
              ),
            ),
          ),
        ),
      r.notes.length > 0 &&
        h(
          'section',
          null,
          h('h2', null, t('review.notesTitle')),
          h(
            'ul',
            { class: 'plain' },
            r.notes.map((n) =>
              h(
                'li',
                { class: 'card' },
                h('p', { style: 'margin: 0 0 var(--space-2); white-space: pre-wrap' }, n.text),
                h('p', { class: 'card__meta', style: 'margin: 0' }, formatDate(n.date), ' · ', activityLink(n.activityId)),
              ),
            ),
          ),
        ),
    );
  };

  const mems = memories(ctx.today, records, logs).filter((m) => (m.kind === 'milestone' ? ctx.milestoneById(m.id) : true));
  const memoryText = (m: (typeof mems)[number]) =>
    m.kind === 'milestone' ? localize(ctx.milestoneById(m.id)!.title, loc) : t('review.memoryActivity', { name: activityTitle(m.id) });

  render();
  return h(
    'section',
    null,
    pageTitle(t('review.title'), '#/verlauf'),
    h('p', null, t('review.intro', { name: child.name })),
    mems.length > 0 &&
      h(
        'div',
        { class: 'card card--memory' },
        h('h2', null, t('review.memoriesTitle')),
        h(
          'ul',
          { class: 'plain stack' },
          mems.slice(0, 6).map((m) =>
            h(
              'li',
              null,
              h('p', { class: 'small muted', style: 'margin: 0' }, `${tn('review.memoryYears', m.yearsAgo)} · ${formatDate(m.date)}`),
              h('p', { style: 'margin: 0' }, memoryText(m)),
              m.note && h('p', { class: 'small', style: 'margin: var(--space-1) 0 0; white-space: pre-wrap' }, `„${m.note}“`),
            ),
          ),
        ),
      ),
    segmented(
      t('review.period'),
      REVIEW_PERIODS.map((p) => ({ value: p, label: t(`review.periods.${p}`) })),
      period,
      (v) => {
        period = v;
        render();
      },
    ),
    content,
    h('p', { class: 'muted small', style: 'margin-top: var(--space-6)' }, t('development.noDiagnosis')),
  );
}
