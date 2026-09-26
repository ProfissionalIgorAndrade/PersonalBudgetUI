import { describe, it, expect } from 'vitest';
import { savingsMovements, netOf, savingsSeries, savingsGrowth, goalProgress } from '../savingsHistory';

const boxes = [
  { id: 'b1', balance: 2350, savingsGoal: 5000 },
  { id: 'b2', balance: 4000, savingsGoal: 5000 },
];
const tx = [
  { type: 'savings', accountId: 'b1', savingsDirection: 'in',  amount: 350, date: '2026-09-20' },
  { type: 'savings', accountId: 'b2', savingsDirection: 'in',  amount: 500, date: '2026-09-02' },
  { type: 'savings', accountId: 'b1', savingsDirection: 'out', amount: 150, date: '2026-08-10' },
  { type: 'expense', accountId: 'a1', amount: 99, date: '2026-09-01' },
  { type: 'transfer', accountId: 'a1', amount: 99, date: '2026-09-01' },
];
const today = new Date(2026, 8, 25);

describe('savingsMovements', () => {
  it('takes only savings movements', () => {
    expect(savingsMovements(tx, ['b1', 'b2'])).toHaveLength(3);
  });

  it('can be scoped to one box', () => {
    expect(savingsMovements(tx, ['b1'])).toHaveLength(2);
  });

  it('returns the most recent first', () => {
    expect(savingsMovements(tx)[0].date).toBe('2026-09-20');
  });

  it('survives empty input', () => {
    expect(savingsMovements()).toEqual([]);
  });
});

describe('netOf', () => {
  it('adds deposits and subtracts withdrawals', () => {
    expect(netOf(savingsMovements(tx, ['b1', 'b2']))).toBe(700);
  });
});

describe('savingsSeries', () => {
  // Walks back from today's balance rather than summing from zero, so boxes
  // that existed before the history did still plot correctly.
  it('ends at the current total', () => {
    const s = savingsSeries(tx, boxes, 3, today);
    expect(s[s.length - 1].total).toBe(6350);
  });

  it('undoes each month to reach the previous close', () => {
    const s = savingsSeries(tx, boxes, 3, today);
    expect(s.map(x => x.total)).toEqual([5650, 5500, 6350]);
  });

  it('never plots a negative total', () => {
    const big = [{ type: 'savings', accountId: 'b1', savingsDirection: 'in', amount: 99999, date: '2026-09-01' }];
    expect(savingsSeries(big, boxes, 3, today).every(p => p.total >= 0)).toBe(true);
  });

  it('is flat when nothing ever moved', () => {
    expect(savingsSeries([], boxes, 3, today).map(x => x.total)).toEqual([6350, 6350, 6350]);
  });
});

describe('savingsGrowth', () => {
  it('reports the change over the window', () => {
    expect(savingsGrowth(tx, boxes, 2, today).amount).toBe(700);
  });

  it('gives no percentage when the window starts at zero', () => {
    const fresh = [{ id: 'b9', balance: 500 }];
    const moves = [{ type: 'savings', accountId: 'b9', savingsDirection: 'in', amount: 500, date: '2026-09-10' }];
    expect(savingsGrowth(moves, fresh, 2, today).percent).toBeNull();
  });
});

describe('goalProgress', () => {
  it('reports progress against the goal', () => {
    expect(Math.round(goalProgress(boxes[0]))).toBe(47);
  });

  it('caps at 100 when the goal is beaten', () => {
    expect(goalProgress({ balance: 9000, savingsGoal: 5000 })).toBe(100);
  });

  it('is null without a goal', () => {
    expect(goalProgress({ balance: 100 })).toBeNull();
    expect(goalProgress({ balance: 100, savingsGoal: 0 })).toBeNull();
  });
});
