import { describe, it, expect } from 'vitest';
import { statementTotalsByCard } from '../cardTotals';

const tx = (over) => ({ type: 'expense', amount: 10, date: '2026-09-02', cardId: 'c1', ...over });

describe('statementTotalsByCard', () => {
  it('sums each card in one pass, subtracting refunds', () => {
    const totals = statementTotalsByCard([
      tx({ amount: 100 }),
      tx({ amount: 30, type: 'income' }),
      tx({ cardId: 'c2', amount: 50 }),
    ], '2026-09');
    expect(totals.get('c1')).toBe(70);
    expect(totals.get('c2')).toBe(50);
  });

  it('uses the statement month, not the purchase date, for card rows', () => {
    const totals = statementTotalsByCard([
      tx({ date: '2026-08-18', statementMonth: 9, statementYear: 2026, amount: 40 }),
      tx({ date: '2026-09-02', statementMonth: 10, statementYear: 2026, amount: 99 }),
    ], '2026-09');
    expect(totals.get('c1')).toBe(40);
  });

  it('ignores rows without a card and cards without rows in the month', () => {
    const totals = statementTotalsByCard([
      tx({ cardId: '', amount: 5 }),
      tx({ cardId: undefined, amount: 5 }),
      tx({ cardId: 'c3', date: '2026-07-01', amount: 5 }),
    ], '2026-09');
    expect(totals.size).toBe(0);
    expect(totals.get('c3') ?? 0).toBe(0);
  });

  it('handles an empty or missing list', () => {
    expect(statementTotalsByCard([], '2026-09').size).toBe(0);
    expect(statementTotalsByCard(undefined, '2026-09').size).toBe(0);
  });
});
