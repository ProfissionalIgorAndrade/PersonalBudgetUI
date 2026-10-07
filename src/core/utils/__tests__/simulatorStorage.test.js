import { describe, it, expect } from 'vitest';
import {
  migrateStored, sanitizeSimulation, loadSimulations,
  SIM_STORAGE_KEY, SIM_STORAGE_VERSION, MAX_SIMULATIONS,
} from '../simulatorStorage';

// jsdom already provides localStorage; this stub only covers bare Node.
if (typeof globalThis.localStorage === 'undefined') {
  const mem = new Map();
  globalThis.localStorage = {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => { mem.set(k, String(v)); },
    removeItem: (k) => { mem.delete(k); },
    clear: () => mem.clear(),
  };
}

const legacy = (over = {}) => ({
  id: 'a1', description: 'Carro', amount: 1500, type: 'Expense', mode: 'Installment',
  startDate: '2026-03-15', installmentCount: 12, ...over,
});

describe('migrateStored: formato antigo', () => {
  it('converte startDate em startMonth, installmentCount em installments e assume PerInstallment', () => {
    const [s] = migrateStored({ name: 'Cenário', impacts: [legacy()] });
    expect(s).toEqual({
      id: 'a1', enabled: true, description: 'Carro', type: 'Expense', mode: 'Installment',
      startMonth: '2026-03', amount: 1500, amountKind: 'PerInstallment', installments: 12, months: null,
    });
  });

  it('migra impacto Single sem parcelas', () => {
    const [s] = migrateStored({ impacts: [legacy({ mode: 'Single', installmentCount: 1, type: 'Income' })] });
    expect(s.mode).toBe('Single');
    expect(s.installments).toBeNull();
    expect(s.type).toBe('Income');
    expect(s.startMonth).toBe('2026-03');
  });

  it('descarta só os itens inválidos e mantém os bons', () => {
    const list = migrateStored({
      impacts: [
        legacy({ id: 'ok' }),
        legacy({ id: 'x1', amount: 0 }),
        legacy({ id: 'x2', startDate: '' }),
        legacy({ id: 'x3', startDate: 'abc' }),
        legacy({ id: 'x4', type: 'Other' }),
        legacy({ id: 'x5', mode: 'Monthly' }),
        legacy({ id: 'x6', installmentCount: 360 }),
        legacy({ id: 'x7', description: '   ' }),
        null, 'texto', 42,
      ],
    });
    expect(list.map(s => s.id)).toEqual(['ok']);
  });
});

describe('migrateStored: formas inválidas nunca quebram', () => {
  it('devolve lista vazia para lixo', () => {
    for (const raw of [null, undefined, 5, 'x', [], {}, { impacts: 'x' }, { version: 99, simulations: [] }, { version: 2 }, { version: 2, simulations: 'x' }]) {
      expect(migrateStored(raw)).toEqual([]);
    }
  });
});

describe('migrateStored: formato atual', () => {
  const sim = (over = {}) => ({
    id: 's1', enabled: false, description: 'Aluguel', type: 'Expense', mode: 'Monthly',
    startMonth: '2026-11', amount: 800, amountKind: 'PerInstallment', installments: null, months: 6, ...over,
  });

  it('preserva o item válido, inclusive enabled=false', () => {
    const [s] = migrateStored({ version: SIM_STORAGE_VERSION, simulations: [sim()] });
    expect(s).toEqual(sim());
  });

  it('months 0 vira null (até o fim do horizonte)', () => {
    const [s] = migrateStored({ version: 2, simulations: [sim({ months: 0 })] });
    expect(s.months).toBeNull();
  });

  it('descarta duração fora de 0..120 e parcelas fora de 1..120', () => {
    const list = migrateStored({
      version: 2,
      simulations: [sim({ id: 'a', months: 121 }), sim({ id: 'b', mode: 'Installment', installments: 0 }),
        sim({ id: 'c', mode: 'Installment', installments: 120, amountKind: 'Total' })],
    });
    expect(list.map(s => s.id)).toEqual(['c']);
    expect(list[0].amountKind).toBe('Total');
  });

  it('troca ids repetidos e respeita o limite de itens', () => {
    const dup = migrateStored({ version: 2, simulations: [sim({ id: 'd' }), sim({ id: 'd' })] });
    expect(dup).toHaveLength(2);
    expect(dup[0].id === dup[1].id).toBe(false);
    const many = migrateStored({
      version: 2, simulations: Array.from({ length: MAX_SIMULATIONS + 5 }, (_, i) => sim({ id: `m${i}` })),
    });
    expect(many).toHaveLength(MAX_SIMULATIONS);
  });

  it('amountKind só vale em Installment', () => {
    const [s] = migrateStored({ version: 2, simulations: [sim({ amountKind: 'Total' })] });
    expect(s.amountKind).toBe('PerInstallment');
  });
});

describe('sanitizeSimulation', () => {
  it('rejeita valor não numérico, negativo ou infinito', () => {
    const base = { description: 'x', type: 'Income', mode: 'Single', startMonth: '2026-01' };
    expect(sanitizeSimulation({ ...base, amount: '10' })).toBeNull();
    expect(sanitizeSimulation({ ...base, amount: -1 })).toBeNull();
    expect(sanitizeSimulation({ ...base, amount: Infinity })).toBeNull();
    expect(sanitizeSimulation({ ...base, amount: 10 })).toMatchObject({ amount: 10, enabled: true });
  });
});

describe('loadSimulations', () => {
  it('lê o formato versionado guardado no navegador', () => {
    localStorage.clear();
    const [s] = migrateStored({ impacts: [legacy()] });
    localStorage.setItem(SIM_STORAGE_KEY, JSON.stringify({ version: SIM_STORAGE_VERSION, simulations: [s] }));
    expect(loadSimulations()).toEqual([s]);
  });

  it('lê e migra o valor antigo gravado no navegador', () => {
    localStorage.setItem(SIM_STORAGE_KEY, JSON.stringify({ name: 'x', impacts: [legacy()] }));
    expect(loadSimulations()[0].startMonth).toBe('2026-03');
  });

  it('JSON corrompido ou ausente vira lista vazia', () => {
    localStorage.setItem(SIM_STORAGE_KEY, '{not json');
    expect(loadSimulations()).toEqual([]);
    localStorage.clear();
    expect(loadSimulations()).toEqual([]);
  });
});
