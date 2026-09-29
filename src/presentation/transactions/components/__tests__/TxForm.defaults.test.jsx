import { describe, it, expect } from 'vitest';
import { buildCreateTransactionPayload } from '../../../../application/createTransactionPayload';

const draft = {
  type: 'expense', description: 'Aluguel', date: '2026-09-05',
  accountId: 'a1', cardId: '', amount: 4500, categoryId: 'c1', memberId: 'm1',
  recurrence: 'variable',
};

describe('new transactions payload', () => {
  it('builds a valid account expense payload', () => {
    const body = buildCreateTransactionPayload(draft);
    expect(body.type).toBe('Expense');
    expect(body.frequency).toBe('Variable');
    expect(body.amount).toBe(4500);
  });

  it('builds a valid income payload', () => {
    const body = buildCreateTransactionPayload({ ...draft, type: 'income' });
    expect(body.type).toBe('Income');
  });

  it('builds a valid card transaction payload', () => {
    const card = { ...draft, accountId: '', cardId: 'cc1', statementMonth: 9, statementYear: 2026 };
    const body = buildCreateTransactionPayload(card);
    expect(body.creditCardId).toBe('cc1');
    expect(body.statementMonth).toBe(9);
    expect(body.statementYear).toBe(2026);
  });

  it('does not send status or autoComplete fields', () => {
    const body = buildCreateTransactionPayload(draft);
    expect(body).not.toHaveProperty('status');
    expect(body).not.toHaveProperty('autoComplete');
  });
});
