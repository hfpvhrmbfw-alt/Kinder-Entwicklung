/**
 * Einstiegspunkt: lädt Content und Nutzerdaten, baut den App-Rahmen und verdrahtet den Router.
 */
import './styles/tokens.css';
import './styles/base.css';
import { loadContent } from './content/loader';
import { setLocale, t } from './i18n';
import { setupPwa } from './pwa';
import { Repository } from './storage/repository';
import { createContext, type AppContext } from './ui/app';
import { h, icon, ICONS, replaceChildren } from './ui/lib/h';
import { currentPath, matchRoute, type Route } from './ui/lib/router';
import { activityScreen } from './ui/screens/activity';
import { childEditScreen, childrenScreen } from './ui/screens/children';
import { developmentScreen } from './ui/screens/development';
import { historyScreen } from './ui/screens/history';
import { backupScreen, legalScreen, moreScreen, settingsScreen, sourcesScreen } from './ui/screens/info';
import { libraryScreen } from './ui/screens/library';
import { onboardingScreen } from './ui/screens/onboarding';
import { todayScreen } from './ui/screens/today';

type Screen = (ctx: AppContext, params: Record<string, string>) => HTMLElement | Promise<HTMLElement>;

/** Routen; `tab` markiert den aktiven Eintrag der Tab-Leiste. */
const routes: Route<{ screen: Screen; tab: string }>[] = [
  { pattern: '/', handler: { screen: todayScreen, tab: 'today' } },
  { pattern: '/entwicklung', handler: { screen: developmentScreen, tab: 'development' } },
  { pattern: '/ideen', handler: { screen: libraryScreen, tab: 'ideas' } },
  { pattern: '/ideen/:id', handler: { screen: activityScreen, tab: 'ideas' } },
  { pattern: '/verlauf', handler: { screen: historyScreen, tab: 'history' } },
  { pattern: '/mehr', handler: { screen: moreScreen, tab: 'more' } },
  { pattern: '/kinder', handler: { screen: childrenScreen, tab: 'more' } },
  { pattern: '/kinder/:id', handler: { screen: childEditScreen, tab: 'more' } },
  { pattern: '/einstellungen', handler: { screen: settingsScreen, tab: 'more' } },
  { pattern: '/sicherung', handler: { screen: backupScreen, tab: 'more' } },
  { pattern: '/quellen', handler: { screen: sourcesScreen, tab: 'more' } },
  { pattern: '/hinweise', handler: { screen: legalScreen, tab: 'more' } },
  { pattern: '/willkommen', handler: { screen: onboardingScreen, tab: '' } },
];

const tabs = [
  { id: 'today', href: '#/', icon: ICONS.today },
  { id: 'development', href: '#/entwicklung', icon: ICONS.growth },
  { id: 'ideas', href: '#/ideen', icon: ICONS.ideas },
  { id: 'history', href: '#/verlauf', icon: ICONS.history },
  { id: 'more', href: '#/mehr', icon: ICONS.more },
];

async function start(): Promise<void> {
  setLocale('de');
  const root = document.getElementById('app')!;
  const main = h('main', { id: 'main' });
  const childLink = h('a', { class: 'btn btn--ghost small', href: '#/mehr' });
  const tabbar = h('nav', { class: 'tabbar', 'aria-label': 'Hauptnavigation' });

  replaceChildren(
    root,
    h('a', { class: 'skip-link', href: '#main', onclick: (e: Event) => (e.preventDefault(), main.focus()) }, t('app.skip')),
    h('header', { class: 'app-header' }, h('div', { class: 'app-header__inner' }, h('span', { class: 'app-title' }, t('app.name')), childLink)),
    main,
    tabbar,
  );
  main.tabIndex = -1;

  const repo = await Repository.open();
  let renderToken = 0;
  let lastPath = '';

  const ctx = createContext(repo, loadContent(), { rerender: () => void render() });

  async function render(): Promise<void> {
    const token = ++renderToken;
    let path = currentPath();
    if (!ctx.settings.onboardingDone && ctx.children.length === 0 && path !== '/willkommen') {
      location.replace('#/willkommen');
      return;
    }
    const match = matchRoute(routes, path) ?? matchRoute(routes, '/')!;
    path = match.route.pattern;
    const view = await match.route.handler.screen(ctx, match.params);
    if (token !== renderToken) return; // ein neuerer Render hat übernommen

    const onboarding = match.route.pattern === '/willkommen';
    tabbar.hidden = onboarding;
    childLink.hidden = onboarding || !ctx.activeChild;
    replaceChildren(childLink, icon(ICONS.child), ctx.activeChild?.name ?? '');
    replaceChildren(
      tabbar,
      h(
        'ul',
        null,
        tabs.map((tab) =>
          h('li', null, h('a', { href: tab.href, 'aria-current': tab.id === match.route.handler.tab ? 'page' : undefined }, icon(tab.icon), t(`nav.${tab.id}`))),
        ),
      ),
    );
    replaceChildren(main, view);

    // Bei Seitenwechsel: nach oben und Fokus auf die Überschrift (Screenreader)
    const full = location.hash;
    if (full !== lastPath) {
      lastPath = full;
      if (!location.hash.includes('m=')) window.scrollTo(0, 0);
      (main.querySelector('.page-title') as HTMLElement | null)?.focus({ preventScroll: true });
    }
    document.title = `${main.querySelector('h1')?.textContent ?? ''} · ${t('app.name')}`;
  }

  window.addEventListener('hashchange', () => {
    document.querySelector('dialog')?.remove();
    void render();
  });
  // Datum kann über Mitternacht wechseln (App bleibt offen)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void ctx.reload();
  });
  await ctx.reload();
  setupPwa();
}

start().catch((err) => {
  console.error(err);
  document.getElementById('app')!.textContent = 'Die App konnte nicht gestartet werden. Bitte lade die Seite neu.';
});
