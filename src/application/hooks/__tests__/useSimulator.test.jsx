import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSimulator, DEBOUNCE_MS } from '../useSimulator';
import { SIM_STORAGE_KEY, MAX_SIMULATIONS } from '../../../core/utils/simulatorStorage';

const response = (tag = 'a') => ({ tag, baseline: [], impacts: [], scenario: [], warnings: [] });

const form = (over = {}) => ({
  description: 'Carro', type: 'Expense', mode: 'Installment', startMonth: '2026-10',
  amount: 150, amountKind: 'PerInstallment', installments: 12, months: null, ...over,
});

/** Avança o debounce e deixa a promessa do fetcher resolver. */
const settle = async (ms = DEBOUNCE_MS + 10) => {
  await act(async () => { await vi.advanceTimersByTimeAsync(ms); });
};

let fetcher;
const setup = () => renderHook(() => useSimulator({ fetcher }));

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  fetcher = vi.fn().mockResolvedValue(response());
});
afterEach(() => vi.useRealTimers());

describe('useSimulator: resultado derivado', () => {
  it('busca o baseline ao abrir, com a data local de hoje e o horizonte padrão', async () => {
    const { result } = setup();
    expect(result.current.result).toBeNull();
    await settle();
    expect(fetcher).toHaveBeenCalledTimes(1);
    const body = fetcher.mock.calls[0][0];
    expect(body.months).toBe(6);
    expect(body.impacts).toEqual([]);
    expect(body.today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.current.result.tag).toBe('a');
    expect(result.current.loading).toBe(false);
  });

  it('adicionar refaz a chamada com o impacto, sem o campo enabled', async () => {
    const { result } = setup();
    await settle();
    act(() => { result.current.addSimulation(form()); });
    await settle();
    expect(fetcher).toHaveBeenCalledTimes(2);
    const [impact] = fetcher.mock.calls[1][0].impacts;
    expect(impact).toMatchObject({ description: 'Carro', mode: 'Installment', amountKind: 'PerInstallment', installments: 12, startMonth: '2026-10' });
    expect('enabled' in impact).toBe(false);
    expect(result.current.simulations).toHaveLength(1);
    expect(result.current.simulations[0].enabled).toBe(true);
  });

  it('editar e remover também refazem a chamada', async () => {
    const { result } = setup();
    act(() => { result.current.addSimulation(form()); });
    await settle();
    const id = result.current.simulations[0].id;
    act(() => { result.current.editSimulation(id, form({ amount: 200 })); });
    await settle();
    expect(fetcher.mock.calls.at(-1)[0].impacts[0].amount).toBe(200);
    act(() => { result.current.removeSimulation(id); });
    await settle();
    expect(fetcher.mock.calls.at(-1)[0].impacts).toEqual([]);
  });

  it('editar preserva o liga/desliga', async () => {
    const { result } = setup();
    act(() => { result.current.addSimulation(form()); });
    const id = result.current.simulations[0].id;
    act(() => { result.current.toggleSimulation(id); });
    act(() => { result.current.editSimulation(id, form({ amount: 99 })); });
    expect(result.current.simulations[0].enabled).toBe(false);
    expect(result.current.simulations[0].amount).toBe(99);
  });

  it('várias mudanças rápidas viram uma chamada só (debounce)', async () => {
    const { result } = setup();
    await settle();
    fetcher.mockClear();
    act(() => { result.current.addSimulation(form({ description: 'A' })); });
    await settle(100);
    act(() => { result.current.addSimulation(form({ description: 'B' })); });
    await settle(100);
    expect(fetcher).not.toHaveBeenCalled();
    await settle();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][0].impacts).toHaveLength(2);
  });

  it('mudar o horizonte refaz a chamada e mantém o resultado anterior enquanto carrega', async () => {
    const { result } = setup();
    await settle();
    const first = result.current.result;
    let release;
    fetcher.mockImplementationOnce(() => new Promise((res) => { release = res; }));
    act(() => { result.current.setMonths(12); });
    expect(result.current.result).toBe(first);
    expect(result.current.loading).toBe(true);
    expect(result.current.refetching).toBe(true);
    await settle();
    expect(fetcher.mock.calls.at(-1)[0].months).toBe(12);
    expect(result.current.refetching).toBe(true);
    await act(async () => { release(response('b')); });
    expect(result.current.result.tag).toBe('b');
    expect(result.current.refetching).toBe(false);
  });

  it('ignora a resposta de um pedido que já foi trocado', async () => {
    const { result } = setup();
    await settle();
    let releaseOld;
    fetcher.mockImplementationOnce(() => new Promise((res) => { releaseOld = res; }));
    act(() => { result.current.setMonths(3); });
    await settle();
    fetcher.mockResolvedValueOnce(response('novo'));
    act(() => { result.current.setMonths(12); });
    await settle();
    expect(result.current.result.tag).toBe('novo');
    await act(async () => { releaseOld(response('velho')); });
    expect(result.current.result.tag).toBe('novo');
  });
});

describe('useSimulator: liga/desliga não chama a API', () => {
  it('alterna enabled sem novo pedido', async () => {
    const { result } = setup();
    act(() => { result.current.addSimulation(form()); });
    await settle();
    const calls = fetcher.mock.calls.length;
    const id = result.current.simulations[0].id;
    act(() => { result.current.toggleSimulation(id); });
    await settle(2000);
    expect(result.current.simulations[0].enabled).toBe(false);
    expect(fetcher).toHaveBeenCalledTimes(calls);
    expect(result.current.loading).toBe(false);
    act(() => { result.current.toggleSimulation(id); });
    await settle(2000);
    expect(result.current.simulations[0].enabled).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(calls);
  });
});

describe('useSimulator: erro', () => {
  it('expõe a mensagem, mantém o resultado anterior e some ao mudar o pedido', async () => {
    const { result } = setup();
    await settle();
    fetcher.mockRejectedValueOnce(new Error('Impacto #1: o valor deve ser maior que zero.'));
    act(() => { result.current.addSimulation(form()); });
    await settle();
    expect(result.current.error).toBe('Impacto #1: o valor deve ser maior que zero.');
    expect(result.current.result.tag).toBe('a');
    expect(result.current.loading).toBe(false);
    act(() => { result.current.setMonths(3); });
    expect(result.current.error).toBeNull();
  });

  it('retry tenta de novo o mesmo pedido', async () => {
    fetcher.mockRejectedValueOnce(new Error('falhou'));
    const { result } = setup();
    await settle();
    expect(result.current.error).toBe('falhou');
    act(() => { result.current.retry(); });
    await settle();
    expect(result.current.error).toBeNull();
    expect(result.current.result.tag).toBe('a');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('erro sem mensagem usa o texto padrão', async () => {
    fetcher.mockRejectedValueOnce({});
    const { result } = setup();
    await settle();
    expect(result.current.error).toMatch(/Não foi possível/);
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
