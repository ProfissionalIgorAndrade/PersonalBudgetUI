import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

vi.mock('../../../../data/repositories/cardRepository', () => ({
  getStatement: vi.fn(),
}));

import * as cardRepo from '../../../../data/repositories/cardRepository';
import CardDetail from '../CardDetail';

afterEach(cleanup);

const card = { id: 'c1', name: 'Nubank', dueDay: 28 };
const statementOf = (reviewed = false) => ({
  statementId: 's1',
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
    cardRepo.getStatement.mockResolvedValue(statementOf());
    const onReviewStatement = vi.fn().mockResolvedValue();
    renderDetail({ onReviewStatement });
    await waitFor(() => expect(screen.getByTitle(/Revisar todos/).disabled).toBe(false));
    fireEvent.click(screen.getByTitle(/Revisar todos/));
    await waitFor(() => expect(onReviewStatement).toHaveBeenCalledWith('c1', 's1', true));
    await waitFor(() => expect(cardRepo.getStatement).toHaveBeenCalledTimes(2));
  });

  it('unreview-all calls onReviewStatement with false', async () => {
    cardRepo.getStatement.mockResolvedValue(statementOf(true));
    const onReviewStatement = vi.fn().mockResolvedValue();
    renderDetail({ onReviewStatement });
    await waitFor(() => expect(screen.getByTitle(/Desmarcar revisão de todos/).disabled).toBe(false));
    fireEvent.click(screen.getByTitle(/Desmarcar revisão de todos/));
    await waitFor(() => expect(onReviewStatement).toHaveBeenCalledWith('c1', 's1', false));
  });

  it('row toggle calls onToggleReviewed and refetches', async () => {
    cardRepo.getStatement.mockResolvedValue(statementOf());
    const onToggleReviewed = vi.fn().mockResolvedValue();
    renderDetail({ onToggleReviewed });
    const btn = await screen.findByLabelText('Marcar como revisado');
    fireEvent.click(btn);
    await waitFor(() => expect(onToggleReviewed).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(cardRepo.getStatement).toHaveBeenCalledTimes(2));
  });

  it('shows no status banner and a neutral due-day line', async () => {
    cardRepo.getStatement.mockResolvedValue({ ...statementOf(), status: 'Paid' });
    renderDetail();
    await screen.findByText('NuTag');
    expect(screen.getByText('Vence dia 28')).toBeDefined();
    expect(screen.queryByText(/ABERTA|FECHADA|PAGA|quitada|ainda aberta/)).toBeNull();
  });

  it('keeps edit, delete and batch delete wired even when the payload says paid', async () => {
    cardRepo.getStatement.mockResolvedValue({ ...statementOf(), status: 'Paid' });
    renderDetail({ onEditTx: vi.fn(), onDeleteTx: vi.fn(), onBatchDeleteTx: vi.fn() });
    await screen.findByText('NuTag');
    expect(screen.getByTitle('Editar')).toBeDefined();
    expect(screen.getByTitle('Excluir')).toBeDefined();
  });
});
