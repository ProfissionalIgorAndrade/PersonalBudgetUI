import { useState, useEffect, useCallback } from 'react';

/**
 * Telas com sub-menu e as suas seções, na ordem do sub-menu. A primeira é a
 * que abre quando o endereço não diz qual.
 */
export const SECTIONS = {
  household: ['profile', 'family', 'categories'],
  planning:  ['health', 'budgets', 'simulator'],
};
export const HOUSEHOLD_SECTIONS = SECTIONS.household;
export const PLANNING_SECTIONS  = SECTIONS.planning;

const VALID = ['dashboard', 'transactions', 'accounts', 'cards', 'savings', ...Object.keys(SECTIONS)];

/**
 * Telas que viraram seções. Os ids antigos continuam valendo como destino
 * (links salvos, `setView('budgets')`) e caem na seção equivalente.
 */
const ALIASES = {
  profile:    ['household', 'profile'],
  members:    ['household', 'family'],
  categories: ['household', 'categories'],
  health:     ['planning', 'health'],
  budgets:    ['planning', 'budgets'],
  simulator:  ['planning', 'simulator'],
};

export function resolveView(view, section) {
  if (ALIASES[view]) return { view: ALIASES[view][0], section: ALIASES[view][1] };
  const list = SECTIONS[view];
  if (list) return { view, section: list.includes(section) ? section : list[0] };
  return { view, section: null };
}

export function parseHash(hash, defaultView = 'dashboard') {
  const [base = '', sub] = String(hash || '').replace(/^#/, '').split('/');
  if (!VALID.includes(base) && !ALIASES[base]) return { view: defaultView, section: null };
  return resolveView(base, sub);
}

export const hashFor = (view, section) => (section ? `${view}/${section}` : view);

/**
 * Tela atual a partir do hash da URL: `[view, setView, section]`.
 * `section` só existe nas telas com sub-menu (`#household/family`).
 */
export function useHashView(defaultView = 'dashboard') {
  const [state, setState] = useState(() => parseHash(window.location.hash, defaultView));

  // Endereço antigo ou incompleto (#members, #household): troca pelo endereço
  // completo sem criar uma entrada a mais no histórico.
  useEffect(() => {
    const current = window.location.hash.replace(/^#/, '');
    const { view, section } = parseHash(current, defaultView);
    if (current && section && current !== hashFor(view, section)) {
      window.history.replaceState(null, '', `#${hashFor(view, section)}`);
    }
  }, []);

  const setView = useCallback((v, section) => {
    const next = resolveView(v, section);
    window.location.hash = hashFor(next.view, next.section);
    setState(next);
  }, []);

  useEffect(() => {
    const onHashChange = () => setState(parseHash(window.location.hash, defaultView));
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [defaultView]);

  return [state.view, setView, state.section];
}
