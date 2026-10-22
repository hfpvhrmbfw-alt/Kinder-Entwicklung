/** Wiederverwendbare UI-Bausteine. */
import type { RecommendationReason } from '../../core/recommend';
import type { Activity } from '../../core/models/content';
import { localize } from '../../core/text';
import { getLocale, t } from '../../i18n';
import type { AppContext } from '../app';
import { domainBadge, formatAgeRange, formatDuration } from '../format';
import { h, icon, ICONS } from '../lib/h';

let uid = 0;
export const nextId = (prefix: string) => `${prefix}-${++uid}`;

export function pageTitle(title: string, backHref?: string): HTMLElement {
  return h(
    'div',
    { class: 'title-row' },
    backHref && h('a', { href: backHref, class: 'roundbtn', 'aria-label': t('common.back') }, icon(ICONS.back)),
    h('h1', { tabIndex: -1, class: 'page-title' }, title),
  );
}

export function reasonText(ctx: AppContext, r: RecommendationReason): string {
  switch (r.kind) {
    case 'activeMilestone': {
      const m = r.milestoneId ? ctx.milestoneById(r.milestoneId) : undefined;
      return t('reason.activeMilestone', { name: m ? localize(m.title, getLocale()) : '' });
    }
    case 'activeDomain':
      return t('reason.activeDomain', { name: t(`domain.${r.domain}`) });
    default:
      return t(`reason.${r.kind}`);
  }
}

/** Begründungen als eine Zeile; mehrere Meilensteine werden zusammengefasst. */
export function reasonsLine(ctx: AppContext, reasons: RecommendationReason[]): string {
  const milestones = reasons.filter((r) => r.kind === 'activeMilestone' && r.milestoneId);
  const parts: string[] = [];
  if (milestones.length) {
    const names = milestones.map((r) => localize(ctx.milestoneById(r.milestoneId!)?.title, getLocale())).filter(Boolean);
    parts.push(t('reason.activeMilestone', { name: names.join(', ') }));
  }
  for (const r of reasons) if (r.kind !== 'activeMilestone') parts.push(reasonText(ctx, r));
  return parts.slice(0, 2).join(' · ');
}

export function activityCard(ctx: AppContext, a: Activity, reasons: RecommendationReason[] = [], highlight = false): HTMLElement {
  const loc = getLocale();
  return h(
    'a',
    { class: `card card--link${highlight ? ' card--highlight' : ''}`, href: `#/ideen/${encodeURIComponent(a.id)}` },
    h('p', { class: 'card__title' }, localize(a.title, loc)),
    h('p', { class: 'small', style: 'margin-bottom: var(--space-2)' }, localize(a.summary, loc)),
    h(
      'div',
      { class: 'row' },
      domainBadge(a.domains.primary),
      h('span', { class: 'badge' }, t(`location.${a.location}`)),
      h('span', { class: 'badge' }, formatDuration(a)),
      h('span', { class: 'badge' }, formatAgeRange(a.ageRange)),
      a.origin === 'custom' && h('span', { class: 'badge badge--custom' }, t('activity.custom')),
    ),
    reasons.length > 0 && h('p', { class: 'card__meta', style: 'margin: var(--space-2) 0 0' }, reasonsLine(ctx, reasons)),
  );
}

export interface Option<V extends string> {
  value: V;
  label: string;
}

/** Einfachauswahl als Segment-Leiste (Radio-Buttons, tastaturbedienbar). */
export function segmented<V extends string>(legend: string, options: Option<V>[], value: V, onChange: (v: V) => void): HTMLElement {
  const name = nextId('seg');
  return h(
    'fieldset',
    { class: 'field', style: 'border: 0; padding: 0; margin: 0 0 var(--space-4)' },
    h('legend', { class: 'label', style: 'padding: 0; margin-bottom: var(--space-2); font-weight: var(--font-weight-medium)' }, legend),
    h(
      'div',
      { class: 'segmented' },
      options.map((o) =>
        h(
          'label',
          null,
          h('input', { type: 'radio', name, value: o.value, checked: o.value === value, onchange: () => onChange(o.value) }),
          o.label,
        ),
      ),
    ),
  );
}

/** Mehrfachauswahl als Chips (Checkboxen). */
export function chipGroup<V extends string>(legend: string, options: Option<V>[], selected: V[], onChange: (v: V[]) => void): HTMLElement {
  const current = new Set(selected);
  return h(
    'fieldset',
    { class: 'chip-group' },
    h('legend', null, legend),
    options.map((o) =>
      h(
        'label',
        { class: 'chip' },
        h('input', {
          type: 'checkbox',
          value: o.value,
          checked: current.has(o.value),
          onchange: (e: Event) => {
            if ((e.target as HTMLInputElement).checked) current.add(o.value);
            else current.delete(o.value);
            onChange(options.map((x) => x.value).filter((v) => current.has(v)));
          },
        }),
        o.label,
      ),
    ),
  );
}

/** Modaler Dialog; liefert das Formular-Ergebnis oder undefined bei Abbruch. */
export function openDialog<T>(title: string, body: HTMLElement, collect: () => T | undefined, submitLabel = t('common.save')): Promise<T | undefined> {
  return new Promise((resolve) => {
    const titleId = nextId('dlg');
    const form = h(
      'form',
      { method: 'dialog' },
      h('h2', { id: titleId, style: 'margin-top: 0' }, title),
      body,
      h(
        'div',
        { class: 'row', style: 'justify-content: flex-end; margin-top: var(--space-4)' },
        h('button', { type: 'button', class: 'btn', onclick: () => close(undefined) }, t('common.cancel')),
        h('button', { type: 'submit', class: 'btn btn--primary' }, submitLabel),
      ),
    );
    const dialog = h('dialog', { 'aria-labelledby': titleId }, form);
    let done = false;
    const close = (value: T | undefined) => {
      if (done) return;
      done = true;
      dialog.close();
      dialog.remove();
      resolve(value);
    };
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const value = collect();
      if (value !== undefined) close(value);
    });
    dialog.addEventListener('cancel', () => close(undefined));
    document.body.appendChild(dialog);
    dialog.showModal();
  });
}

export function confirmDialog(message: string, confirmLabel: string): Promise<boolean> {
  return openDialog(message, h('div'), () => true, confirmLabel).then((v) => v === true);
}

export function emptyState(text: string, action?: HTMLElement): HTMLElement {
  return h('div', { class: 'empty' }, h('p', null, text), action);
}
