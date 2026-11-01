import { useState, useEffect, useCallback } from 'react';

const VALID = ['dashboard', 'health', 'transactions', 'accounts', 'cards', 'savings', 'household', 'simulator', 'budgets'];

/** Seções da tela "Meu Lar", na ordem do sub-menu. */
export const HOUSEHOLD_SECTIONS = ['profile', 'family', 'categories'];

/**
 * Perfil, Família e Categorias viraram seções de "Meu Lar". Os ids antigos
 * continuam valendo como destino (links salvos, `setView('profile')`) e caem
 * na seção equivalente.
 */
const ALIASES = { profile: 'profile', members: 'family', categories: 'categories' };

export function resolveView(view, section) {
  if (ALIASES[view]) return { view: 'household', section: ALIASES[view] };
  if (view === 'household') {
    return { view, section: HOUSEHOLD_SECTIONS.includes(section) ? section : HOUSEHOLD_SECTIONS[0] };
  }
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
 * `section` só existe em "Meu Lar" (`#household/family`).
 */
export function useHashView(defaultView = 'dashboard') {
  const [state, setState] = useState(() => parseHash(window.location.hash, defaultView));

  // Link antigo (#profile, #members, #categories): troca pelo endereço novo
  // sem criar uma entrada a mais no histórico.
  useEffect(() => {
    const current = window.location.hash.replace(/^#/, '');
    const { view, section } = parseHash(current, defaultView);
    if (current && current !== hashFor(view, section) && (ALIASES[current] || view === 'household')) {
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
