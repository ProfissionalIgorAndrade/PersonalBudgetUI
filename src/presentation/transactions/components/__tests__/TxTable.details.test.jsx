import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';
import TxTable from '../TxTable';

const tx = {
  id: 'aaaaaaaa-1111-2222-3333-444444444444',
  description: 'Supermercado',
  amount: 250.5,
  date: '2027-08-25',
  type: 'expense',
  status: 'paid',
  recurrence: 'variable',
  categoryId: '', memberId: 'm1', accountId: 'a1', cardId: 'c1',
  transferId: null, paymentMethod: 'CreditCard', recurrenceId: null,
  statementMonth: 9, statementYear: 2027,
  notes: 'Compra do mês inteiro, dividida com a Ana.',
};

const props = {
  rows: [tx],
  categories: [],
  members: [{ id: 'm1', name: 'Igor', emoji: '🧑' }],
  accounts: [{ id: 'a1', name: 'Conta', type: 'checking' }],
  cards: [{ id: 'c1', name: 'Nubank', lastDigits: '4417' }],
  onEdit: () => {},
  onDelete: () => {},
};

afterEach(cleanup);

describe('TxTable — read-only details view', () => {
  it('renders without throwing', () => {
    render(<TxTable {...props} />);
    expect(screen.getByText('Supermercado')).toBeTruthy();
  });

  it('opens the details modal and shows the observations text in full', () => {
    render(<TxTable {...props} />);
    fireEvent.click(screen.getByTitle('Detalhes'));
    expect(screen.getByText('Detalhes do Lançamento')).toBeTruthy();
    const notes = screen.getByDisplayValue('Compra do mês inteiro, dividida com a Ana.');
    expect(notes).toBeTruthy();
    expect(notes.matches(':disabled')).toBe(true);
    expect(notes.closest('fieldset').disabled).toBe(true);
  });

  it('disables every input in the details modal', () => {
    const { container } = render(<TxTable {...props} />);
    fireEvent.click(screen.getByTitle('Detalhes'));
    const modal = container.querySelector('.modal');
    const controls = modal.querySelectorAll('input, select, textarea');
    expect(controls.length).toBeGreaterThan(3);
    const enabled = [...controls].filter(c => !c.matches(':disabled'));
    expect(enabled).toEqual([]);
  });

  it('has no save button in the details modal', () => {
    render(<TxTable {...props} />);
    fireEvent.click(screen.getByTitle('Detalhes'));
    expect(screen.queryByText(/Salvar/)).toBeNull();
    expect(screen.getByText('Fechar')).toBeTruthy();
  });
});
