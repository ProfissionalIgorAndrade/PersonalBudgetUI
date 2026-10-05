import { describe, it, expect } from 'vitest';
import {
  addMonths, monthRange, monthTotals, summarizeMonth, variation, monthSeries,
  averageExpense, reserveCoverage, stability, savingOpportunities, topCategories,
  parseInstallment, futurePlan, savingsGoals, averageIncome,
} from '../metrics';
import { tx, box, categories } from './fixtures';

const income = (amount, date = '2026-06-05', over = {}) => tx({ type: 'income', amount, date, ...over });

const allFinite = (obj) => JSON.stringify(obj, (k, v) => {
  if (typeof v === 'number' && !Number.isFinite(v)) throw new Error(`non-finite at ${k}`);
  return v;
});

describe('month helpers', () => {
  it('crosses the year boundary in both directions', () => {
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(addMonths('2025-12', 1)).toBe('2026-01');
    expect(addMonths('2026-03', -14)).toBe('2025-01');
  });

  it('builds ranges ending at the given month', () => {
    expect(monthRange('2026-02', 4)).toEqual(['2025-11', '2025-12', '2026-01', '2026-02']);
  });
});

describe('monthTotals / summarizeMonth', () => {
  it('splits expense by recurrence and ignores other types', () => {
    const rows = [
      income(5000),
      tx({ amount: 1000, recurrence: 'fixed' }),
      tx({ amount: 300, recurrence: 'installment' }),
      tx({ amount: 200 }),
      tx({ amount: 999, type: 'transfer' }),
      tx({ amount: 888, type: 'savings' }),
    ];
    const t = monthTotals(rows, '2026-06');
    expect(t).toMatchObject({ income: 5000, expense: 1500, fixed: 1000, installment: 300, variable: 200, commitments: 1300 });
  });

  it('treats amount strings as numbers and garbage as zero', () => {
    const t = monthTotals([tx({ amount: '150.50' }), tx({ amount: 'abc' }), tx({ amount: undefined })], '2026-06');
    expect(t.expense).toBe(150.5);
  });

  it('computes result, savings rate and commitment rate', () => {
    const s = summarizeMonth([income(5000), tx({ amount: 1000, recurrence: 'fixed' }), tx({ amount: 3000 })], '2026-06');
    expect(s.result).toBe(1000);
    expect(s.savingsRate).toBeCloseTo(0.2);
    expect(s.commitmentRate).toBeCloseTo(0.2);
  });

  it('has null rates (not NaN/Infinity) when there is no income', () => {
    const s = summarizeMonth([tx({ amount: 400 })], '2026-06');
    expect(s.savingsRate).toBeNull();
    expect(s.commitmentRate).toBeNull();
    expect(s.result).toBe(-400);
  });

  it('is all zeros for an empty month', () => {
    const s = summarizeMonth([], '2026-06');
    expect(s).toMatchObject({ income: 0, expense: 0, result: 0, savingsRate: null });
  });

  it('attributes card purchases to the statement month', () => {
    const rows = [tx({ amount: 700, date: '2026-05-28', cardId: 'k1', statementMonth: 6, statementYear: 2026 })];
    expect(monthTotals(rows, '2026-06').expense).toBe(700);
    expect(monthTotals(rows, '2026-05').expense).toBe(0);
  });
});

describe('variation', () => {
  it('returns abs and pct', () => {
    expect(variation(120, 100)).toEqual({ abs: 20, pct: 0.2 });
  });
  it('has null pct without a base', () => {
    expect(variation(50, 0)).toEqual({ abs: 50, pct: null });
    expect(variation(NaN, undefined)).toEqual({ abs: 0, pct: null });
  });
});

describe('monthSeries', () => {
  it('spans the year boundary for January', () => {
    const rows = [income(1000, '2025-12-05'), income(2000, '2026-01-05')];
    const series = monthSeries(rows, '2026-01', 3);
    expect(series.map(s => s.key)).toEqual(['2025-11', '2025-12', '2026-01']);
    expect(series.map(s => s.income)).toEqual([0, 1000, 2000]);
    allFinite(series);
  });
});

describe('averageExpense / stability', () => {
  const rows = [
    tx({ amount: 900, date: '2026-03-10' }),
    tx({ amount: 1100, date: '2026-04-10' }),
    tx({ amount: 1000, date: '2026-05-10' }),
    tx({ amount: 1300, date: '2026-06-10' }),
  ];

  it('averages the three previous months, excluding the current one', () => {
    expect(averageExpense(rows, '2026-06')).toBe(1000);
  });

  it('ignores empty months instead of diluting the average', () => {
    expect(averageExpense([tx({ amount: 600, date: '2026-05-10' })], '2026-06')).toBe(600);
  });

  it('is null without history', () => {
    expect(averageExpense([], '2026-06')).toBeNull();
    expect(stability([tx({ amount: 10 })], '2026-06')).toBeNull();
  });

  it('computes the ratio against the average', () => {
    expect(stability(rows, '2026-06')).toEqual({ expense: 1300, average: 1000, ratio: 1.3 });
  });

  it('reads January against Oct-Dec of the previous year', () => {
    const jan = [
      tx({ amount: 100, date: '2025-10-10' }), tx({ amount: 200, date: '2025-11-10' }),
      tx({ amount: 300, date: '2025-12-10' }), tx({ amount: 400, date: '2026-01-10' }),
    ];
    expect(averageExpense(jan, '2026-01')).toBe(200);
  });
});

describe('reserveCoverage', () => {
  it('sums ALL savings boxes and divides by the average expense', () => {
    const r = reserveCoverage([box({ balance: 3000 }), box({ balance: 3000 }), { kind: 'checking', balance: 99999 }], 1000);
    expect(r).toMatchObject({ state: 'ok', total: 6000, months: 6, boxes: 2 });
  });
  it('reports no boxes explicitly', () => {
    expect(reserveCoverage([{ kind: 'checking', balance: 5 }], 1000)).toMatchObject({ state: 'no-boxes', months: null });
    expect(reserveCoverage(undefined, 1000).state).toBe('no-boxes');
  });
  it('reports no expense base without dividing by zero', () => {
    expect(reserveCoverage([box({ balance: 500 })], null)).toMatchObject({ state: 'no-expense', total: 500, months: null });
    expect(reserveCoverage([box({ balance: 500 })], 0).months).toBeNull();
  });
  it('accepts string balances', () => {
    expect(reserveCoverage([box({ balance: '2000' })], 1000).months).toBe(2);
  });
});

describe('savingOpportunities', () => {
  const hist = (cat, [a, b, c], cur, rec = 'variable') => [
    tx({ categoryId: cat, amount: a, date: '2026-03-10', recurrence: rec }),
    tx({ categoryId: cat, amount: b, date: '2026-04-10', recurrence: rec }),
    tx({ categoryId: cat, amount: c, date: '2026-05-10', recurrence: rec }),
    tx({ categoryId: cat, amount: cur, date: '2026-06-10', recurrence: rec }),
  ];

  it('lists categories >= 20% above the 3-month average, by excess desc', () => {
    const rows = [
      ...hist('c-mercado', [500, 500, 500], 650),   // +150 (30%)
      ...hist('c-lazer', [100, 100, 100], 160),     // +60  (60%)
      ...hist('c-moradia', [1000, 1000, 1000], 1100), // +10% -> out
    ];
    const r = savingOpportunities(rows, categories, '2026-06');
    expect(r.mode).toBe('excess');
    expect(r.items.map(i => i.id)).toEqual(['c-mercado', 'c-lazer']);
    expect(r.items[0]).toMatchObject({ average: 500, excess: 150 });
    expect(r.items[0].excessPct).toBeCloseTo(0.3);
  });

  it('uses divisor 3 even when only one previous month has spending', () => {
    // average = 300/3 = 100; current 130 is +30%
    const rows = [tx({ categoryId: 'c-lazer', amount: 300, date: '2026-05-10' }), tx({ categoryId: 'c-lazer', amount: 130 })];
    const r = savingOpportunities(rows, categories, '2026-06');
    expect(r.mode).toBe('excess');
    expect(r.items[0].average).toBe(100);
  });

  it('is inclusive at exactly +20%', () => {
    const r = savingOpportunities(hist('c-lazer', [100, 100, 100], 120), categories, '2026-06');
    expect(r.mode).toBe('excess');
  });

  it('caps the list at five', () => {
    const cats = Array.from({ length: 7 }, (_, i) => ({ id: `x${i}`, name: `X${i}` }));
    const rows = cats.flatMap((c, i) => hist(c.id, [100, 100, 100], 200 + i));
    expect(savingOpportunities(rows, cats, '2026-06').items).toHaveLength(5);
  });

  it('falls back to top variable categories when nothing exceeds', () => {
    const rows = [
      ...hist('c-mercado', [500, 500, 500], 480),
      ...hist('c-lazer', [100, 100, 100], 90),
      ...hist('c-moradia', [1000, 1000, 1000], 1000, 'fixed'),
    ];
    const r = savingOpportunities(rows, categories, '2026-06');
    expect(r.mode).toBe('top-variable');
    expect(r.items.map(i => i.id)).toEqual(['c-mercado', 'c-lazer']);
  });

  it('is an empty fallback for an empty month', () => {
    expect(savingOpportunities([], categories, '2026-06')).toEqual({ mode: 'top-variable', items: [] });
  });

  it('labels unknown categories', () => {
    const r = savingOpportunities([tx({ categoryId: 'gone', amount: 10 })], categories, '2026-06');
    expect(r.items[0].name).toBe('Sem categoria');
  });
});

describe('topCategories', () => {
  it('ranks by value with share of total', () => {
    const rows = [tx({ categoryId: 'c-lazer', amount: 300 }), tx({ categoryId: 'c-mercado', amount: 100 })];
    const r = topCategories(rows, categories, '2026-06');
    expect(r.map(c => c.id)).toEqual(['c-lazer', 'c-mercado']);
    expect(r[0].share).toBeCloseTo(0.75);
  });
});

describe('parseInstallment', () => {
  it('parses the trailing (n/total) suffix', () => {
    expect(parseInstallment('Notebook (4/12)')).toEqual({ current: 4, total: 12 });
    expect(parseInstallment('Notebook')).toBeNull();
    expect(parseInstallment(undefined)).toBeNull();
  });
});

describe('futurePlan', () => {
  it('shows the first month in which commitments fall below the current month', () => {
    const rows = [
      income(5000, '2026-04-05'), income(5000, '2026-05-05'), income(5000, '2026-06-05'),
      // current month: fixed 1000 + installment 500
      tx({ amount: 1000, recurrence: 'fixed', date: '2026-06-10' }),
      tx({ amount: 500, recurrence: 'installment', date: '2026-06-12' }),
      // future: installment ends after August
      tx({ amount: 1000, recurrence: 'fixed', date: '2026-07-10' }),
      tx({ amount: 500, recurrence: 'installment', date: '2026-07-12' }),
      tx({ amount: 1000, recurrence: 'fixed', date: '2026-08-10' }),
      tx({ amount: 500, recurrence: 'installment', date: '2026-08-12' }),
      tx({ amount: 1000, recurrence: 'fixed', date: '2026-09-10' }),
      tx({ amount: 700, recurrence: 'variable', date: '2026-09-11' }),
    ];
    const p = futurePlan(rows, '2026-06');
    expect(p.income).toBe(5000);
    expect(p.base).toBe(1500);
    expect(p.months).toHaveLength(6);
    expect(p.months[0]).toMatchObject({ key: '2026-07', total: 1500, free: 3500 });
    expect(p.relief).toEqual({ key: '2026-09', freed: 500 });
  });

  it('has no relief when nothing drops and no income yields null free', () => {
    const rows = [tx({ amount: 100, recurrence: 'fixed', date: '2026-06-10' }), tx({ amount: 100, recurrence: 'fixed', date: '2026-07-10' })];
    const p = futurePlan(rows, '2026-06');
    expect(p.income).toBeNull();
    expect(p.months[0].free).toBeNull();
    expect(p.relief).toEqual({ key: '2026-08', freed: 100 });
  });

  it('projects across the year boundary and stays finite when only installments exist', () => {
    const rows = [tx({ amount: 250, recurrence: 'installment', date: '2026-12-10' }), tx({ amount: 250, recurrence: 'installment', date: '2027-01-10' })];
    const p = futurePlan(rows, '2026-12');
    expect(p.months[0]).toMatchObject({ key: '2027-01', installment: 250, total: 250 });
    expect(p.months[1].key).toBe('2027-02');
    allFinite(p);
  });
});

describe('averageIncome', () => {
  it('is null without income', () => expect(averageIncome([], '2026-06')).toBeNull());
});

describe('savingsGoals', () => {
  it('lists only boxes with a goal, with remaining amount', () => {
    const r = savingsGoals([
      box({ id: 'a', balance: 250, savingsGoal: 1000 }),
      box({ id: 'b', balance: 50 }),
      box({ id: 'c', balance: 1200, savingsGoal: 1000 }),
    ]);
    expect(r.map(g => g.id)).toEqual(['a', 'c']);
    expect(r[0]).toMatchObject({ pct: 25, remaining: 750 });
    expect(r[1]).toMatchObject({ pct: 100, remaining: 0 });
  });
});
