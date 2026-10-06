import { describe, it, expect } from 'vitest';
import { groupMonthFlowByAccount, flowOf } from '../monthFlow';

const M = '2026-09';
const tx = (over = {}) => ({ id: Math.random(), accountId: 'a1', type: 'expense', amount: 10, date: '2026-09-10', ...over });

describe('groupMonthFlowByAccount', () => {
  it('sums income and expense per account in one pass', () => {
    const by = groupMonthFlowByAccount([
      tx({ amount: 100, type: 'income' }), tx({ amount: 30 }), tx({ amount: 20 }),
      tx({ accountId: 'a2', amount: 5, type: 'income' }),
    ], M);
    expect(flowOf(by, 'a1')).toEqual({ income: 100, expense: 50 });
    expect(flowOf(by, 'a2')).toEqual({ income: 5, expense: 0 });
  });

  it('ignores card rows, transfers and other months', () => {
    const by = groupMonthFlowByAccount([
      tx({ cardId: 'k1' }), tx({ type: 'transfer' }), tx({ date: '2026-08-31' }), tx({ amount: 7 }),
    ], M);
    expect(flowOf(by, 'a1')).toEqual({ income: 0, expense: 7 });
  });

  it('returns zeroes for accounts without movement and tolerates missing input', () => {
    expect(flowOf(groupMonthFlowByAccount(undefined, M), 'x')).toEqual({ income: 0, expense: 0 });
    expect(flowOf(groupMonthFlowByAccount([], M), 'x')).toEqual({ income: 0, expense: 0 });
  });

  it('coerces string amounts and treats missing amount as zero', () => {
    const by = groupMonthFlowByAccount([tx({ amount: '12.5' }), tx({ amount: undefined })], M);
    expect(flowOf(by, 'a1').expense).toBe(12.5);
  });
});
