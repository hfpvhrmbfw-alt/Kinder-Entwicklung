/** Erster Start: Begrüßung, Hinweise, erstes Kinderprofil. */
import { t } from '../../i18n';
import type { AppContext } from '../app';
import { h } from '../lib/h';
import { childForm } from './children';
import { legalParagraphs } from './info';

export function onboardingScreen(ctx: AppContext): HTMLElement {
  const step2 = h('div', { hidden: true });
  const step1 = h(
    'div',
    null,
    h('h1', { tabIndex: -1, class: 'page-title' }, t('onboarding.welcomeTitle')),
    h('p', null, t('onboarding.welcomeText')),
    h('p', { class: 'notice' }, t('onboarding.privacy')),
    h('div', { class: 'card' }, h('h2', { style: 'margin-top: 0' }, t('legal.title')), legalParagraphs()),
    h(
      'button',
      {
        class: 'btn btn--primary btn--block',
        onclick: async () => {
          await ctx.saveSettings({ disclaimerAcceptedAt: new Date().toISOString() });
          step1.hidden = true;
          step2.hidden = false;
          step2.querySelector('input')?.focus();
        },
      },
      t('onboarding.start'),
    ),
  );
  step2.append(
    h('h1', null, t('onboarding.firstChild')),
    childForm(ctx, undefined, async (child) => {
      await ctx.saveSettings({ activeChildId: child.id, onboardingDone: true });
      ctx.navigate('#/');
      await ctx.reload();
    }),
  );
  return h('section', null, step1, step2);
}
