/** Aktivitätenbibliothek mit Suche und Filtern. */
import { countActiveFilters, filterActivities, type ActivityFilter, type LocationChoice } from '../../core/filter';
import { CATEGORY_IDS, DOMAIN_IDS, PREP_EFFORTS, SOCIAL_SETTINGS, type CategoryId, type DomainId, type PrepEffort, type SocialSetting } from '../../core/models/content';
import { localize } from '../../core/text';
import { getLocale, t, tn } from '../../i18n';
import type { AppContext } from '../app';
import { activityCard, chipGroup, nextId, segmented } from '../components/common';
import { h, replaceChildren } from '../lib/h';

type DurationChoice = 'any' | '5' | '15' | '30' | '60';

interface LibraryState {
  query: string;
  forChild: boolean;
  domains: DomainId[];
  categories: CategoryId[];
  duration: DurationChoice;
  location: LocationChoice;
  prep: PrepEffort[];
  social: SocialSetting[];
  materials: string[];
}

const initial = (): LibraryState => ({
  query: '',
  forChild: true,
  domains: [],
  categories: [],
  duration: 'any',
  location: 'any',
  prep: [],
  social: [],
  materials: [],
});
let state = initial();

export function libraryScreen(ctx: AppContext): HTMLElement {
  const child = ctx.activeChild;
  const loc = getLocale();
  const results = h('div');
  const count = h('p', { class: 'muted small', 'aria-live': 'polite' });
  const summary = h('summary');

  const toFilter = (): ActivityFilter => ({
    query: state.query,
    ageMonths: state.forChild && child ? ctx.ageOf(child).effectiveMonths : undefined,
    domains: state.domains,
    categories: state.categories,
    maxDurationMinutes: state.duration === 'any' ? undefined : Number(state.duration),
    location: state.location,
    prepEfforts: state.prep,
    socialSettings: state.social,
    usesMaterialIds: state.materials,
  });

  const update = () => {
    const f = toFilter();
    const list = filterActivities(ctx.content.activities, f, loc).sort(
      (a, b) => a.ageRange.minMonths - b.ageRange.minMonths || localize(a.title, loc).localeCompare(localize(b.title, loc), loc),
    );
    const n = countActiveFilters(f);
    summary.textContent = n ? t('library.filtersActive', { n }) : t('library.filters');
    count.textContent = tn('library.count', list.length);
    replaceChildren(results, list.length ? list.map((a) => activityCard(ctx, a)) : h('p', { class: 'empty' }, t('library.empty')));
  };

  const searchId = nextId('q');
  const search = h('input', {
    type: 'search',
    id: searchId,
    value: state.query,
    placeholder: t('library.searchPlaceholder'),
    oninput: (e: Event) => {
      state.query = (e.target as HTMLInputElement).value;
      update();
    },
  });

  const usedMaterials = new Set(ctx.content.activities.flatMap((a) => a.materials.map((m) => m.materialId)));
  const materialOptions = ctx.content.materials
    .filter((m) => usedMaterials.has(m.id))
    .map((m) => ({ value: m.id, label: localize(m.name, loc) }))
    .sort((a, b) => a.label.localeCompare(b.label, loc));

  const filterBody = h('div', { class: 'disclosure__body' });
  const renderFilters = () =>
    replaceChildren(
      filterBody,
      chipGroup(t('library.domains'), DOMAIN_IDS.map((d) => ({ value: d, label: t(`domain.${d}`) })), state.domains, (v) => ((state.domains = v), update())),
      chipGroup(
        t('library.categories'),
        CATEGORY_IDS.map((c) => ({ value: c, label: localize(ctx.content.categories.find((x) => x.id === c)?.name, loc) || c })),
        state.categories,
        (v) => ((state.categories = v), update()),
      ),
      segmented(
        t('library.duration'),
        [
          { value: '5', label: '5′' },
          { value: '15', label: '15′' },
          { value: '30', label: '30′' },
          { value: '60', label: '60′' },
          { value: 'any', label: t('library.durationAny') },
        ],
        state.duration,
        (v: DurationChoice) => ((state.duration = v), update()),
      ),
      segmented(
        t('library.location'),
        [
          { value: 'indoor', label: t('location.indoor') },
          { value: 'outdoor', label: t('location.outdoor') },
          { value: 'any', label: t('location.any') },
        ],
        state.location,
        (v: LocationChoice) => ((state.location = v), update()),
      ),
      chipGroup(t('library.prep'), PREP_EFFORTS.map((p) => ({ value: p, label: t(`prepShort.${p}`) })), state.prep, (v) => ((state.prep = v), update())),
      chipGroup(t('library.social'), SOCIAL_SETTINGS.map((s) => ({ value: s, label: t(`social.${s}`) })), state.social, (v) => ((state.social = v), update())),
      materialOptions.length > 0 && chipGroup(t('library.material'), materialOptions, state.materials, (v) => ((state.materials = v), update())),
      h(
        'button',
        {
          class: 'btn btn--ghost',
          onclick: () => {
            state = { ...initial(), query: state.query, forChild: state.forChild };
            renderFilters();
            update();
          },
        },
        t('library.reset'),
      ),
    );
  renderFilters();

  const section = h(
    'section',
    null,
    h('h1', { class: 'page-title', tabIndex: -1 }, t('library.title')),
    h('div', { class: 'field' }, h('label', { for: searchId, class: 'visually-hidden' }, t('library.search')), search),
    child &&
      segmented(
        t('activity.age'),
        [
          { value: 'child', label: t('library.forChild', { name: child.name }) },
          { value: 'all', label: t('library.allAges') },
        ],
        state.forChild ? 'child' : 'all',
        (v) => ((state.forChild = v === 'child'), update()),
      ),
    h('details', { class: 'disclosure' }, summary, filterBody),
    count,
    results,
  );
  update();
  return section;
}
