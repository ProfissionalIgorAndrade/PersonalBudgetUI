import { describe, it, expect } from 'vitest';
import { normalizeTransaction } from '../mappers/index';

// Requirement: a savings movement must not appear on, or influence, any
// screen except Cofrinho. The type is what carries that, so it is worth
// pinning from both sides.
const savingsIn  = { id: '1', paymentMethod: 'Savings',  type: 'Income',  amount: 350, date: '2026-09-20' };
const savingsOut = { id: '2', paymentMethod: 'Savings',  type: 'Expense', amount: 150, date: '2026-09-21' };
const expense    = { id: '3', paymentMethod: 'Account',  type: 'Expense', amount: 99,  date: '2026-09-01' };
const transfer   = { id: '4', paymentMethod: 'Transfer', type: 'Expense', amount: 50,  date: '2026-09-01' };

const split = (rows) => {
  const all = rows.map(normalizeTransaction);
  return {
    general: all.filter(t => t.type !== 'savings'),
    savings: all.filter(t => t.type === 'savings'),
  };
};

describe('savings movements are isolated', () => {
  it('never carry the income or expense type', () => {
    expect(normalizeTransaction(savingsIn).type).toBe('savings');
    expect(normalizeTransaction(savingsOut).type).toBe('savings');
  });

  it('keep their direction for the box statement', () => {
    expect(normalizeTransaction(savingsIn).savingsDirection).toBe('in');
    expect(normalizeTransaction(savingsOut).savingsDirection).toBe('out');
  });

  it('are removed from the general list', () => {
    const { general } = split([savingsIn, savingsOut, expense, transfer]);
    expect(general.map(t => t.id)).toEqual(['3', '4']);
  });

  it('are the only thing in the savings list', () => {
    const { savings } = split([savingsIn, savingsOut, expense, transfer]);
    expect(savings.map(t => t.id)).toEqual(['1', '2']);
  });

  it('cannot reach an income or expense total', () => {
    const { general } = split([savingsIn, savingsOut, expense]);
    const income  = general.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const outflow = general.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    expect(income).toBe(0);
    expect(outflow).toBe(99);
  });

  it('leaves ordinary transactions and transfers untouched', () => {
    expect(normalizeTransaction(expense).type).toBe('expense');
    expect(normalizeTransaction(transfer).type).toBe('transfer');
    expect(normalizeTransaction(expense).savingsDirection).toBeNull();
  });
});
