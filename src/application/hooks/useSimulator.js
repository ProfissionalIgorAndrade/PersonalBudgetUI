import { useState, useEffect, useCallback, useMemo } from 'react';
import { projectScenario } from '../../data/repositories/simulatorRepository';
import {
  loadSimulations, saveSimulations, newSimulationId, MAX_SIMULATIONS,
} from '../../core/utils/simulatorStorage';
import { projectionImpacts, localToday, round2 } from '../../core/utils/simulatorMath';

export const HORIZONS = [1, 3, 6, 12, 24];
export const DEFAULT_HORIZON = 6;
export const DEBOUNCE_MS = 450;

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
 * Só guarda as simulações (persistidas no navegador) e o horizonte. A
 * projeção é DERIVADA: toda mudança no que vai para a API (adicionar, editar,
 * remover, trocar o horizonte) agenda uma nova chamada com debounce. Ligar ou
 * desligar uma simulação não altera o pedido, portanto não chama a API; a
 * tela recompõe o cenário no cliente.
 *
 * Enquanto a nova resposta não chega, `result` continua sendo a anterior
 * (`refetching`), para a tela não piscar. O erro vale só para o pedido atual:
 * mudar o pedido o apaga sem estado manual.
 */
export function useSimulator({ fetcher = projectScenario, debounceMs = DEBOUNCE_MS } = {}) {
  const [simulations, setSimulations] = useState(loadSimulations);
  const [months, setMonths] = useState(DEFAULT_HORIZON);
  const [snap, setSnap] = useState({ data: null, key: null, error: null, errorKey: null });
  const [fetching, setFetching] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);

  useEffect(() => { saveSimulations(simulations); }, [simulations]);

  const requestKey = useMemo(
    () => JSON.stringify({ months, impacts: projectionImpacts(simulations) }),
    [months, simulations],
  );

  useEffect(() => {
    let cancelled = false;
    setFetching(true);
    const timer = setTimeout(async () => {
      try {
        const { months: horizon, impacts } = JSON.parse(requestKey);
        const data = await fetcher({ today: localToday(), months: horizon, impacts });
        if (!cancelled) setSnap({ data, key: requestKey, error: null, errorKey: null });
      } catch (e) {
        if (!cancelled) {
          setSnap((s) => ({ ...s, error: e?.message || 'Não foi possível calcular a projeção.', errorKey: requestKey }));
        }
      } finally {
        if (!cancelled) setFetching(false);
      }
    }, debounceMs);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [requestKey, retryNonce, fetcher, debounceMs]);

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
  const retry = useCallback(() => setRetryNonce((n) => n + 1), []);

  const result = snap.data;
  const error = snap.errorKey === requestKey ? snap.error : null;

  return {
    simulations,
    months,
    setMonths,
    result,
    loading: fetching,
    refetching: fetching && result !== null,
    error,
    retry,
    addSimulation,
    editSimulation,
    removeSimulation,
    toggleSimulation,
    reset,
    limitReached: simulations.length >= MAX_SIMULATIONS,
  };
}
