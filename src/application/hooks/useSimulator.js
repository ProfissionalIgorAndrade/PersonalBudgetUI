import { useState, useCallback } from 'react';
import { useLocalStorage } from '../../core/hooks/useLocalStorage';
import { calculateScenario } from '../../data/repositories/simulatorRepository';

const BLANK_SCENARIO = { name: '', impacts: [] };

export function useSimulator() {
  const [stored, setStored] = useLocalStorage('pb_simulator_scenario', BLANK_SCENARIO);
  const [months, setMonths] = useState(6);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const addImpact = useCallback((impact) => {
    setStored(s => ({ ...s, impacts: [...s.impacts, { ...impact, id: crypto.randomUUID() }] }));
    setResult(null);
  }, [setStored]);

  const editImpact = useCallback((id, updated) => {
    setStored(s => ({ ...s, impacts: s.impacts.map(i => i.id === id ? { ...updated, id } : i) }));
    setResult(null);
  }, [setStored]);

  const removeImpact = useCallback((id) => {
    setStored(s => ({ ...s, impacts: s.impacts.filter(i => i.id !== id) }));
    setResult(null);
  }, [setStored]);

  const setName = useCallback((name) => {
    setStored(s => ({ ...s, name }));
  }, [setStored]);

  const calculate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        scenarioName: stored.name || 'Cenário',
        impacts: stored.impacts.map(({ description, amount, type, mode, startDate, installmentCount }) => ({
          description,
          amount,
          type,
          mode,
          startDate,
          installmentCount: mode === 'Installment' ? Number(installmentCount) : 1,
        })),
      };
      const data = await calculateScenario(payload, months);
      setResult(data);
    } catch (e) {
      setError(e?.message ?? 'Erro ao calcular cenário');
    } finally {
      setLoading(false);
    }
  }, [stored, months]);

  const reset = useCallback(() => {
    setStored(BLANK_SCENARIO);
    setResult(null);
    setError(null);
  }, [setStored]);

  return {
    scenario: stored,
    months,
    result,
    loading,
    error,
    setName,
    setMonths,
    addImpact,
    editImpact,
    removeImpact,
    calculate,
    reset,
  };
}
