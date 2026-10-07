import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const r = vi.hoisted(() => ({
  listSimulations: vi.fn(), createSimulation: vi.fn(), updateSimulation: vi.fn(), deleteSimulation: vi.fn(),
  deleteMySimulations: vi.fn(), importSimulations: vi.fn(),
}));
vi.mock('../../../data/repositories/simulationRepository', () => r);

import { useSimulator, HORIZONS, DEFAULT_HORIZON } from '../useSimulator';
import { SIM_STORAGE_KEY, MAX_SIMULATIONS } from '../../../core/utils/simulatorStorage';
import { enabledKey, importedKey } from '../../../core/utils/simulatorShared';

const srv = (id, over = {}) => ({
  id, description: `S${id}`, type: 'Expense', mode: 'Single', startMonth: '2026-10', amount: 10,
  amountKind: 'PerInstallment', installments: null, months: null,
  ownerUserId: 'u1', ownerName: 'Igor', isOwner: true, createdAt: '', updatedAt: '', ...over,
});
const OTHERS = srv('o1', { ownerUserId: 'u2', ownerName: 'Andreza', isOwner: false });
const form = (over = {}) => ({
  description: 'Carro', type: 'Expense', mode: 'Installment', startMonth: '2026-10',
  amount: 150, amountKind: 'PerInstallment', installments: 12, months: null, ...over,
});
const legacyStored = (n = 2) => ({
  version: 2,
  simulations: Array.from({ length: n }, (_, i) => ({
    id: `l${i}`, enabled: i === 0, description: `Antiga ${i}`, type: 'Expense', mode: 'Single', startMonth: '2026-11',
    amount: 50, amountKind: 'PerInstallment', installments: null, months: null,
  })),
});

const setup = (userId = 'u1') => renderHook(({ id }) => useSimulator({ userId: id }), { initialProps: { id: userId } });
const loaded = async (userId) => {
  const h = setup(userId);
  await waitFor(() => expect(h.result.current.loading).toBe(false));
  return h;
};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('pb_household_id', 'h1');
  Object.values(r).forEach((f) => f.mockReset());
  r.listSimulations.mockResolvedValue([srv('a'), OTHERS]);
  r.createSimulation.mockResolvedValue({ id: 'new' });
  r.updateSimulation.mockResolvedValue(null);
  r.deleteSimulation.mockResolvedValue(null);
  r.deleteMySimulations.mockResolvedValue(null);
  r.importSimulations.mockResolvedValue(null);
});
afterEach(() => { vi.restoreAllMocks(); });

describe('useSimulator: carga', () => {
  it('começa carregando, sem falso vazio, e entrega a lista do servidor ligada por padrão', async () => {
    const { result } = setup();
    expect(result.current.loading).toBe(true);
    expect(result.current.simulations).toEqual([]);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.simulations.map((s) => [s.id, s.enabled])).toEqual([['a', true], ['o1', true]]);
    expect(result.current.months).toBe(DEFAULT_HORIZON);
    expect(HORIZONS).toEqual([1, 3, 6, 12, 24]);
  });

  it('não pede nada sem lar ativo e pede assim que ele existe', async () => {
    localStorage.removeItem('pb_household_id');
    const { result, rerender } = setup();
    expect(r.listSimulations).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(true);
    localStorage.setItem('pb_household_id', 'h1');
    rerender({ id: 'u1' });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(r.listSimulations).toHaveBeenCalledTimes(1);
  });

  it('não pede nada sem sessão', () => {
    const { result } = setup(undefined);
    expect(r.listSimulations).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(true);
  });

  it('erro de carga aparece em error e retry tenta de novo', async () => {
    r.listSimulations.mockRejectedValueOnce(new Error('Falhou'));
    const { result } = await loaded();
    expect(result.current.error).toBe('Falhou');
    expect(result.current.simulations).toEqual([]);
    act(() => { result.current.retry(); });
    await waitFor(() => expect(result.current.error).toBe(''));
    expect(result.current.simulations).toHaveLength(2);
    expect(r.listSimulations).toHaveBeenCalledTimes(2);
  });

  it('recarrega ao voltar o foco da aba, sem ligar loading, e só quando visível', async () => {
    const { result } = await loaded();
    r.listSimulations.mockResolvedValueOnce([srv('a'), OTHERS, srv('o2', { isOwner: false })]);
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    expect(r.listSimulations).toHaveBeenCalledTimes(1);
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    expect(result.current.loading).toBe(false);
    await waitFor(() => expect(result.current.simulations).toHaveLength(3));
  });

  it('falha no recarregamento do foco mantém a lista atual', async () => {
    const { result } = await loaded();
    r.listSimulations.mockRejectedValueOnce(new Error('offline'));
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    await waitFor(() => expect(r.listSimulations).toHaveBeenCalledTimes(2));
    expect(result.current.error).toBe('');
    expect(result.current.simulations).toHaveLength(2);
  });
});

describe('useSimulator: liga/desliga local por usuário', () => {
  it('alternar não faz requisição e grava na chave do usuário', async () => {
    const { result } = await loaded();
    r.listSimulations.mockClear();
    act(() => { result.current.toggleSimulation('o1'); });
    expect(result.current.simulations.find((s) => s.id === 'o1').enabled).toBe(false);
    expect(JSON.parse(localStorage.getItem(enabledKey('u1')))).toEqual({ o1: false });
    Object.values(r).forEach((f) => expect(f).not.toHaveBeenCalled());
    act(() => { result.current.toggleSimulation('o1'); });
    expect(result.current.simulations.find((s) => s.id === 'o1').enabled).toBe(true);
  });

  it('lê o mapa guardado do usuário e ignora o de outro', async () => {
    localStorage.setItem(enabledKey('u1'), JSON.stringify({ a: false }));
    localStorage.setItem(enabledKey('u2'), JSON.stringify({ o1: false }));
    const { result } = await loaded('u1');
    expect(result.current.simulations.map((s) => s.enabled)).toEqual([false, true]);
  });

  it('remove do mapa os ids que não existem mais', async () => {
    localStorage.setItem(enabledKey('u1'), JSON.stringify({ a: false, gone: false }));
    await loaded();
    await waitFor(() => expect(JSON.parse(localStorage.getItem(enabledKey('u1')))).toEqual({ a: false }));
  });
});

describe('useSimulator: escrita e recarga', () => {
  it('adicionar envia o corpo normalizado e depois recarrega', async () => {
    const { result } = await loaded();
    r.listSimulations.mockClear();
    let ok;
    await act(async () => { ok = await result.current.addSimulation(form({ description: '  Carro  ', amount: 150.004 })); });
    expect(ok).toBe(true);
    expect(r.createSimulation).toHaveBeenCalledWith({
      description: 'Carro', type: 'Expense', mode: 'Installment', startMonth: '2026-10', amount: 150,
      amountKind: 'PerInstallment', installments: 12, months: null,
    });
    expect(r.listSimulations).toHaveBeenCalledTimes(1);
    expect(result.current.saving).toBe(false);
  });

  it('Mensal guarda a duração e descarta parcelas e tipo de valor', async () => {
    const { result } = await loaded();
    await act(async () => { await result.current.addSimulation(form({ mode: 'Monthly', months: 6, installments: 3, amountKind: 'Total' })); });
    expect(r.createSimulation.mock.calls[0][0]).toMatchObject({ mode: 'Monthly', months: 6, installments: null, amountKind: 'PerInstallment' });
  });

  it('saving fica ligado durante a gravação', async () => {
    const { result } = await loaded();
    let finish;
    r.createSimulation.mockReturnValueOnce(new Promise((res) => { finish = res; }));
    let p;
    act(() => { p = result.current.addSimulation(form()); });
    await waitFor(() => expect(result.current.saving).toBe(true));
    await act(async () => { finish({ id: 'n' }); await p; });
    expect(result.current.saving).toBe(false);
  });

  it('editar, remover e remover minhas chamam o repositório e recarregam', async () => {
    const { result } = await loaded();
    r.listSimulations.mockClear();
    await act(async () => { await result.current.editSimulation('a', form({ amount: 99 })); });
    expect(r.updateSimulation).toHaveBeenCalledWith('a', expect.objectContaining({ amount: 99 }));
    await act(async () => { await result.current.removeSimulation('a'); });
    expect(r.deleteSimulation).toHaveBeenCalledWith('a');
    await act(async () => { await result.current.removeMine(); });
    expect(r.deleteMySimulations).toHaveBeenCalledTimes(1);
    expect(r.listSimulations).toHaveBeenCalledTimes(3);
  });

  it('erro 400 do servidor vira actionError com a mensagem e devolve false', async () => {
    const { result } = await loaded();
    r.createSimulation.mockRejectedValueOnce(Object.assign(new Error('Simulação 1 (Carro): valor inválido.'), { status: 400 }));
    let ok;
    await act(async () => { ok = await result.current.addSimulation(form()); });
    expect(ok).toBe(false);
    expect(result.current.actionError).toBe('Simulação 1 (Carro): valor inválido.');
    expect(result.current.saving).toBe(false);
    act(() => { result.current.dismissActionError(); });
    expect(result.current.actionError).toBe('');
  });

  it('erro 403 explica que só o dono altera e recarrega para atualizar as permissões', async () => {
    const { result } = await loaded();
    r.listSimulations.mockClear();
    r.deleteSimulation.mockRejectedValueOnce(Object.assign(new Error('x'), { status: 403 }));
    await act(async () => { await result.current.removeSimulation('o1'); });
    expect(result.current.actionError).toContain('Só quem criou');
    await waitFor(() => expect(r.listSimulations).toHaveBeenCalledTimes(1));
  });

  it('dados inválidos não saem do cliente', async () => {
    const { result } = await loaded();
    let ok;
    await act(async () => { ok = await result.current.addSimulation(form({ description: 'x'.repeat(121) })); });
    expect(ok).toBe(false);
    expect(r.createSimulation).not.toHaveBeenCalled();
    expect(result.current.actionError).toBeTruthy();
  });

  it('limitReached conta só as minhas', async () => {
    r.listSimulations.mockResolvedValue(Array.from({ length: MAX_SIMULATIONS }, (_, i) => srv(`m${i}`, { isOwner: i < 49 })));
    const { result } = await loaded();
    expect(result.current.ownedCount).toBe(49);
    expect(result.current.limitReached).toBe(false);
    r.listSimulations.mockResolvedValue(Array.from({ length: MAX_SIMULATIONS }, (_, i) => srv(`m${i}`)));
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    await waitFor(() => expect(result.current.limitReached).toBe(true));
    let ok;
    await act(async () => { ok = await result.current.addSimulation(form()); });
    expect(ok).toBe(false);
    expect(r.createSimulation).not.toHaveBeenCalled();
  });

  it('trocar o horizonte não mexe nas simulações', async () => {
    const { result } = await loaded();
    const before = result.current.simulations;
    act(() => { result.current.setMonths(12); });
    expect(result.current.months).toBe(12);
    expect(result.current.simulations).toBe(before);
  });
});

describe('useSimulator: importação única', () => {
  it('não há oferta sem simulações guardadas', async () => {
    const { result } = await loaded();
    expect(result.current.legacyCount).toBe(0);
  });

  it('oferece as do navegador a quem ainda não decidiu', async () => {
    localStorage.setItem(SIM_STORAGE_KEY, JSON.stringify(legacyStored(2)));
    const { result } = await loaded();
    expect(result.current.legacyCount).toBe(2);
  });

  it('migra o formato antigo antes de oferecer', async () => {
    localStorage.setItem(SIM_STORAGE_KEY, JSON.stringify({
      name: 'Velho', impacts: [{ id: 'o1', description: 'Moto', amount: 400, type: 'Expense', mode: 'Installment', startDate: '2026-12-10', installmentCount: 10 }],
    }));
    const { result } = await loaded();
    expect(result.current.legacyCount).toBe(1);
    await act(async () => { await result.current.importLegacy(); });
    expect(r.importSimulations.mock.calls[0][0][0]).toMatchObject({ description: 'Moto', startMonth: '2026-12', installments: 10 });
  });

  it('não oferece a quem já decidiu', async () => {
    localStorage.setItem(SIM_STORAGE_KEY, JSON.stringify(legacyStored()));
    localStorage.setItem(importedKey('u1'), '1');
    const { result } = await loaded('u1');
    expect(result.current.legacyCount).toBe(0);
  });

  it('outro usuário no mesmo navegador não herda a decisão do primeiro', async () => {
    localStorage.setItem(SIM_STORAGE_KEY, JSON.stringify(legacyStored()));
    localStorage.setItem(importedKey('u1'), '1');
    const { result } = await loaded('u2');
    expect(result.current.legacyCount).toBe(2);
  });

  it('sucesso: envia sem id/enabled, marca como importado, apaga a cópia local e recarrega', async () => {
    localStorage.setItem(SIM_STORAGE_KEY, JSON.stringify(legacyStored(2)));
    const { result } = await loaded();
    r.listSimulations.mockClear();
    let ok;
    await act(async () => { ok = await result.current.importLegacy(); });
    expect(ok).toBe(true);
    const sent = r.importSimulations.mock.calls[0][0];
    expect(sent).toHaveLength(2);
    sent.forEach((s) => { expect('id' in s).toBe(false); expect('enabled' in s).toBe(false); });
    expect(localStorage.getItem(importedKey('u1'))).toBe('1');
    expect(localStorage.getItem(SIM_STORAGE_KEY)).toBeNull();
    expect(result.current.legacyCount).toBe(0);
    expect(r.listSimulations).toHaveBeenCalledTimes(1);
  });

  it('falha: mantém tudo (cópia local, sem marca) e mostra o erro', async () => {
    localStorage.setItem(SIM_STORAGE_KEY, JSON.stringify(legacyStored(2)));
    const { result } = await loaded();
    r.importSimulations.mockRejectedValueOnce(Object.assign(new Error('Limite de simulações atingido.'), { status: 400 }));
    let ok;
    await act(async () => { ok = await result.current.importLegacy(); });
    expect(ok).toBe(false);
    expect(result.current.importError).toBe('Limite de simulações atingido.');
    expect(result.current.legacyCount).toBe(2);
    expect(localStorage.getItem(SIM_STORAGE_KEY)).not.toBeNull();
    expect(localStorage.getItem(importedKey('u1'))).toBeNull();
    expect(result.current.importing).toBe(false);
  });

  it('não envia se estourar o limite de 50 por dono', async () => {
    localStorage.setItem(SIM_STORAGE_KEY, JSON.stringify(legacyStored(3)));
    r.listSimulations.mockResolvedValue(Array.from({ length: 48 }, (_, i) => srv(`m${i}`)));
    const { result } = await loaded();
    await act(async () => { await result.current.importLegacy(); });
    expect(r.importSimulations).not.toHaveBeenCalled();
    expect(result.current.importError).toContain('50');
  });

  it('"Agora não" esconde a oferta sem gravar nada; na próxima visita ela volta', async () => {
    localStorage.setItem(SIM_STORAGE_KEY, JSON.stringify(legacyStored(2)));
    const first = await loaded();
    act(() => { first.result.current.dismissImport(); });
    expect(first.result.current.legacyCount).toBe(0);
    expect(localStorage.getItem(importedKey('u1'))).toBeNull();
    expect(localStorage.getItem(SIM_STORAGE_KEY)).not.toBeNull();
    first.unmount();
    const second = await loaded();
    expect(second.result.current.legacyCount).toBe(2);
  });

  it('o hook nunca grava a lista na chave antiga', async () => {
    const { result } = await loaded();
    await act(async () => { await result.current.addSimulation(form()); });
    expect(localStorage.getItem(SIM_STORAGE_KEY)).toBeNull();
  });
});
