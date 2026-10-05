import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import React from 'react';
import TxTable from '../TxTable';

afterEach(cleanup);

const tx = (over = {}) => ({
  id: 't1', description: 'Mercado', amount: 10, date: '2026-08-05',
  type: 'expense', recurrence: 'variable', categoryId: '', memberId: '',
  accountId: '', cardId: '', paymentMethod: 'Debit', notes: '', reviewed: false,
  ...over,
});

describe('TxTable reviewed checkbox', () => {
  it('renders a checkbox reflecting the reviewed flag', () => {
    render(<TxTable rows={[tx({ reviewed: true })]} onToggleReviewed={() => {}} />);
    expect(screen.getByLabelText('Revisado').checked).toBe(true);
  });

  it('calls onToggleReviewed with the row when clicked', () => {
    const onToggleReviewed = vi.fn();
    const row = tx();
    render(<TxTable rows={[row]} onToggleReviewed={onToggleReviewed} />);
    fireEvent.click(screen.getByLabelText('Revisado'));
    expect(onToggleReviewed).toHaveBeenCalledWith(row);
  });

  it('stays enabled when the table is read-only (no onEdit)', () => {
    render(<TxTable rows={[tx()]} onToggleReviewed={() => {}} />);
    expect(screen.getByLabelText('Revisado').disabled).toBe(false);
  });

  it('marks reviewed rows with a class', () => {
    const { container } = render(<TxTable rows={[tx({ reviewed: true })]} />);
    expect(container.querySelector('tbody tr.tx-reviewed')).not.toBeNull();
  });

  it('can be hidden and keeps header and body aligned', () => {
    const { container, rerender } = render(<TxTable rows={[tx()]} />);
    const count = () => [
      container.querySelectorAll('thead th').length,
      container.querySelectorAll('tbody tr')[0].querySelectorAll('td').length,
    ];
    const [h1, b1] = count();
    expect(h1).toBe(b1);
    rerender(<TxTable rows={[tx()]} hideCols={['reviewed']} />);
    expect(screen.queryByLabelText('Revisado')).toBeNull();
    const [h2, b2] = count();
    expect(h2).toBe(b2);
    expect(h2).toBe(h1 - 1);
  });
});
