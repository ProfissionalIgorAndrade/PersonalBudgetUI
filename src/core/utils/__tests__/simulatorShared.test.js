import { describe, it, expect, beforeEach } from 'vitest';
import {
  enabledKey, importedKey, loadEnabledMap, saveEnabledMap, isEnabled, mergeEnabled, pruneEnabled,
  toggleEnabled, buildImportPayload, isImportDecided, markImported, clearLegacySimulations,
  simulationErrorMessage,
} from '../simulatorShared';
import { SIM_STORAGE_KEY } from '../simulatorStorage';

beforeEach(() => { localStorage.clear(); });

const list = [{ id: 'a', description: 'A' }, { id: 'b', description: 'B' }];

describe('mapa de ligadas (local, por usuário)', () => {
  it('as chaves são por usuário', () => {
    expect(enabledKey('u1')).toBe('pb_simulator_enabled:u1');
    expect(importedKey('u1')).toBe('pb_simulator_imported:u1');
  });

  it('padrão ligado, inclusive para ids desconhecidos; só false desliga', () => {
    expect(isEnabled({}, 'x')).toBe(true);
    expect(isEnabled({ x: false }, 'x')).toBe(false);
    expect(mergeEnabled(list, { b: false }).map((s) => s.enabled)).toEqual([true, false]);
  });

  it('o merge preserva os campos do servidor e não altera a lista original', () => {
    const merged = mergeEnabled([{ id: 'a', isOwner: false, ownerName: 'Andreza' }], {});
    expect(merged[0]).toEqual({ id: 'a', isOwner: false, ownerName: 'Andreza', enabled: true });
  });

  it('toggle inverte sem mutar', () => {
    const m = {};
    const off = toggleEnabled(m, 'a');
    expect(off).toEqual({ a: false });
    expect(m).toEqual({});
    expect(toggleEnabled(off, 'a')).toEqual({ a: true });
  });

  it('prune tira ids que não existem mais e devolve o mesmo objeto quando nada muda', () => {
    const same = { a: false };
    expect(pruneEnabled(same, list)).toBe(same);
    expect(pruneEnabled({ a: false, gone: false }, list)).toEqual({ a: false });
  });

  it('salva e lê por usuário; usuários não se misturam', () => {
    saveEnabledMap('u1', { a: false });
    saveEnabledMap('u2', { a: true });
    expect(loadEnabledMap('u1')).toEqual({ a: false });
    expect(loadEnabledMap('u2')).toEqual({ a: true });
    expect(loadEnabledMap('u3')).toEqual({});
    expect(loadEnabledMap(null)).toEqual({});
  });

  it('valor guardado corrompido ou de forma errada vira vazio', () => {
    localStorage.setItem(enabledKey('u1'), '{nope');
    expect(loadEnabledMap('u1')).toEqual({});
    localStorage.setItem(enabledKey('u1'), '[1,2]');
    expect(loadEnabledMap('u1')).toEqual({});
    localStorage.setItem(enabledKey('u1'), JSON.stringify({ a: false, b: 'x', c: 1 }));
    expect(loadEnabledMap('u1')).toEqual({ a: false });
  });
});

describe('importação única', () => {
  it('o payload não leva id nem enabled', () => {
    const payload = buildImportPayload([{
      id: 'x', enabled: false, description: 'Carro', type: 'Expense', mode: 'Installment', startMonth: '2026-10',
      amount: 150, amountKind: 'PerInstallment', installments: 12, months: null,
    }]);
    expect(payload).toEqual([{
      description: 'Carro', type: 'Expense', mode: 'Installment', startMonth: '2026-10',
      amount: 150, amountKind: 'PerInstallment', installments: 12, months: null,
    }]);
  });

  it('a decisão é por usuário', () => {
    expect(isImportDecided('u1')).toBe(false);
    markImported('u1');
    expect(isImportDecided('u1')).toBe(true);
    expect(isImportDecided('u2')).toBe(false);
    expect(isImportDecided(null)).toBe(true);
  });

  it('apaga só a cópia antiga', () => {
    localStorage.setItem(SIM_STORAGE_KEY, '{}');
    saveEnabledMap('u1', { a: false });
    clearLegacySimulations();
    expect(localStorage.getItem(SIM_STORAGE_KEY)).toBeNull();
    expect(loadEnabledMap('u1')).toEqual({ a: false });
  });
});

describe('simulationErrorMessage', () => {
  it('403 vira a mensagem de dono; 400 usa a do servidor; o resto, a do erro ou o padrão', () => {
    expect(simulationErrorMessage({ status: 403, message: 'x' })).toContain('Só quem criou');
    expect(simulationErrorMessage({ status: 400, message: 'Simulação 2 (Carro): valor inválido.' })).toBe('Simulação 2 (Carro): valor inválido.');
    expect(simulationErrorMessage({ status: 500, message: 'Erro 500' })).toBe('Erro 500');
    expect(simulationErrorMessage(null)).toContain('Tente novamente');
  });
});
