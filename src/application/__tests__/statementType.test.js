import { describe, it, expect } from 'vitest';
import { normalizeTransaction } from '../mappers/index';

// The statement DTO names the field TransactionType. The mapper only looked
// for type/Type, so every row from the card statement screen fell through to
// the 'expense' default — the same refund read Receita in Lançamentos and
// Despesa on the card.
describe('type from the statement payload', () => {
  it('reads TransactionType from a statement row', () => {
    expect(normalizeTransaction({ id: '1', transactionType: 'Income', amount: 71.85 }).type).toBe('income');
    expect(normalizeTransaction({ id: '1', TransactionType: 'Income', amount: 71.85 }).type).toBe('income');
  });

  it('still reads type from the transactions payload', () => {
    expect(normalizeTransaction({ id: '1', type: 'Income', amount: 10 }).type).toBe('income');
  });

  it('keeps expense as expense from either shape', () => {
    expect(normalizeTransaction({ id: '1', transactionType: 'Expense' }).type).toBe('expense');
    expect(normalizeTransaction({ id: '1', type: 'Expense' }).type).toBe('expense');
  });

  it('falls back to expense only when nothing is supplied', () => {
    expect(normalizeTransaction({ id: '1' }).type).toBe('expense');
  });
});
