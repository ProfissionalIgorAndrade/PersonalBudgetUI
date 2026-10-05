import { describe, it, expect } from 'vitest';
import { evaluateHealth, linear } from '../score';
import { tx, box } from './fixtures';

const income = (amount, date = '2026-06-05') => tx({ type: 'income', amount, date });
const history = (amount) => ['2026-03', '2026-04', '2026-05'].map(m => tx({ amount, date: `${m}-10` }));

describe('linear', () => {
  it('interpolates and clamps in both directions', () => {
    expect(linear(0.1, 0, 0.2, 0, 100)).toBeCloseTo(50);
    expect(linear(0.5, 0, 0.2, 0, 100)).toBe(100);
    expect(linear(-1, 0, 0.2, 0, 100)).toBe(0);
    expect(linear(0.65, 0.5, 0.8, 100, 0)).toBeCloseTo(50);
    expect(linear(NaN, 0, 1, 0, 100)).toBe(0);
  });
});

describe('evaluateHealth', () => {
  it('scores a healthy month', () => {
    const rows = [
      income(10000),
      tx({ amount: 3000, recurrence: 'fixed' }),   // 30% commitment
      tx({ amount: 5000 }),                         // result 2000 -> 20%
      ...history(8000),                              // 8000 avg; month 8000 -> stable
    ];
    const r = evaluateHealth(rows, [box({ balance: 48000 })], '2026-06');
    expect(r.pillars.map(p => p.score)).toEqual([100, 100, 100, 100]);
    expect(r.score).toBe(100);
    expect(r.level).toBe('good');
    expect(r.label).toBe('Saudável');
    expect(r.headline).toBe('Todos os pilares estão dentro das metas.');
  });

  it('writes the savings reason with the monthly gap in pt-BR', () => {
    const rows = [income(10000), tx({ amount: 9600 }), ...history(9600)];
    const savings = evaluateHealth(rows, [], '2026-06').pillars.find(p => p.id === 'savings');
    expect(savings.score).toBe(20); // 4% of 20%
    expect(savings.reason).toContain('Poupança 4%');
    expect(savings.reason).toContain('meta 20%');
    expect(savings.reason).toMatch(/faltam R\$\s1\.600,00 por mês/);
  });

  it('weights pillars 30/25/25/20', () => {
    // savings 0 (result 0), commitment 100, reserve 100, stability 100 -> 70
    const rows = [income(1000), tx({ amount: 1000 }), ...history(1000)];
    const r = evaluateHealth(rows, [box({ balance: 6000 })], '2026-06');
    expect(r.pillars.map(p => p.score)).toEqual([0, 100, 100, 100]);
    expect(r.score).toBe(70);
    expect(r.level).toBe('warning');
  });

  it('applies commitment boundaries (<=50% -> 100, >=80% -> 0)', () => {
    const at = (fixed) => evaluateHealth([income(1000), tx({ amount: fixed, recurrence: 'fixed' })], [], '2026-06')
      .pillars.find(p => p.id === 'commitment').score;
    expect(at(500)).toBe(100);
    expect(at(650)).toBe(50);
    expect(at(800)).toBe(0);
    expect(at(950)).toBe(0);
  });

  it('applies stability boundaries (<= avg -> 100, +30% -> 0)', () => {
    const at = (amount) => evaluateHealth([income(9999), tx({ amount }), ...history(1000)], [], '2026-06')
      .pillars.find(p => p.id === 'stability');
    expect(at(1000).score).toBe(100);
    expect(at(1300).score).toBe(0);
    expect(at(1150).score).toBe(50);
    expect(at(1150).reason).toContain('15% acima da média');
  });

  it('caps the verdict at Atenção when the month is negative', () => {
    // Only reserve + stability are scorable (no income): both perfect -> score 100, but result < 0.
    const rows = [tx({ amount: 1000 }), ...history(1000)];
    const r = evaluateHealth(rows, [box({ balance: 6000 })], '2026-06');
    expect(r.score).toBe(100);
    expect(r.level).toBe('warning');
    expect(r.capped).toBe(true);
    expect(r.headline).toMatch(/fechou no vermelho.*R\$\s1\.000,00/);
  });

  it('does not cap an already critical verdict', () => {
    const rows = [income(1000), tx({ amount: 2000 }), tx({ amount: 900, recurrence: 'fixed' })];
    const r = evaluateHealth(rows, [], '2026-06');
    expect(r.level).toBe('critical');
    expect(r.capped).toBe(false);
  });

  it('no income: income pillars are unknown and excluded, no NaN', () => {
    const r = evaluateHealth([tx({ amount: 500 }), ...history(500)], [box({ balance: 500 })], '2026-06');
    const byId = Object.fromEntries(r.pillars.map(p => [p.id, p]));
    expect(byId.savings.score).toBeNull();
    expect(byId.commitment.score).toBeNull();
    expect(byId.savings.reason).toMatch(/Sem receitas/);
    expect(Number.isFinite(r.score)).toBe(true);
    // reserve 1 month -> 16.67 -> 17; stability 100 ; weights 25 and 20
    expect(r.score).toBe(Math.round((17 * 25 + 100 * 20) / 45));
  });

  it('no data at all: explicit empty verdict', () => {
    const r = evaluateHealth([], [], '2026-06');
    // no boxes is a concrete 0 for reserve, so the score exists but only on that pillar
    expect(r.pillars.find(p => p.id === 'reserve').score).toBe(0);
    const empty = evaluateHealth([], [box({ balance: 100 })], '2026-06');
    expect(empty.score).toBeNull();
    expect(empty.level).toBe('unknown');
    expect(empty.label).toBe('Sem dados suficientes');
  });

  it('no savings boxes: reserve is 0 with an explicit sentence', () => {
    const r = evaluateHealth([income(1000), tx({ amount: 100 })], [], '2026-06');
    const reserve = r.pillars.find(p => p.id === 'reserve');
    expect(reserve.score).toBe(0);
    expect(reserve.reason).toMatch(/Nenhuma caixinha/);
  });

  it('only installments, zero variable spending: stays finite', () => {
    const rows = [income(2000), tx({ amount: 1900, recurrence: 'installment' })];
    const r = evaluateHealth(rows, [], '2026-06');
    expect(r.pillars.find(p => p.id === 'commitment').score).toBe(0);
    expect(Number.isFinite(r.score)).toBe(true);
  });

  it('January reads the baseline from the previous year', () => {
    const rows = [
      income(5000, '2026-01-05'), tx({ amount: 1000, date: '2026-01-10' }),
      tx({ amount: 1000, date: '2025-10-10' }), tx({ amount: 1000, date: '2025-11-10' }), tx({ amount: 1000, date: '2025-12-10' }),
    ];
    const r = evaluateHealth(rows, [box({ balance: 6000 })], '2026-01');
    expect(r.pillars.find(p => p.id === 'stability').score).toBe(100);
    expect(r.pillars.find(p => p.id === 'reserve').score).toBe(100);
  });

  it('excludes transfers and savings movements from every pillar', () => {
    const rows = [
      income(1000), tx({ amount: 200 }),
      tx({ type: 'transfer', amount: 5000 }), tx({ type: 'savings', amount: 5000 }),
      tx({ type: 'transfer', amount: 5000, recurrence: 'fixed' }),
    ];
    const r = evaluateHealth(rows, [], '2026-06');
    expect(r.summary).toMatchObject({ income: 1000, expense: 200, result: 800 });
    expect(r.pillars.find(p => p.id === 'commitment').score).toBe(100);
  });

  it('tolerates undefined inputs', () => {
    const r = evaluateHealth(undefined, undefined, '2026-06');
    expect(r.level).toBeDefined();
  });
});
