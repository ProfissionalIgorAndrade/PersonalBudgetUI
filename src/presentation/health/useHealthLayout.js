import { useCallback, useMemo } from 'react';
import { useLocalStorage } from '../../core/hooks/useLocalStorage';
import { LAYOUT_KEY, reconcileLayout, toggleWidget, moveWidget, defaultLayout } from './layout';

/** Estado do layout no localStorage, sempre reconciliado com o registro. */
export function useHealthLayout() {
  const [stored, setStored] = useLocalStorage(LAYOUT_KEY, null);
  const layout = useMemo(() => reconcileLayout(stored), [stored]);
  const toggle = useCallback((id) => setStored(toggleWidget(reconcileLayout(stored), id)), [stored, setStored]);
  const move = useCallback((id, dir) => setStored(moveWidget(reconcileLayout(stored), id, dir)), [stored, setStored]);
  const reset = useCallback(() => setStored(defaultLayout()), [setStored]);
  return { layout, toggle, move, reset };
}
