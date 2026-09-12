import { describe, it, expect } from 'vitest';
import {
  validateCreateTransactionDraft, buildCreateTransactionPayload, FIXED_WINDOW_MONTHS,
} from '../createTransactionPayload';

const rent = {
  type: 'expense', description: 'Aluguel do OXY', date: '2026-09-05',
  accountId: 'a1', cardId: '', amount: 4500, categoryId: 'c1', memberId: 'm1',
  recurrence: 'fixed', status: 'pending',
};

describe('fixed recurrence no longer asks for a month count', () => {
  it('validates without repeatCount', () => {
    expect(validateCreateTransactionDraft(rent)).toEqual([]);
  });

  it('still validates without it even if the user never saw the field', () => {
    expect(validateCreateTransactionDraft({ ...rent, repeatCount: '' })).toEqual([]);
  });

  it('sends the fixed window to the backend', () => {
    const body = buildCreateTransactionPayload(rent);
    expect(body.frequency).toBe('Fixed');
    expect(body.repeatCount).toBe(FIXED_WINDOW_MONTHS);
  });

  it('ignores a repeatCount left over in the draft', () => {
    const body = buildCreateTransactionPayload({ ...rent, repeatCount: '99' });
    expect(body.repeatCount).toBe(FIXED_WINDOW_MONTHS);
  });

  it('uses 12 months', () => {
    expect(FIXED_WINDOW_MONTHS).toBe(12);
  });

  it('leaves instalments alone — those genuinely have a count', () => {
    const body = buildCreateTransactionPayload({
      ...rent, recurrence: 'installment', accountId: '', cardId: 'cc1',
      installments: '9', installmentTitle: 'Seguro', totalInstallmentAmount: 4049.1,
      statementMonth: 9, statementYear: 2026,
    });
    expect(body.frequency).toBe('Installments');
    expect(body.installmentCount).toBe(9);
  });
});
