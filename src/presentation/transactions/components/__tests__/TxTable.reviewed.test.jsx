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

describe('TxTable reviewed action', () => {
  it('shows the green "mark" button for an unreviewed row', () => {
    render(<TxTable rows={[tx()]} onToggleReviewed={() => {}} />);
    const btn = screen.getByLabelText('Marcar como revisado');
    expect(btn.getAttribute('aria-pressed')).toBe('false');
    expect(btn.classList.contains('review-on')).toBe(true);
  });

  it('shows the red "unmark" button for a reviewed row', () => {
    render(<TxTable rows={[tx({ reviewed: true })]} onToggleReviewed={() => {}} />);
    const btn = screen.getByLabelText('Desmarcar revisão');
    expect(btn.getAttribute('aria-pressed')).toBe('true');
    expect(btn.classList.contains('review-off')).toBe(true);
  });

  it('calls onToggleReviewed with the row when clicked', () => {
    const onToggleReviewed = vi.fn();
    const row = tx();
    render(<TxTable rows={[row]} onToggleReviewed={onToggleReviewed} />);
    fireEvent.click(screen.getByLabelText('Marcar como revisado'));
    expect(onToggleReviewed).toHaveBeenCalledWith(row);
  });

  it('stays enabled when the table is read-only (no onEdit)', () => {
    render(<TxTable rows={[tx()]} onToggleReviewed={() => {}} />);
    expect(screen.getByLabelText('Marcar como revisado').disabled).toBe(false);
  });

  it('does not render the button without onToggleReviewed', () => {
    render(<TxTable rows={[tx()]} />);
    expect(screen.queryByLabelText('Marcar como revisado')).toBeNull();
    expect(screen.queryByLabelText('Desmarcar revisão')).toBeNull();
  });

  it('marks reviewed rows with a class and a text badge', () => {
    const { container } = render(<TxTable rows={[tx({ reviewed: true })]} />);
    expect(container.querySelector('tbody tr.tx-reviewed')).not.toBeNull();
    expect(screen.getByText('✓ revisado')).toBeTruthy();
  });

  it('has no dedicated reviewed column and keeps header and body aligned', () => {
    const { container } = render(<TxTable rows={[tx()]} onToggleReviewed={() => {}} />);
    expect(container.querySelector('thead th[title="Revisado"]')).toBeNull();
    expect(container.querySelectorAll('thead th').length)
      .toBe(container.querySelectorAll('tbody tr')[0].querySelectorAll('td').length);
  });

  it('keeps the review slot (spacer) when the action is absent, with the same slot count', () => {
    const { container: withBtn } = render(<TxTable rows={[tx()]} onToggleReviewed={() => {}} />);
    const withCount = withBtn.querySelector('.tx-actions').children.length;
    cleanup();
    const { container: without } = render(<TxTable rows={[tx()]} />);
    expect(without.querySelector('.tx-actions').children.length).toBe(withCount);
  });
});
