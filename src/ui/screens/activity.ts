/** Aktivität durchführen: Detailansicht mit Anleitung, Sicherheit, Quellen und „Haben wir gemacht“. */
import type { Activity, LocalizedText } from '../../core/models/content';
import type { ActivityLog, Enjoyment } from '../../core/models/user';
import { localize } from '../../core/text';
import { getLocale, t } from '../../i18n';
import { newId } from '../../storage/repository';
import type { AppContext } from '../app';
import { confirmDialog, emptyState, nextId, openDialog, pageTitle, segmented } from '../components/common';
import { domainBadge, formatAgeRange, formatDuration } from '../format';
import { h, icon, ICONS } from '../lib/h';

function list(items: LocalizedText[], ordered = false): HTMLElement {
  const loc = getLocale();
  const children = items.map((i) => h('li', null, localize(i, loc)));
  return ordered ? h('ol', { class: 'steps' }, children) : h('ul', null, children);
}

export async function activityScreen(ctx: AppContext, params: Record<string, string>): Promise<HTMLElement> {
  const a = ctx.activityById(params.id ?? '');
  if (!a) return h('section', null, pageTitle(t('library.title'), '#/ideen'), emptyState(t('activity.notFound')));
  const loc = getLocale();
  const favorites = await ctx.repo.listFavorites();
  let isFav = favorites.some((f) => f.activityRef.id === a.id);

  const favLabel = () => (isFav ? t('activity.favoriteRemove') : t('activity.favoriteAdd'));
  const favBtn = h('button', { class: 'btn', 'aria-pressed': String(isFav) }, icon(ICONS.heart), h('span', null, favLabel()));
  favBtn.addEventListener('click', async () => {
    isFav = !isFav;
    await ctx.repo.setFavorite({ source: a.origin, id: a.id }, isFav);
    favBtn.setAttribute('aria-pressed', String(isFav));
    favBtn.querySelector('span')!.textContent = favLabel();
  });

  const doneBtn = h('button', { class: 'btn btn--primary', onclick: () => logActivity(ctx, a) }, icon(ICONS.check), t('activity.markDone'));
  const custom = a.origin === 'custom';
  const deleteCustom = async () => {
    if (!(await confirmDialog(t('activity.deleteCustomConfirm', { name: localize(a.title, loc) }), t('common.delete')))) return;
    await ctx.repo.deleteCustomActivity(a.id);
    ctx.toast(t('common.deleted'), {
      label: t('common.undo'),
      run: async () => {
        await ctx.repo.saveCustomActivity(a);
        if (isFav) await ctx.repo.setFavorite({ source: 'custom', id: a.id }, true);
        await ctx.reload();
      },
    });
    ctx.navigate('#/ideen');
    await ctx.reload();
  };

  const materials = a.materials.map((m) => {
    const mat = ctx.content.materials.find((x) => x.id === m.materialId);
    const name = mat ? localize(mat.name, loc) : m.materialId;
    return h('li', null, m.amount ? `${localize(m.amount, loc)} ${name}` : name, m.optional && h('span', { class: 'muted' }, ` ${t('activity.optional')}`));
  });

  const relatedMilestones = a.relatedMilestoneIds.map((id) => ctx.milestoneById(id)).filter((m) => m !== undefined);
  const refs = a.references.map((r) => ({ link: r, ref: ctx.content.references.find((x) => x.id === r.referenceId) }));

  const meta = (label: string, value: string) => h('div', null, h('dt', { class: 'muted small' }, label), h('dd', { style: 'margin: 0; font-weight: var(--font-weight-medium)' }, value));

  return h(
    'article',
    null,
    pageTitle(localize(a.title, loc), '#/ideen'),
    h(
      'div',
      { class: 'row', style: 'margin-bottom: var(--space-3)' },
      domainBadge(a.domains.primary),
      a.domains.secondary.map(domainBadge),
      custom && h('span', { class: 'badge badge--custom' }, t('activity.custom')),
    ),
    localize(a.summary, loc) && h('p', null, localize(a.summary, loc)),
    h(
      'dl',
      { class: 'card', style: 'display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); margin-top: 0' },
      meta(t('activity.age'), formatAgeRange(a.ageRange)),
      meta(t('activity.duration'), formatDuration(a)),
      meta(t('activity.where'), t(`location.${a.location}`)),
      !custom && meta(t('activity.prep'), t(`prepShort.${a.prepEffort}`)),
      !custom && meta(t('activity.with'), a.socialSettings.map((s) => t(`social.${s}`)).join(', ')),
    ),
    h('div', { class: 'row', style: 'margin-bottom: var(--space-4)' }, doneBtn, favBtn),
    custom &&
      h(
        'div',
        { class: 'row', style: 'margin-bottom: var(--space-4)' },
        h('a', { class: 'btn btn--ghost small', href: `#/ideen/eigene/${encodeURIComponent(a.id)}` }, icon(ICONS.edit), t('common.edit')),
        h('button', { class: 'btn btn--ghost btn--danger small', onclick: deleteCustom }, t('common.delete')),
      ),

    a.safety.length > 0 &&
      h(
        'div',
        { class: 'notice notice--safety', role: 'note' },
        h('strong', null, t('activity.safety')),
        h('ul', { style: 'margin: var(--space-1) 0 0; padding-left: var(--space-5)' }, a.safety.map((s) => h('li', null, h('strong', null, `${t(`safetyKind.${s.kind}`)}: `), localize(s.text, loc)))),
      ),

    h('h2', null, t('activity.materials')),
    materials.length || a.materialsText?.length
      ? h('ul', null, materials, (a.materialsText ?? []).map((m) => h('li', null, localize(m, loc))))
      : h('p', { class: 'muted' }, t('activity.noMaterials')),

    a.steps.length > 0 && h('div', null, h('h2', null, t('activity.steps')), list(a.steps, true)),

    (a.variations.easier.length > 0 || a.variations.harder.length > 0) &&
      h(
        'div',
        null,
        h('h2', null, t('activity.variations')),
        a.variations.easier.length > 0 && h('div', null, h('h3', null, t('activity.easier')), list(a.variations.easier)),
        a.variations.harder.length > 0 && h('div', null, h('h3', null, t('activity.harder')), list(a.variations.harder)),
      ),

    a.guidanceTips.length > 0 && h('div', null, h('h2', null, t('activity.tips')), list(a.guidanceTips)),

    a.learningOutcomes.length > 0 && h('div', null, h('h2', null, t('activity.learns')), list(a.learningOutcomes)),

    localize(a.rationale, loc) && h('div', null, h('h2', null, t('activity.why')), h('p', null, localize(a.rationale, loc))),

    (!!a.background || !!a.observe?.length || !!a.everyday?.length) &&
      h(
        'div',
        null,
        h('h2', null, t('pedagogy.title')),
        a.background && h('p', null, localize(a.background, loc)),
        !!a.observe?.length && h('div', null, h('h3', null, t('pedagogy.observe')), list(a.observe)),
        !!a.everyday?.length && h('div', null, h('h3', null, t('pedagogy.everyday')), list(a.everyday)),
      ),

    relatedMilestones.length > 0 &&
      h('div', null, h('h2', null, t('activity.relatedMilestones')), h('ul', null, relatedMilestones.map((m) => h('li', null, h('a', { href: `#/entwicklung?m=${m.id}` }, localize(m.title, loc)))))),

    custom && h('p', { class: 'muted small', style: 'margin-top: var(--space-5)' }, t('activity.customNote')),
    !custom &&
    h(
      'details',
      { class: 'disclosure', style: 'margin-top: var(--space-5)' },
      h('summary', null, t('activity.sources')),
      h(
        'div',
        { class: 'disclosure__body' },
        h('ul', null, refs.map(({ link, ref }) => h('li', null, ref ? referenceLabel(ref) : link.referenceId, link.note && h('span', { class: 'muted' }, ` – ${localize(link.note, loc)}`)))),
        a.review.status !== 'reviewed' && h('p', { class: 'muted small' }, t('activity.reviewNeedsCheck')),
      ),
    ),
  );
}

export function referenceLabel(ref: { authors?: string[]; year?: number; title: string; publishedIn?: string }): string {
  const authors = ref.authors?.length ? `${ref.authors.slice(0, 3).join(', ')}${ref.authors.length > 3 ? ' u. a.' : ''}` : '';
  return [authors && `${authors}${ref.year ? ` (${ref.year})` : ''}:`, ref.title, ref.publishedIn && `– ${ref.publishedIn}`].filter(Boolean).join(' ');
}

/** Dialog „Haben wir gemacht“ → Verlaufseintrag. */
export async function logActivity(ctx: AppContext, a: Activity): Promise<void> {
  const ids = { date: nextId('l'), dur: nextId('l'), note: nextId('l') };
  const date = h('input', { type: 'date', id: ids.date, value: ctx.today, max: ctx.today, required: true });
  const duration = h('input', { type: 'number', id: ids.dur, min: 1, max: 600, inputMode: 'numeric' });
  const note = h('textarea', { id: ids.note, placeholder: t('log.notePlaceholder'), maxLength: 2000 });
  let enjoyment: Enjoyment | undefined;
  const childChecks = ctx.children.map((c) => ({ child: c, input: h('input', { type: 'checkbox', checked: c.id === ctx.activeChild?.id }) }));

  const body = h(
    'div',
    null,
    h('div', { class: 'field' }, h('label', { for: ids.date }, t('log.date')), date),
    ctx.children.length > 1 &&
      h('fieldset', { class: 'field', style: 'border: 0; padding: 0' }, h('legend', { class: 'label' }, t('log.children')), childChecks.map(({ child, input }) => h('label', { class: 'check' }, input, child.name))),
    segmented(
      t('log.enjoyment'),
      (['low', 'medium', 'high'] as const).map((v) => ({ value: v, label: t(`enjoyment.${v}`) })),
      '' as Enjoyment,
      (v) => (enjoyment = v),
    ),
    h('div', { class: 'field' }, h('label', { for: ids.dur }, `${t('log.duration')} (${t('common.optional')})`), duration),
    h('div', { class: 'field' }, h('label', { for: ids.note }, `${t('log.note')} (${t('common.optional')})`), note),
  );

  const result = await openDialog<ActivityLog>(t('log.dialogTitle'), body, () => {
    if (!date.value || date.value > ctx.today) {
      date.focus();
      return undefined;
    }
    const childIds = childChecks.filter((c) => c.input.checked).map((c) => c.child.id);
    if (ctx.children.length && childIds.length === 0) return undefined;
    const minutes = Number(duration.value);
    return {
      id: newId(),
      childIds,
      activityRef: { source: a.origin, id: a.id },
      date: date.value,
      photoIds: [],
      createdAt: new Date().toISOString(),
      ...(enjoyment ? { enjoyment } : {}),
      ...(minutes > 0 ? { durationMinutes: Math.round(minutes) } : {}),
      ...(note.value.trim() ? { note: note.value.trim() } : {}),
    };
  });
  if (!result) return;
  await ctx.repo.saveLog(result);
  ctx.toast(t('log.saved'), { label: t('nav.history'), run: () => ctx.navigate('#/verlauf') });
}
