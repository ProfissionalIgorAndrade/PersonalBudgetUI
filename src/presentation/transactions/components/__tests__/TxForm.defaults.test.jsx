import { describe, it, expect } from 'vitest';
import { buildCreateTransactionPayload } from '../../../../application/createTransactionPayload';

// The status select is gone from the form. What still matters is that a new
// transaction reaches the API as Pending, since nothing can change it
// afterwards any more.
const draft = {
  type: 'expense', description: 'Aluguel', date: '2026-09-05',
  accountId: 'a1', cardId: '', amount: 4500, categoryId: 'c1', memberId: 'm1',
  recurrence: 'variable', status: 'pending',
};

describe('new transactions are created pending', () => {
  it('sends Pending for an account expense', () => {
    expect(buildCreateTransactionPayload(draft).status).toBe('Pending');
  });

  it('sends Pending for income too', () => {
    expect(buildCreateTransactionPayload({ ...draft, type: 'income' }).status).toBe('Pending');
  });

  // Card transactions send no status at all: the backend forces Pending for
  // them, and sending one would be the client asserting something it does not
  // decide.
  it('leaves the status to the server for a card transaction', () => {
    const card = { ...draft, accountId: '', cardId: 'cc1', statementMonth: 9, statementYear: 2026 };
    expect(buildCreateTransactionPayload(card).status).toBeNull();
  });

  it('does not ask the API to auto-complete', () => {
    expect(buildCreateTransactionPayload(draft).autoComplete).toBe(false);
  });
});
