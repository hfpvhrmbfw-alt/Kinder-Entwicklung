/** Kinderprofile: Liste und Formular. */
import { compareDates, isValidDate } from '../../core/dates';
import type { Child } from '../../core/models/user';
import { t } from '../../i18n';
import { newId } from '../../storage/repository';
import type { AppContext } from '../app';
import { confirmDialog, nextId, pageTitle } from '../components/common';
import { formatChildAge, formatDate } from '../format';
import { h } from '../lib/h';

export function childrenScreen(ctx: AppContext): HTMLElement {
  return h(
    'section',
    null,
    pageTitle(t('children.title'), '#/mehr'),
    ctx.children.map((c) =>
      h(
        'a',
        { class: 'card card--link', href: `#/kinder/${c.id}` },
        h('p', { class: 'card__title' }, c.name, c.id === ctx.activeChild?.id && h('span', { class: 'badge', style: 'margin-left: var(--space-2)' }, t('children.active'))),
        h('p', { class: 'card__meta', style: 'margin: 0' }, `${formatDate(c.birthDate)} · ${formatChildAge(ctx.ageOf(c))}`),
      ),
    ),
    h('a', { class: 'btn btn--primary btn--block', href: '#/kinder/neu' }, t('children.add')),
  );
}

/** Formular für neues oder bestehendes Kind. `onDone` wird nach dem Speichern aufgerufen. */
export function childForm(ctx: AppContext, existing: Child | undefined, onDone: (child: Child) => void): HTMLElement {
  const ids = { name: nextId('f'), birth: nextId('f'), due: nextId('f'), err: nextId('f') };
  const name = h('input', { type: 'text', id: ids.name, value: existing?.name ?? '', autocomplete: 'off', required: true, maxLength: 60 });
  const birth = h('input', { type: 'date', id: ids.birth, value: existing?.birthDate ?? '', max: ctx.today, required: true });
  const premature = h('input', { type: 'checkbox', checked: !!existing?.dueDate });
  const due = h('input', { type: 'date', id: ids.due, value: existing?.dueDate ?? '' });
  const useCorrected = h('input', { type: 'checkbox', checked: existing ? existing.useCorrectedAge : true });
  const error = h('p', { id: ids.err, class: 'notice notice--calm', role: 'alert', hidden: true });

  const premBlock = h(
    'div',
    { hidden: !premature.checked },
    h('div', { class: 'field' }, h('label', { for: ids.due }, t('children.dueDate')), due, h('span', { class: 'hint' }, t('children.dueDateHint'))),
    h('label', { class: 'check' }, useCorrected, t('children.useCorrected')),
  );
  premature.addEventListener('change', () => (premBlock.hidden = !premature.checked));

  const fail = (msg: string, field: HTMLElement) => {
    error.textContent = msg;
    error.hidden = false;
    field.focus();
  };

  const form = h(
    'form',
    {
      novalidate: true,
      onsubmit: async (e: Event) => {
        e.preventDefault();
        const nm = name.value.trim();
        if (!nm) return fail(t('children.errorName'), name);
        if (!isValidDate(birth.value) || compareDates(birth.value, ctx.today) > 0) return fail(t('children.errorBirthDate'), birth);
        const hasDue = premature.checked && due.value;
        if (hasDue && (!isValidDate(due.value) || compareDates(due.value, birth.value) <= 0)) return fail(t('children.errorDueDate'), due);
        const now = new Date().toISOString();
        const child: Child = {
          id: existing?.id ?? newId(),
          name: nm,
          birthDate: birth.value,
          useCorrectedAge: hasDue ? useCorrected.checked : false,
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
          ...(hasDue ? { dueDate: due.value } : {}),
          ...(existing?.photoId ? { photoId: existing.photoId } : {}),
        };
        await ctx.repo.saveChild(child);
        onDone(child);
      },
    },
    h('div', { class: 'field' }, h('label', { for: ids.name }, t('children.name')), name),
    h('div', { class: 'field' }, h('label', { for: ids.birth }, t('children.birthDate')), birth),
    h('label', { class: 'check' }, premature, t('children.premature')),
    premBlock,
    error,
    h('button', { type: 'submit', class: 'btn btn--primary btn--block', style: 'margin-top: var(--space-4)' }, t('common.save')),
  );
  return form;
}

export function childEditScreen(ctx: AppContext, params: Record<string, string>): HTMLElement {
  const existing = params.id === 'neu' ? undefined : ctx.children.find((c) => c.id === params.id);
  const form = childForm(ctx, existing, async (child) => {
    if (!existing) await ctx.saveSettings({ activeChildId: child.id });
    ctx.toast(t('common.saved'));
    ctx.navigate('#/kinder');
    await ctx.reload();
  });
  return h(
    'section',
    null,
    pageTitle(existing ? t('children.edit') : t('children.new'), '#/kinder'),
    form,
    existing &&
      h(
        'button',
        {
          class: 'btn btn--ghost btn--danger btn--block',
          style: 'margin-top: var(--space-5)',
          onclick: async () => {
            if (!(await confirmDialog(t('children.deleteConfirm', { name: existing.name }), t('common.delete')))) return;
            await ctx.repo.deleteChild(existing.id);
            ctx.toast(t('common.deleted'));
            ctx.navigate('#/kinder');
            await ctx.reload();
          },
        },
        t('common.delete'),
      ),
  );
}
