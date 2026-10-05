import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

vi.mock('../../../../data/repositories/cardRepository', () => ({
  getStatement: vi.fn(),
}));

import * as cardRepo from '../../../../data/repositories/cardRepository';
import CardDetail from '../CardDetail';

afterEach(cleanup);

const card = { id: 'c1', name: 'Nubank', closingDay: 20, dueDay: 28 };
const statementOf = (status, reviewed = false) => ({
  statementId: 's1',
  status,
  transactions: [{
    id: 't1', description: 'NuTag', amount: 10, date: '2026-09-02',
    transactionType: 'Expense', paymentMethod: 'CreditCard', reviewed,
  }],
});

const renderDetail = (props = {}) => render(
  <CardDetail
    card={card} categories={[]} members={[]} accounts={[]} cards={[card]}
    activeMonth="2026-09" {...props}
  />,
);

describe('CardDetail review buttons', () => {
  beforeEach(() => { cardRepo.getStatement.mockReset(); });

  it('review-all calls onReviewStatement with true and refetches', async () => {
    cardRepo.getStatement.mockResolvedValue(statementOf('Open'));
    const onReviewStatement = vi.fn().mockResolvedValue();
    renderDetail({ onReviewStatement });
    await waitFor(() => expect(screen.getByTitle(/Revisar todos/).disabled).toBe(false));
    fireEvent.click(screen.getByTitle(/Revisar todos/));
    await waitFor(() => expect(onReviewStatement).toHaveBeenCalledWith('c1', 's1', true));
    await waitFor(() => expect(cardRepo.getStatement).toHaveBeenCalledTimes(2));
  });

  it('unreview-all calls onReviewStatement with false', async () => {
    cardRepo.getStatement.mockResolvedValue(statementOf('Open', true));
    const onReviewStatement = vi.fn().mockResolvedValue();
    renderDetail({ onReviewStatement });
    await waitFor(() => expect(screen.getByTitle(/Desmarcar revisão de todos/).disabled).toBe(false));
    fireEvent.click(screen.getByTitle(/Desmarcar revisão de todos/));
    await waitFor(() => expect(onReviewStatement).toHaveBeenCalledWith('c1', 's1', false));
  });

  it('stays enabled on a paid statement, and the row action too', async () => {
    cardRepo.getStatement.mockResolvedValue(statementOf('Paid'));
    renderDetail({ onReviewStatement: vi.fn(), onToggleReviewed: vi.fn() });
    await waitFor(() => expect(screen.getByTitle(/Revisar todos/).disabled).toBe(false));
    expect(screen.getByLabelText('Marcar como revisado').disabled).toBe(false);
  });

  it('row toggle calls onToggleReviewed and refetches', async () => {
    cardRepo.getStatement.mockResolvedValue(statementOf('Open'));
    const onToggleReviewed = vi.fn().mockResolvedValue();
    renderDetail({ onToggleReviewed });
    const btn = await screen.findByLabelText('Marcar como revisado');
    fireEvent.click(btn);
    await waitFor(() => expect(onToggleReviewed).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(cardRepo.getStatement).toHaveBeenCalledTimes(2));
  });
});
