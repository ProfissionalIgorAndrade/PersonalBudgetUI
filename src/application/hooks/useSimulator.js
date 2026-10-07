import { useState, useEffect, useCallback } from 'react';
import {
  loadSimulations, saveSimulations, newSimulationId, MAX_SIMULATIONS,
} from '../../core/utils/simulatorStorage';
import { round2 } from '../../core/utils/simulatorMath';

export const HORIZONS = [1, 3, 6, 12, 24];
export const DEFAULT_HORIZON = 6;

/** Formato canônico de uma simulação a partir dos campos do formulário. */
const normalize = (data) => ({
  description: data.description.trim(),
  type: data.type,
  mode: data.mode,
  startMonth: data.startMonth,
  amount: round2(data.amount),
  amountKind: data.mode === 'Installment' ? data.amountKind : 'PerInstallment',
  installments: data.mode === 'Installment' ? Number(data.installments) : null,
  months: data.mode === 'Monthly' && data.months ? Number(data.months) : null,
});

/**
 * Estado do "E se...?".
 *
 * Só guarda as simulações (persistidas no navegador) e o horizonte. Não há
 * chamada de rede: a base mensal e os cronogramas são calculados no cliente
 * pela tela, a partir destes dois valores.
 */
export function useSimulator() {
  const [simulations, setSimulations] = useState(loadSimulations);
  const [months, setMonths] = useState(DEFAULT_HORIZON);

  useEffect(() => { saveSimulations(simulations); }, [simulations]);

  const addSimulation = useCallback((data) => {
    if (simulations.length >= MAX_SIMULATIONS) return false;
    setSimulations((list) => [...list, { ...normalize(data), id: newSimulationId(), enabled: true }]);
    return true;
  }, [simulations.length]);

  const editSimulation = useCallback((id, data) => {
    setSimulations((list) => list.map((s) => (s.id === id ? { ...normalize(data), id, enabled: s.enabled } : s)));
  }, []);

  const removeSimulation = useCallback((id) => {
    setSimulations((list) => list.filter((s) => s.id !== id));
  }, []);

  const toggleSimulation = useCallback((id) => {
    setSimulations((list) => list.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)));
  }, []);

  const reset = useCallback(() => setSimulations([]), []);

  return {
    simulations,
    months,
    setMonths,
    addSimulation,
    editSimulation,
    removeSimulation,
    toggleSimulation,
    reset,
    limitReached: simulations.length >= MAX_SIMULATIONS,
  };
}
