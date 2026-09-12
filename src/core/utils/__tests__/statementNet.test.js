import { describe, it, expect } from 'vitest';
import { statementNet, statementRows } from '../billing';

const ex = (amount, status = 'pending') => ({ type: 'expense', amount, status });
const inc = (amount, status = 'pending') => ({ type: 'income', amount, status });

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

  it('leaves cancelled rows out of both sides', () => {
    expect(statementNet([ex(100), ex(999, 'cancelled'), inc(999, 'cancelled')])).toBe(100);
  });

  it('handles an empty or malformed list without throwing', () => {
    expect(statementNet([])).toBe(0);
    expect(statementNet()).toBe(0);
    expect(statementNet([null, { type: 'expense' }])).toBe(0);
  });
});

describe('statementRows', () => {
  it('drops cancelled rows only', () => {
    expect(statementRows([ex(1), ex(2, 'cancelled'), inc(3)])).toHaveLength(2);
  });
});
