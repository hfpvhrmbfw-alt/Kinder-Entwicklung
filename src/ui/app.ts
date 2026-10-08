/**
 * App-Kontext: hält geladene Daten und stellt sie den Bildschirmen bereit.
 * Bildschirme lesen aus `ctx` und rufen nach Änderungen `ctx.reload()` auf.
 */
import { childAge, type ChildAge } from '../core/age';
import { todayLocal } from '../core/dates';
import type { Activity, ContentBundle, Milestone } from '../core/models/content';
import type { Child, Settings } from '../core/models/user';
import type { Repository } from '../storage/repository';

export interface AppContext {
  repo: Repository;
  content: ContentBundle;
  settings: Settings;
  children: Child[];
  activeChild?: Child;
  today: string;
  /** Lädt Kinder und Einstellungen neu und zeichnet den aktuellen Bildschirm neu. */
  reload(): Promise<void>;
  navigate(path: string): void;
  toast(message: string, action?: { label: string; run: () => void }): void;
  ageOf(child: Child): ChildAge;
  activityById(id: string): Activity | undefined;
  milestoneById(id: string): Milestone | undefined;
  saveSettings(patch: Partial<Settings>): Promise<void>;
}

export function createContext(repo: Repository, content: ContentBundle, hooks: { rerender(): void }): AppContext {
  const activityIndex = new Map(content.activities.map((a) => [a.id, a]));
  const milestoneIndex = new Map(content.milestones.map((m) => [m.id, m]));

  const ctx: AppContext = {
    repo,
    content,
    settings: undefined as unknown as Settings,
    children: [],
    today: todayLocal(),
    async reload() {
      ctx.today = todayLocal();
      ctx.settings = await repo.getSettings();
      ctx.children = await repo.listChildren();
      ctx.activeChild = ctx.children.find((c) => c.id === ctx.settings.activeChildId) ?? ctx.children[0];
      applyTheme(ctx.settings.theme);
      hooks.rerender();
    },
    navigate(path) {
      location.hash = path;
    },
    toast,
    ageOf: (child) => childAge(child, ctx.today),
    activityById: (id) => activityIndex.get(id),
    milestoneById: (id) => milestoneIndex.get(id),
    async saveSettings(patch) {
      ctx.settings = { ...ctx.settings, ...patch };
      await repo.saveSettings(ctx.settings);
      applyTheme(ctx.settings.theme);
    },
  };
  return ctx;
}

export function applyTheme(theme: Settings['theme']): void {
  if (theme === 'system') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', theme);
  const meta = document.querySelector('meta[name="theme-color"]');
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--color-bg').trim();
  if (meta && bg) meta.setAttribute('content', bg);
}

let toastTimer: number | undefined;
export function toast(message: string, action?: { label: string; run: () => void }): void {
  document.querySelector('.toast')?.remove();
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.textContent = message;
  if (action) {
    const btn = document.createElement('button');
    btn.textContent = action.label;
    btn.addEventListener('click', () => {
      el.remove();
      action.run();
    });
    el.appendChild(btn);
  }
  document.body.appendChild(el);
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => el.remove(), action ? 6000 : 3000);
}
