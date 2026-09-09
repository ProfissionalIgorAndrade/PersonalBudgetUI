import { describe, it, expect } from 'vitest';
import { validateCreateTransactionDraft } from '../createTransactionPayload';

const expense = {
  type: 'expense', description: 'Mercado', date: '2026-09-01',
  accountId: 'a1', amount: 120, recurrence: 'variable', categoryId: 'c1',
};

describe('category is required before submitting', () => {
  it('rejects an expense with no category', () => {
    expect(validateCreateTransactionDraft({ ...expense, categoryId: '' }))
      .toContain('Selecione uma categoria.');
  });

  it('rejects whitespace as a category', () => {
    expect(validateCreateTransactionDraft({ ...expense, categoryId: '   ' }))
      .toContain('Selecione uma categoria.');
  });

  it('accepts an expense with a category', () => {
    expect(validateCreateTransactionDraft(expense)).toEqual([]);
  });

  it('accepts income with a category', () => {
    expect(validateCreateTransactionDraft({ ...expense, type: 'income' })).toEqual([]);
  });

  // Transfers resolve the system category on the server, so the field is not
  // shown and must not be demanded.
  it('does not demand a category on a transfer', () => {
    const transfer = {
      type: 'transfer', description: 'Entre contas', date: '2026-09-01',
      originAccountId: 'a1', destinationAccountId: 'a2', amount: 50, categoryId: '',
    };
    expect(validateCreateTransactionDraft(transfer)).toEqual([]);
  });
});
