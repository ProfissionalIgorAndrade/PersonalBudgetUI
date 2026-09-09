import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import React from 'react';
import TxForm from '../TxForm';

afterEach(cleanup);

const props = {
  cats: [{ id: 'c1', name: 'Moradia', icon: '🏠', type: 'expense' }],
  members: [{ id: 'm1', name: 'Igor', emoji: '🧑' }],
  accounts: [{ id: 'a1', name: 'Nubank', type: 'checking' }],
  cards: [{ id: 'cc1', name: 'Inter Black', lastDigits: '4417' }],
  onSave: () => {},
  onClose: () => {},
};

const statusSelect = (container) =>
  [...container.querySelectorAll('select')].find(s =>
    [...s.options].some(o => o.value === 'pending') &&
    [...s.options].some(o => o.value === 'paid'));

describe('TxForm defaults', () => {
  it('opens a new transaction with status pending', () => {
    const { container } = render(<TxForm {...props} />);
    expect(statusSelect(container).value).toBe('pending');
  });

  it('still opens pending after switching the type', () => {
    const { container } = render(<TxForm {...props} />);
    const typeSelect = [...container.querySelectorAll('select')]
      .find(s => [...s.options].some(o => o.value === 'income'));
    fireEvent.change(typeSelect, { target: { value: 'income' } });
    expect(statusSelect(container).value).toBe('pending');
  });

  it('keeps an existing transaction on its own status when editing', () => {
    const tx = {
      id: 'aaaaaaaa-1111-2222-3333-444444444444',
      description: 'Aluguel', amount: 4739.53, date: '2026-07-08',
      type: 'expense', status: 'paid', recurrence: 'fixed',
      categoryId: 'c1', memberId: 'm1', accountId: 'a1', cardId: '',
      paymentMethod: 'Account', notes: '',
    };
    const { container } = render(<TxForm {...props} tx={tx} />);
    expect(statusSelect(container).value).toBe('paid');
  });
});
