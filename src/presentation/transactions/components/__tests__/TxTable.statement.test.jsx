import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';
import TxTable from '../TxTable';
import { txBelongsToMonth, statementLabel } from '../../../../core/utils/billing';

afterEach(cleanup);

// Mirrors the real case from the card screen: bought in August, billed in
// September, because the card closes on the 20th.
const cardTx = {
  id: 'aaaaaaaa-1111-2222-3333-444444444444',
  description: 'NuTag',
  amount: 98.1,
  date: '2026-08-18',
  type: 'expense',
  status: 'paid',
  recurrence: 'variable',
  categoryId: '', memberId: 'm1', accountId: '', cardId: 'c1',
  transferId: null, paymentMethod: 'CreditCard', recurrenceId: null,
  statementMonth: 9, statementYear: 2026,
  notes: '',
};

const accountTx = {
  ...cardTx,
  id: 'bbbbbbbb-1111-2222-3333-444444444444',
  description: 'Aluguel',
  date: '2026-08-05',
  cardId: '', accountId: 'a1', paymentMethod: 'Debit',
  statementMonth: null, statementYear: null,
};

const props = {
  rows: [cardTx, accountTx],
  categories: [],
  members: [{ id: 'm1', name: 'Igor', emoji: '🧑' }],
  accounts: [{ id: 'a1', name: 'Conta', type: 'checking' }],
  cards: [{ id: 'c1', name: 'Nubank Ultravioleta', lastDigits: '4417' }],
};

describe('statement month resolution', () => {
  it('places a card transaction in its statement month, not its purchase month', () => {
    expect(txBelongsToMonth(cardTx, '2026-09')).toBe(true);
    expect(txBelongsToMonth(cardTx, '2026-08')).toBe(false);
  });

  it('leaves non-card transactions on their own date', () => {
    expect(txBelongsToMonth(accountTx, '2026-08')).toBe(true);
    expect(txBelongsToMonth(accountTx, '2026-09')).toBe(false);
  });

  it('falls back to the date when a card transaction carries no statement', () => {
    expect(txBelongsToMonth({ ...cardTx, statementMonth: null, statementYear: null }, '2026-08')).toBe(true);
  });

  it('labels only card transactions that carry a statement', () => {
    expect(statementLabel(cardTx)).toBe('09/2026');
    expect(statementLabel(accountTx)).toBeNull();
  });
});

describe('TxTable statement column', () => {
  it('shows the statement month while keeping the purchase date', () => {
    render(<TxTable {...props} />);
    expect(screen.getByText('09/2026', { exact: false })).toBeTruthy();
    expect(screen.getByText('18/08/2026')).toBeTruthy();
  });

  it('hides the column when asked', () => {
    render(<TxTable {...props} hideCols={['statement']} />);
    expect(screen.queryByText('Fatura')).toBeNull();
  });

  it('keeps header and body cell counts aligned', () => {
    const { container } = render(<TxTable {...props} />);
    const headers = container.querySelectorAll('thead th').length;
    const firstRow = container.querySelectorAll('tbody tr')[0].querySelectorAll('td').length;
    expect(firstRow).toBe(headers);
  });

  it('stays aligned when a column is hidden', () => {
    const { container } = render(<TxTable {...props} hideCols={['statement', 'card']} />);
    const headers = container.querySelectorAll('thead th').length;
    const firstRow = container.querySelectorAll('tbody tr')[0].querySelectorAll('td').length;
    expect(firstRow).toBe(headers);
  });
});

// Regression for the reported case: an instalment dated 01/09 that belongs to
// the October statement was listed under September.
describe('October statement, September purchase date', () => {
  const octTx = {
    ...cardTx,
    id: 'cccccccc-1111-2222-3333-444444444444',
    description: 'Seguro Carro - Tokio Marine Auto (2/9)',
    date: '2026-09-01',
    statementMonth: 10,
    statementYear: 2026,
  };

  it('is not listed under September', () => {
    expect(txBelongsToMonth(octTx, '2026-09')).toBe(false);
  });

  it('is listed under October', () => {
    expect(txBelongsToMonth(octTx, '2026-10')).toBe(true);
  });

  it('still shows its own purchase date, not the statement date', () => {
    render(<TxTable {...props} rows={[octTx]} />);
    expect(screen.getByText('01/09/2026')).toBeTruthy();
    expect(screen.getByText('10/2026', { exact: false })).toBeTruthy();
  });
});

describe('status column is not rendered', () => {
  const onUpdateStatus = () => {};

  it('has no Status header', () => {
    render(<TxTable {...props} onUpdateStatus={onUpdateStatus} />);
    expect(screen.queryByText('Status')).toBeNull();
  });

  it('renders no status select, even when a handler is supplied', () => {
    const { container } = render(<TxTable {...props} onUpdateStatus={onUpdateStatus} />);
    const selects = [...container.querySelectorAll('select')]
      .filter(s => (s.getAttribute('aria-label') || '').startsWith('Status'));
    expect(selects).toEqual([]);
  });

  it('shows no status text either', () => {
    render(<TxTable {...props} onUpdateStatus={onUpdateStatus} />);
    for (const label of ['Pendente', 'Completo', 'Cancelado']) {
      expect(screen.queryByText(label)).toBeNull();
    }
  });

  it('keeps header and body cell counts aligned without it', () => {
    const { container } = render(<TxTable {...props} onUpdateStatus={onUpdateStatus} />);
    const headers = container.querySelectorAll('thead th').length;
    const cells = container.querySelectorAll('tbody tr')[0].querySelectorAll('td').length;
    expect(cells).toBe(headers);
  });
});
