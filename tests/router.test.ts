import { describe, expect, it } from 'vitest';
import { matchRoute } from '../src/ui/lib/router';

describe('matchRoute', () => {
  const routes = [
    { pattern: '/', handler: 'home' },
    { pattern: '/ideen', handler: 'library' },
    { pattern: '/ideen/:id', handler: 'detail' },
  ];
  it('findet statische und parametrisierte Routen', () => {
    expect(matchRoute(routes, '/')?.route.handler).toBe('home');
    expect(matchRoute(routes, '/ideen')?.route.handler).toBe('library');
    expect(matchRoute(routes, '/ideen/a-box%20x')?.params).toEqual({ id: 'a-box x' });
    expect(matchRoute(routes, '/gibtsnicht')).toBeUndefined();
  });
});
