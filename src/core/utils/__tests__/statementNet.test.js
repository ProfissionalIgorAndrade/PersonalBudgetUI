import { describe, it, expect } from 'vitest';
import { statementNet, statementRows } from '../billing';

const ex  = (amount) => ({ type: 'expense', amount });
const inc = (amount) => ({ type: 'income', amount });

describe('statementNet', () => {
  it('sums expenses', () => {
    expect(statementNet([ex(100), ex(50)])).toBe(150);
  });

  // The reported bug: a refund was filtered out entirely, so the statement
  // kept showing the full price of a purchase that had been returned.
  it('subtracts a refund instead of ignoring it', () => {
    expect(statementNet([ex(100), ex(50), inc(30)])).toBe(120);
  });

  it('can go negative when refunds exceed purchases', () => {
    expect(statementNet([ex(10), inc(30)])).toBe(-20);
  });

  it('handles an empty or malformed list without throwing', () => {
    expect(statementNet([])).toBe(0);
    expect(statementNet()).toBe(0);
    expect(statementNet([null, { type: 'expense' }])).toBe(0);
  });
});

describe('statementRows', () => {
  it('filters out null/undefined entries', () => {
    expect(statementRows([ex(1), null, inc(3)])).toHaveLength(2);
  });

  it('returns all non-null rows', () => {
    expect(statementRows([ex(1), ex(2), inc(3)])).toHaveLength(3);
  });
});
