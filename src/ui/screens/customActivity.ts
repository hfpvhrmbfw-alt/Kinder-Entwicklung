/** Eigene Idee anlegen oder bearbeiten. */
import { ageBandFor } from '../../core/age';
import { MAX_CONTENT_MONTHS } from '../../core/contentRules';
import { buildCustomActivity, CUSTOM_ID_PREFIX, listToLines, validateCustomActivity, type CustomActivityInput } from '../../core/customActivity';
import { CATEGORY_IDS, DOMAIN_IDS, type CategoryId, type DomainId, type Location } from '../../core/models/content';
import { localize } from '../../core/text';
import { getLocale, t } from '../../i18n';
import { newId } from '../../storage/repository';
import type { AppContext } from '../app';
import { emptyState, nextId, pageTitle, segmented } from '../components/common';
import { formatMonths } from '../format';
import { h } from '../lib/h';

export function customActivityScreen(ctx: AppContext, params: Record<string, string>): HTMLElement {
  const loc = getLocale();
  const existing = params.id === 'neu' ? undefined : ctx.customActivities.find((a) => a.id === params.id);
  if (params.id !== 'neu' && !existing) return h('section', null, pageTitle(t('custom.editTitle'), '#/ideen'), emptyState(t('activity.notFound')));

  const bands = [...ctx.content.ageBands].sort((a, b) => a.minMonths - b.minMonths);
  const childBand = ctx.activeChild ? ageBandFor(ctx.ageOf(ctx.activeChild).effectiveMonths, bands) : undefined;
  const ids = { title: nextId('c'), summary: nextId('c'), from: nextId('c'), to: nextId('c'), domain: nextId('c'), category: nextId('c'), minutes: nextId('c'), materials: nextId('c'), steps: nextId('c'), tips: nextId('c') };

  const title = h('input', { type: 'text', id: ids.title, value: existing ? localize(existing.title, loc) : '', placeholder: t('custom.titlePlaceholder'), maxLength: 80, required: true, autocomplete: 'off' });
  const summary = h('input', { type: 'text', id: ids.summary, value: existing ? localize(existing.summary, loc) : '', placeholder: t('custom.summaryPlaceholder'), maxLength: 200, autocomplete: 'off' });
  const monthOption = (m: number, selected: boolean) => h('option', { value: String(m), selected }, formatMonths(m));
  const fromValue = existing?.ageRange.minMonths ?? childBand?.minMonths ?? 0;
  const toValue = existing?.ageRange.maxMonths ?? MAX_CONTENT_MONTHS;
  const from = h('select', { id: ids.from }, bands.map((b) => monthOption(b.minMonths, b.minMonths === fromValue)));
  const to = h('select', { id: ids.to }, bands.map((b) => monthOption(b.maxMonths, b.maxMonths === toValue)));
  const domain = h(
    'select',
    { id: ids.domain },
    DOMAIN_IDS.map((d) => h('option', { value: d, selected: d === (existing?.domains.primary ?? 'socialEmotional') }, t(`domain.${d}`))),
  );
  const category = h(
    'select',
    { id: ids.category },
    CATEGORY_IDS.map((c) => h('option', { value: c, selected: c === (existing?.category ?? 'play') }, localize(ctx.content.categories.find((x) => x.id === c)?.name, loc) || c)),
  );
  let location: Location = existing?.location ?? 'indoor';
  const minutes = h('input', { type: 'number', id: ids.minutes, min: 1, max: 600, inputMode: 'numeric', value: String(existing?.durationMinutes.min ?? 15) });
  const materials = h('textarea', { id: ids.materials, value: listToLines(existing?.materialsText), maxLength: 2000 });
  const steps = h('textarea', { id: ids.steps, value: listToLines(existing?.steps), maxLength: 4000 });
  const tips = h('textarea', { id: ids.tips, value: listToLines(existing?.guidanceTips), maxLength: 4000 });
  const error = h('p', { class: 'notice notice--calm', role: 'alert', hidden: true });

  const field = (id: string, label: string, input: HTMLElement, hint?: string) =>
    h('div', { class: 'field' }, h('label', { for: id }, label), input, hint && h('span', { class: 'hint' }, hint));

  const form = h(
    'form',
    {
      novalidate: true,
      onsubmit: async (e: Event) => {
        e.preventDefault();
        const input: CustomActivityInput = {
          title: title.value,
          summary: summary.value,
          minMonths: Number(from.value),
          maxMonths: Number(to.value),
          domain: domain.value as DomainId,
          category: category.value as CategoryId,
          location,
          minutes: Number(minutes.value),
          materials: materials.value,
          steps: steps.value,
          tips: tips.value,
        };
        const problem = validateCustomActivity(input);
        if (problem) {
          error.textContent = t(`custom.error${problem[0]!.toUpperCase()}${problem.slice(1)}`);
          error.hidden = false;
          ({ title, age: from, minutes })[problem].focus();
          return;
        }
        const activity = buildCustomActivity(input, existing?.id ?? `${CUSTOM_ID_PREFIX}${newId()}`, existing);
        await ctx.repo.saveCustomActivity(activity);
        ctx.toast(t('custom.saved'));
        ctx.navigate(`#/ideen/${encodeURIComponent(activity.id)}`);
        await ctx.reload();
      },
    },
    field(ids.title, t('custom.title'), title),
    field(ids.summary, `${t('custom.summary')} (${t('common.optional')})`, summary),
    h('div', { class: 'field-pair' }, field(ids.from, t('custom.ageFrom'), from), field(ids.to, t('custom.ageTo'), to)),
    field(ids.domain, t('custom.domain'), domain),
    field(ids.category, t('custom.category'), category),
    segmented(
      t('custom.location'),
      [
        { value: 'indoor', label: t('location.indoor') },
        { value: 'outdoor', label: t('location.outdoor') },
        { value: 'both', label: t('location.both') },
      ],
      location,
      (v: Location) => (location = v),
    ),
    field(ids.minutes, t('custom.minutes'), minutes),
    field(ids.materials, `${t('custom.materials')} (${t('common.optional')})`, materials, t('custom.materialsHint')),
    field(ids.steps, `${t('custom.steps')} (${t('common.optional')})`, steps, t('custom.stepsHint')),
    field(ids.tips, `${t('custom.tips')} (${t('common.optional')})`, tips),
    error,
    h('button', { type: 'submit', class: 'btn btn--primary btn--block', style: 'margin-top: var(--space-2)' }, t('common.save')),
  );

  return h(
    'section',
    null,
    pageTitle(existing ? t('custom.editTitle') : t('custom.newTitle'), existing ? `#/ideen/${encodeURIComponent(existing.id)}` : '#/ideen'),
    !existing && h('p', { class: 'muted small' }, t('custom.intro')),
    form,
  );
}
