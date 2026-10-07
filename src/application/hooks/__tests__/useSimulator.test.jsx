import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSimulator, HORIZONS, DEFAULT_HORIZON } from '../useSimulator';
import { SIM_STORAGE_KEY, MAX_SIMULATIONS } from '../../../core/utils/simulatorStorage';

const form = (over = {}) => ({
  description: 'Carro', type: 'Expense', mode: 'Installment', startMonth: '2026-10',
  amount: 150, amountKind: 'PerInstallment', installments: 12, months: null, ...over,
});

const setup = () => renderHook(() => useSimulator());

beforeEach(() => { localStorage.clear(); });

describe('useSimulator: estado local, sem rede', () => {
  it('começa vazio, com o horizonte padrão, sem campos de carregamento ou erro', () => {
    const { result } = setup();
    expect(result.current.simulations).toEqual([]);
    expect(result.current.months).toBe(DEFAULT_HORIZON);
    expect(HORIZONS).toEqual([1, 3, 6, 12, 24]);
    ['result', 'loading', 'refetching', 'error', 'retry'].forEach((k) => expect(k in result.current).toBe(false));
  });

  it('adicionar normaliza os campos e liga a simulação', () => {
    const { result } = setup();
    act(() => { result.current.addSimulation(form({ description: '  Carro  ', amount: 150.004 })); });
    expect(result.current.simulations).toHaveLength(1);
    expect(result.current.simulations[0]).toMatchObject({
      description: 'Carro', amount: 150, mode: 'Installment', amountKind: 'PerInstallment', installments: 12, months: null, enabled: true,
    });
  });

  it('só mantém os campos do modo (Mensal guarda a duração e descarta parcelas e tipo de valor)', () => {
    const { result } = setup();
    act(() => { result.current.addSimulation(form({ mode: 'Monthly', months: 6, installments: 3, amountKind: 'Total' })); });
    expect(result.current.simulations[0]).toMatchObject({ mode: 'Monthly', months: 6, installments: null, amountKind: 'PerInstallment' });
  });

  it('editar preserva o liga/desliga e remover tira da lista', () => {
    const { result } = setup();
    act(() => { result.current.addSimulation(form()); });
    const id = result.current.simulations[0].id;
    act(() => { result.current.toggleSimulation(id); });
    act(() => { result.current.editSimulation(id, form({ amount: 99 })); });
    expect(result.current.simulations[0].enabled).toBe(false);
    expect(result.current.simulations[0].amount).toBe(99);
    act(() => { result.current.removeSimulation(id); });
    expect(result.current.simulations).toEqual([]);
  });

  it('liga/desliga alterna enabled sem tocar no horizonte', () => {
    const { result } = setup();
    act(() => { result.current.addSimulation(form()); });
    const id = result.current.simulations[0].id;
    act(() => { result.current.toggleSimulation(id); });
    expect(result.current.simulations[0].enabled).toBe(false);
    expect(result.current.months).toBe(DEFAULT_HORIZON);
    act(() => { result.current.toggleSimulation(id); });
    expect(result.current.simulations[0].enabled).toBe(true);
  });

  it('trocar o horizonte não mexe nas simulações', () => {
    const { result } = setup();
    act(() => { result.current.addSimulation(form()); });
    const before = result.current.simulations;
    act(() => { result.current.setMonths(12); });
    expect(result.current.months).toBe(12);
    expect(result.current.simulations).toBe(before);
  });
});

describe('useSimulator: persistência', () => {
  it('grava a lista versionada e limpa com reset', async () => {
    const { result } = setup();
    act(() => { result.current.addSimulation(form()); });
    const saved = JSON.parse(localStorage.getItem(SIM_STORAGE_KEY));
    expect(saved.version).toBe(2);
    expect(saved.simulations).toHaveLength(1);
    act(() => { result.current.reset(); });
    expect(JSON.parse(localStorage.getItem(SIM_STORAGE_KEY)).simulations).toEqual([]);
    expect(result.current.simulations).toEqual([]);
  });

  it('migra o formato antigo ao abrir', () => {
    localStorage.setItem(SIM_STORAGE_KEY, JSON.stringify({
      name: 'Velho', impacts: [{ id: 'o1', description: 'Moto', amount: 400, type: 'Expense', mode: 'Installment', startDate: '2026-12-10', installmentCount: 10 }],
    }));
    const { result } = setup();
    expect(result.current.simulations[0]).toMatchObject({ id: 'o1', startMonth: '2026-12', installments: 10, amountKind: 'PerInstallment', enabled: true });
  });

  it('respeita o limite de simulações', () => {
    const { result } = setup();
    for (let i = 0; i < MAX_SIMULATIONS; i++) act(() => { result.current.addSimulation(form({ description: `S${i}` })); });
    expect(result.current.limitReached).toBe(true);
    let ok;
    act(() => { ok = result.current.addSimulation(form()); });
    expect(ok).toBe(false);
    expect(result.current.simulations).toHaveLength(MAX_SIMULATIONS);
  });
});
