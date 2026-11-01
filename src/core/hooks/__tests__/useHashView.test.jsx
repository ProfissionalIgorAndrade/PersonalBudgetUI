import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { useHashView, parseHash, resolveView, hashFor } from '../useHashView';

afterEach(cleanup);
beforeEach(() => { window.history.replaceState(null, '', '#'); });

describe('parseHash', () => {
  it('reads a Meu Lar section', () => {
    expect(parseHash('#household/family')).toEqual({ view: 'household', section: 'family' });
  });

  it('opens Meu Lar on the profile when no section is given or it is unknown', () => {
    expect(parseHash('#household')).toEqual({ view: 'household', section: 'profile' });
    expect(parseHash('#household/nada')).toEqual({ view: 'household', section: 'profile' });
  });

  it('sends the old addresses to their section', () => {
    expect(parseHash('#profile')).toEqual({ view: 'household', section: 'profile' });
    expect(parseHash('#members')).toEqual({ view: 'household', section: 'family' });
    expect(parseHash('#categories')).toEqual({ view: 'household', section: 'categories' });
  });

  it('sends Saúde, Orçamentos and E se...? to their Planejamento section', () => {
    expect(parseHash('#health')).toEqual({ view: 'planning', section: 'health' });
    expect(parseHash('#budgets')).toEqual({ view: 'planning', section: 'budgets' });
    expect(parseHash('#simulator')).toEqual({ view: 'planning', section: 'simulator' });
    expect(parseHash('#planning')).toEqual({ view: 'planning', section: 'health' });
    expect(parseHash('#planning/budgets')).toEqual({ view: 'planning', section: 'budgets' });
  });

  it('keeps other screens without a section and falls back on unknown ones', () => {
    expect(parseHash('#cards')).toEqual({ view: 'cards', section: null });
    expect(parseHash('#qualquer')).toEqual({ view: 'dashboard', section: null });
  });
});

describe('resolveView / hashFor', () => {
  it('maps old ids and builds the address', () => {
    const r = resolveView('members');
    expect(r).toEqual({ view: 'household', section: 'family' });
    expect(hashFor(r.view, r.section)).toBe('household/family');
    expect(hashFor('cards', null)).toBe('cards');
  });
});

describe('useHashView', () => {
  it('rewrites an old link to the new address without a new history entry', () => {
    window.history.replaceState(null, '', '#members');
    const before = window.history.length;
    const { result } = renderHook(() => useHashView('dashboard'));
    expect(result.current[0]).toBe('household');
    expect(result.current[2]).toBe('family');
    expect(window.location.hash).toBe('#household/family');
    expect(window.history.length).toBe(before);
  });

  it('navigates to a section, and old ids still work as destinations', () => {
    const { result } = renderHook(() => useHashView('dashboard'));
    act(() => result.current[1]('household', 'categories'));
    expect(window.location.hash).toBe('#household/categories');
    expect(result.current[2]).toBe('categories');
    act(() => result.current[1]('profile'));
    expect(window.location.hash).toBe('#household/profile');
    expect(result.current[0]).toBe('household');
  });
});
