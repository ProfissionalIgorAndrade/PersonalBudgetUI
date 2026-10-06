import { describe, it, expect } from 'vitest';
import {
  categoryShare, categoryTrend, byMember, incomeSources, statementTotal, cardUsage,
  latestTransactions, reviewProgress, accountBalances, fixedOfMonth, activeInstallments,
  subscriptions, rule503020, daysInMonth, spendingPace, biggestIncreases, weekdayPattern,
  balanceProjection, baseDescription,
} from '../catalog';
import { tx, box, categories } from './fixtures';

const income = (amount, date = '2026-06-05', over = {}) => tx({ type: 'income', amount, date, ...over });
const acct = (over = {}) => ({ id: `a${Math.random()}`, name: 'Conta', kind: 'checking', balance: 0, isActive: true, ...over });
const noNonFinite = (obj) => JSON.stringify(obj, (k, v) => {
  if (typeof v === 'number' && !Number.isFinite(v)) throw new Error(`non-finite at ${k}`);
  return v;
});
const M = '2026-06';

describe('empty input never yields NaN/Infinity', () => {
  it('handles undefined and empty everywhere', () => {
    const d = new Date(2026, 5, 15);
    noNonFinite([
      categoryShare([], [], M), categoryTrend([], [], M, 12), byMember([], [], M), incomeSources([], [], M),
      statementTotal([]), cardUsage(0, 0), latestTransactions([], M), reviewProgress([], [], [], M),
      accountBalances(undefined), fixedOfMonth([], [], M), activeInstallments([], M), subscriptions([], [], M),
      rule503020([], M), spendingPace([], M, d), biggestIncreases([], [], M), weekdayPattern([], M),
      balanceProjection([], [], M),
    ]);
    expect(categoryShare(undefined, undefined, M).items).toEqual([]);
  });
});

describe('categoryShare', () => {
  it('keeps the top N and folds the rest into "Outras"', () => {
    const cats = Array.from({ length: 8 }, (_, i) => ({ id: `c${i}`, name: `Cat ${i}`, icon: 'x' }));
    const rows = cats.map((c, i) => tx({ categoryId: c.id, amount: 100 * (8 - i) }));
    const s = categoryShare(rows, cats, M, 6);
    expect(s.items).toHaveLength(7);
    expect(s.items[6]).toMatchObject({ name: 'Outras', isOther: true, count: 2, value: 300 });
    expect(s.items.reduce((a, c) => a + c.share, 0)).toBeCloseTo(1);
  });

  it('adds no "Outras" when categories fit', () => {
    const s = categoryShare([tx({ amount: 10 }), tx({ amount: 30, categoryId: 'c-lazer' })], categories, M);
    expect(s.items.map(i => i.name)).toEqual(['Lazer', 'Mercado']);
  });

  it('ignores income, transfers and other months', () => {
    const s = categoryShare([income(900), tx({ type: 'transfer', amount: 50 }), tx({ date: '2026-05-10', amount: 70 })], categories, M);
    expect(s.total).toBe(0);
  });
});

describe('categoryTrend', () => {
  it('spans the year boundary and ranks by window total', () => {
    const rows = [
      tx({ amount: 100, date: '2025-12-10' }), tx({ amount: 300, date: '2026-01-10' }),
      tx({ amount: 50, categoryId: 'c-lazer', date: '2026-01-11' }),
    ];
    const t = categoryTrend(rows, categories, '2026-01', 3);
    expect(t.keys).toEqual(['2025-11', '2025-12', '2026-01']);
    expect(t.items[0].name).toBe('Mercado');
    expect(t.items[0].points.map(p => p.value)).toEqual([0, 100, 300]);
    expect(t.items[0].change).toBeCloseTo(2);
    expect(t.items[0].average).toBeCloseTo(400 / 3);
    expect(t.items[1].change).toBeNull();
  });

  it('limits the number of categories', () => {
    const cats = Array.from({ length: 8 }, (_, i) => ({ id: `c${i}`, name: `C${i}` }));
    const rows = cats.map((c, i) => tx({ categoryId: c.id, amount: i + 1 }));
    expect(categoryTrend(rows, cats, M, 3, 5).items).toHaveLength(5);
  });
});

describe('byMember / incomeSources', () => {
  const members = [{ id: 'm1', name: 'Igor', emoji: '🧑' }];
  it('groups by member with an explicit bucket for unattributed rows', () => {
    const rows = [tx({ amount: 300, memberId: 'm1' }), tx({ amount: 100, memberId: '' }), income(500, M + '-05', { memberId: 'm1' })];
    const e = byMember(rows, members, M);
    expect(e.items.map(i => [i.name, i.value])).toEqual([['Igor', 300], ['Sem membro', 100]]);
    expect(e.items[0].share).toBeCloseTo(0.75);
    expect(byMember(rows, members, M, 'income').items).toMatchObject([{ name: 'Igor', value: 500 }]);
  });

  it('falls back to the description when income has no category', () => {
    const cats = [{ id: 'c-sal', name: 'Salário', icon: '💼' }];
    const rows = [income(3000, '2026-06-05', { categoryId: 'c-sal' }), income(200, '2026-06-06', { categoryId: '', description: 'Freela' }),
      income(100, '2026-06-07', { categoryId: '', description: 'freela' })];
    const s = incomeSources(rows, cats, M);
    expect(s.items.map(i => [i.name, i.value])).toEqual([['Salário', 3000], ['Freela', 300]]);
    expect(s.total).toBe(3300);
  });

  it('folds sources beyond the limit', () => {
    const rows = Array.from({ length: 4 }, (_, i) => income(10 * (i + 1), '2026-06-05', { categoryId: '', description: `f${i}` }));
    expect(incomeSources(rows, [], M, 2).items.at(-1)).toMatchObject({ name: 'Outras', value: 30 });
  });
});

describe('statementTotal / cardUsage', () => {
  it('sums statement rows and subtracts refunds, in several payload shapes', () => {
    const list = [{ id: 1, amount: 100, type: 'Expense' }, { id: 2, amount: 30, transactionType: 'Income' }];
    expect(statementTotal(list)).toBe(70);
    expect(statementTotal({ transactions: list })).toBe(70);
    expect(statementTotal({ statement: { Transactions: list } })).toBe(70);
  });

  it('returns null for missing payloads and 0 for an empty statement', () => {
    expect(statementTotal(null)).toBeNull();
    expect(statementTotal({})).toBeNull();
    expect(statementTotal({ transactions: [] })).toBe(0);
  });

  it('computes usage levels and has null pct without a limit', () => {
    expect(cardUsage(200, 1000)).toMatchObject({ pct: 0.2, level: 'good' });
    expect(cardUsage(400, 1000).level).toBe('warning');
    expect(cardUsage(800, 1000).level).toBe('critical');
    expect(cardUsage(100, 0)).toMatchObject({ pct: null, level: 'unknown' });
    expect(cardUsage(undefined, undefined).used).toBe(0);
  });
});

describe('latestTransactions / reviewProgress', () => {
  it('orders by date desc and honours the limit', () => {
    const rows = [tx({ date: '2026-06-01' }), tx({ date: '2026-06-20' }), income(10, '2026-06-10')];
    expect(latestTransactions(rows, M, 2).map(t => t.date)).toEqual(['2026-06-20', '2026-06-10']);
  });

  it('computes % reviewed overall and per card or account, worst first', () => {
    const cards = [{ id: 'k1', name: 'Roxinho' }];
    const accounts = [{ id: 'a1', name: 'Itaú' }];
    const rows = [
      tx({ cardId: 'k1', reviewed: true }), tx({ cardId: 'k1', reviewed: false }),
      tx({ accountId: 'a1', reviewed: true }), tx({ reviewed: false }),
    ];
    const p = reviewProgress(rows, accounts, cards, M);
    expect(p).toMatchObject({ total: 4, reviewed: 2, pct: 0.5 });
    expect(p.groups.map(g => g.label)).toEqual(['Sem conta', 'Roxinho', 'Itaú']);
    expect(p.groups[2].pct).toBe(1);
  });

  it('has null pct for a month without rows', () => {
    expect(reviewProgress([], [], [], M).pct).toBeNull();
  });
});

describe('accountBalances', () => {
  it('lists only active checking accounts', () => {
    const r = accountBalances([acct({ name: 'A', balance: 100 }), acct({ name: 'B', balance: '250.5' }),
      box({ balance: 999 }), acct({ name: 'C', balance: 5, isActive: false })]);
    expect(r.items.map(i => i.name)).toEqual(['B', 'A']);
    expect(r.total).toBe(350.5);
  });
});

describe('account labels in the catalog', () => {
  const members = [{ id: 'm1', name: 'Igor' }];

  it('labels balances like accountLabel, nickname first', () => {
    const r = accountBalances([acct({ name: 'Salário', bank: 'Nubank', memberId: 'm1', balance: 1 })], members);
    expect(r.items[0].name).toBe('Salário - Igor');
  });

  it('labels review groups like accountLabel', () => {
    const p = reviewProgress([tx({ accountId: 'a1' })], [{ id: 'a1', name: 'Itaú', bank: 'Itau', memberId: 'm1' }], [], M, members);
    expect(p.groups[0].label).toBe('Itaú - Igor');
  });
});

describe('fixedOfMonth / subscriptions', () => {
  it('lists fixed expenses with total and income share', () => {
    const rows = [income(1000), tx({ recurrence: 'fixed', amount: 200, description: 'Aluguel' }), tx({ recurrence: 'fixed', amount: 50 }),
      tx({ amount: 999 }), tx({ recurrence: 'fixed', amount: 80, date: '2026-07-10' })];
    const f = fixedOfMonth(rows, categories, M);
    expect(f.total).toBe(250);
    expect(f.items[0].description).toBe('Aluguel');
    expect(f.incomeShare).toBeCloseTo(0.25);
    expect(fixedOfMonth([tx({ recurrence: 'fixed' })], categories, M).incomeShare).toBeNull();
  });

  it('matches the Assinaturas category case-insensitively and only fixed rows', () => {
    const cats = [...categories, { id: 'c-ass', name: 'ASSINATURAS e streaming' }];
    const rows = [tx({ categoryId: 'c-ass', recurrence: 'fixed', amount: 40, description: 'Netflix' }),
      tx({ categoryId: 'c-ass', amount: 15 }), tx({ recurrence: 'fixed', amount: 500 })];
    const s = subscriptions(rows, cats, M);
    expect(s).toMatchObject({ hasCategory: true, total: 40, yearly: 480 });
    expect(s.items).toHaveLength(1);
  });

  it('reports no category at all', () => {
    expect(subscriptions([tx({ recurrence: 'fixed' })], categories, M)).toMatchObject({ hasCategory: false, items: [], total: 0 });
  });
});

describe('activeInstallments', () => {
  const inst = (n, of, month, over = {}) => tx({
    recurrence: 'installment', recurrenceId: 'r1', description: `Notebook (${n}/${of})`, amount: 500,
    date: `${month}-10`, ...over,
  });

  it('computes remaining months and amount from the future rows', () => {
    const rows = [inst(1, 4, '2026-05'), inst(2, 4, '2026-06'), inst(3, 4, '2026-07'), inst(4, 4, '2026-08')];
    const r = activeInstallments(rows, M);
    expect(r.items).toHaveLength(1);
    expect(r.items[0]).toMatchObject({ name: 'Notebook', current: 2, total: 4, remainingMonths: 2, remainingAmount: 1000, lastMonth: '2026-08', inMonth: true });
    expect(r.monthly).toBe(500);
    expect(r.remaining).toBe(1000);
  });

  it('drops finished installments and handles a month with none', () => {
    const rows = [inst(1, 2, '2026-04'), inst(2, 2, '2026-05')];
    expect(activeInstallments(rows, M).items).toEqual([]);
    expect(activeInstallments([], M)).toMatchObject({ monthly: 0, remaining: 0 });
  });

  it('groups by description when there is no recurrenceId and survives the year boundary', () => {
    const rows = [inst(12, 12, '2025-12', { recurrenceId: null }), inst(1, 3, '2026-01', { recurrenceId: null, description: 'Sofá (1/3)' }),
      inst(2, 3, '2026-02', { recurrenceId: null, description: 'Sofá (2/3)' })];
    const r = activeInstallments(rows, '2026-01');
    expect(r.items.map(i => i.name)).toEqual(['Sofá']);
    expect(r.items[0].remainingMonths).toBe(1);
  });

  it('starts counting from the first future row when the month itself has none', () => {
    const r = activeInstallments([inst(1, 2, '2026-07'), inst(2, 2, '2026-08')], M);
    expect(r.items[0]).toMatchObject({ inMonth: false, remainingMonths: 2 });
    expect(r.monthly).toBe(0);
  });

  it('has null current/total when the description has no suffix', () => {
    const r = activeInstallments([tx({ recurrence: 'installment', description: 'Geladeira', amount: 100 })], M);
    expect(r.items[0]).toMatchObject({ current: null, total: null });
  });
});

describe('rule503020 (recurrence proxy)', () => {
  it('maps fixed+installment to needs, variable to wants, leftover to savings', () => {
    const rows = [income(10000), tx({ recurrence: 'fixed', amount: 4000 }), tx({ recurrence: 'installment', amount: 1000 }),
      tx({ amount: 2000 })];
    const r = rule503020(rows, M);
    const b = Object.fromEntries(r.buckets.map(x => [x.id, x]));
    expect(b.needs).toMatchObject({ value: 5000, share: 0.5, level: 'good' });
    expect(b.wants).toMatchObject({ value: 2000, level: 'good' });
    expect(b.savings).toMatchObject({ value: 3000, level: 'good' });
    expect(r.overspent).toBe(false);
  });

  it('flags overspending with zero savings and critical levels', () => {
    const r = rule503020([income(1000), tx({ recurrence: 'fixed', amount: 900 }), tx({ amount: 500 })], M);
    expect(r.overspent).toBe(true);
    expect(r.buckets.find(b => b.id === 'savings')).toMatchObject({ value: 0, level: 'critical' });
    expect(r.buckets.find(b => b.id === 'needs').level).toBe('critical');
  });

  it('is null without income', () => {
    expect(rule503020([tx({ amount: 10 })], M)).toBeNull();
  });
});

describe('spendingPace', () => {
  const rows = [
    // média dos 3 meses anteriores: 300 (dia 5) + 300 (dia 20) = 600 no mês
    ...['2026-03', '2026-04', '2026-05'].flatMap(m => [tx({ amount: 300, date: `${m}-05` }), tx({ amount: 300, date: `${m}-20` })]),
    tx({ amount: 400, date: '2026-06-04' }), tx({ amount: 100, date: '2026-06-25' }),
  ];

  it('daysInMonth handles leap years', () => {
    expect(daysInMonth('2028-02')).toBe(29);
    expect(daysInMonth('2026-02')).toBe(28);
  });

  it('compares spent so far with the expected curve on the current month', () => {
    const p = spendingPace(rows, M, new Date(2026, 5, 10));
    expect(p).toMatchObject({ state: 'ok', day: 10, spent: 400, expectedToDate: 300, closed: false, daysInMonth: 30 });
    expect(p.ratio).toBeCloseTo(4 / 3);
    expect(p.level).toBe('critical');
    expect(p.expectedTotal).toBe(600);
    expect(p.actual).toHaveLength(10);
    expect(p.expected).toHaveLength(30);
  });

  it('uses the full month for past months', () => {
    const p = spendingPace(rows, M, new Date(2026, 8, 1));
    expect(p).toMatchObject({ day: 30, spent: 500, closed: true });
    expect(p.level).toBe('good');
  });

  it('has no pace for future months', () => {
    const p = spendingPace(rows, '2026-08', new Date(2026, 5, 10));
    expect(p).toMatchObject({ state: 'future', day: 0, spent: 0, ratio: null });
    expect(p.actual).toEqual([]);
  });

  it('handles day boundaries: day 1 and last day', () => {
    expect(spendingPace(rows, M, new Date(2026, 5, 1))).toMatchObject({ day: 1, spent: 0, expectedToDate: 0, ratio: null, level: 'unknown' });
    expect(spendingPace(rows, M, new Date(2026, 5, 30))).toMatchObject({ day: 30, closed: false, spent: 500 });
  });

  it('reports no baseline instead of dividing by zero, and crosses the year boundary', () => {
    const only = [tx({ amount: 50, date: '2026-01-03' })];
    const p = spendingPace(only, '2026-01', new Date(2026, 0, 15));
    expect(p).toMatchObject({ state: 'no-baseline', spent: 50, expectedToDate: null, ratio: null, expected: [] });
    const jan = spendingPace([tx({ amount: 100, date: '2025-12-31' }), tx({ amount: 60, date: '2026-01-02' })], '2026-01', new Date(2026, 0, 31));
    expect(jan.expectedToDate).toBe(100);
    expect(jan.spent).toBe(60);
    noNonFinite(jan);
  });

  it('short baseline months repeat their final total', () => {
    const feb = [tx({ amount: 280, date: '2026-02-28' }), tx({ amount: 10, date: '2026-03-30' })];
    const p = spendingPace(feb, '2026-03', new Date(2026, 2, 31));
    expect(p.expectedToDate).toBe(280);
  });
});

describe('biggestIncreases', () => {
  it('ranks by R$ increase and ignores categories without baseline or decreases', () => {
    const rows = [
      tx({ categoryId: 'c-lazer', amount: 900 }), ...['2026-03', '2026-04', '2026-05'].map(m => tx({ categoryId: 'c-lazer', amount: 300, date: `${m}-10` })),
      tx({ categoryId: 'c-mercado', amount: 100 }), ...['2026-03', '2026-04', '2026-05'].map(m => tx({ categoryId: 'c-mercado', amount: 300, date: `${m}-10` })),
      tx({ categoryId: 'c-moradia', amount: 700 }),
    ];
    const r = biggestIncreases(rows, categories, M);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ name: 'Lazer', increase: 600, average: 300 });
    expect(r[0].increasePct).toBeCloseTo(2);
  });

  it('is empty without history', () => {
    expect(biggestIncreases([tx({ amount: 10 })], categories, M)).toEqual([]);
  });
});

describe('weekdayPattern', () => {
  it('buckets by weekday without timezone drift', () => {
    // 2026-06-07 é domingo, 2026-06-10 é quarta
    const p = weekdayPattern([tx({ amount: 10, date: '2026-06-07' }), tx({ amount: 5, date: '2026-06-07' }), tx({ amount: 20, date: '2026-06-10' }),
      income(999, '2026-06-08')], M);
    expect(p.items[0]).toMatchObject({ short: 'Dom', value: 15, count: 2 });
    expect(p.items[3]).toMatchObject({ short: 'Qua', value: 20 });
    expect(p.total).toBe(35);
    expect(p.items).toHaveLength(7);
  });
});

describe('balanceProjection', () => {
  const rows = [
    income(5000, '2026-06-05'), income(5000, '2026-05-05'), income(5000, '2026-04-05'),
    tx({ recurrence: 'fixed', amount: 3000, date: '2026-07-06' }), tx({ recurrence: 'installment', amount: 1000, date: '2026-07-07' }),
    tx({ recurrence: 'fixed', amount: 3000, date: '2026-08-06' }),
  ];

  it('accumulates (average income - posted commitments) from the current balance', () => {
    const r = balanceProjection(rows, [acct({ balance: 1000 }), box({ balance: 9999 })], M, 3);
    expect(r.state).toBe('ok');
    expect(r.start).toBe(1000);
    expect(r.income).toBe(5000);
    expect(r.months.map(m => m.key)).toEqual(['2026-07', '2026-08', '2026-09']);
    expect(r.months.map(m => m.balance)).toEqual([2000, 4000, 9000]);
    expect(r.negativeAt).toBeNull();
  });

  it('finds the first negative month', () => {
    const r = balanceProjection(rows, [acct({ balance: -6000 })], M, 3);
    expect(r.negativeAt).toBe('2026-07');
  });

  it('crosses the year boundary', () => {
    const r = balanceProjection([income(100, '2026-12-05')], [acct({ balance: 0 })], '2026-12', 2);
    expect(r.months.map(m => m.key)).toEqual(['2027-01', '2027-02']);
  });

  it('degrades to explicit states', () => {
    expect(balanceProjection(rows, [box({ balance: 1 })], M).state).toBe('no-accounts');
    expect(balanceProjection([], [acct({ balance: 10 })], M)).toMatchObject({ state: 'no-income', start: 10 });
  });
});

describe('baseDescription', () => {
  it('strips the installment suffix only at the end', () => {
    expect(baseDescription('Notebook (4/12)')).toBe('Notebook');
    expect(baseDescription('Loja (2/3) extra')).toBe('Loja (2/3) extra');
    expect(baseDescription(undefined)).toBe('');
  });
});
