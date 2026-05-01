import { useState, useEffect } from 'react';

const VALID = ['dashboard', 'transactions', 'accounts', 'cards', 'categories', 'members', 'profile'];

export function useHashView(defaultView = 'dashboard') {
  const fromHash = () => {
    const h = window.location.hash.slice(1);
    return VALID.includes(h) ? h : defaultView;
  };

  const [view, setViewState] = useState(fromHash);

  const setView = (v) => {
    window.location.hash = v;
    setViewState(v);
  };

  useEffect(() => {
    const onHashChange = () => setViewState(fromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return [view, setView];
}
