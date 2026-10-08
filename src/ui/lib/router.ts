/**
 * Hash-Router (#/pfad/:param). Funktioniert auf GitHub Pages ohne Server-Rewrites.
 */
export type RouteParams = Record<string, string>;
export interface Route<T> {
  pattern: string;
  handler: T;
}

export function matchRoute<T>(routes: Route<T>[], path: string): { route: Route<T>; params: RouteParams } | undefined {
  const parts = path.split('/').filter(Boolean);
  for (const route of routes) {
    const pp = route.pattern.split('/').filter(Boolean);
    if (pp.length !== parts.length) continue;
    const params: RouteParams = {};
    let ok = true;
    for (let i = 0; i < pp.length; i++) {
      const p = pp[i]!;
      const v = parts[i]!;
      if (p.startsWith(':')) params[p.slice(1)] = decodeURIComponent(v);
      else if (p !== v) {
        ok = false;
        break;
      }
    }
    if (ok) return { route, params };
  }
  return undefined;
}

export function currentPath(): string {
  const hash = location.hash.replace(/^#/, '');
  return hash.split('?')[0] || '/';
}

export function currentQuery(): URLSearchParams {
  const q = location.hash.split('?')[1];
  return new URLSearchParams(q ?? '');
}

export function navigate(path: string): void {
  location.hash = path;
}
