import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import React from 'react';
import TxForm from '../TxForm';

afterEach(cleanup);

const cats = [
  { id: 'ce', name: 'Estorno de Compra', icon: '🔁', type: 'expense' },
  { id: 'ce2', name: 'Besteira', icon: '🍔', type: 'expense' },
  { id: 'ci', name: 'Salario', icon: '💰', type: 'income' },
];
const props = {
  cats,
  members: [{ id: 'm1', name: 'Familia', emoji: '👨‍👩‍👧' }],
  accounts: [{ id: 'a1', name: 'Nubank', type: 'checking' }],
  cards: [{ id: 'cc1', name: 'Nubank Ultravioleta', memberId: 'm1' }],
  onSave: () => {},
  onClose: () => {},
};

// A card refund was saved as an expense with an expense category. Switching
// it to income must not require creating an income category first, nor drop
// the category that is already on the record.
const refund = {
  id: 'aaaaaaaa-1111-2222-3333-444444444444',
  description: 'Estorno de iFood - NuPay', amount: 86.69, date: '2026-06-27',
  type: 'expense', status: 'pending', recurrence: 'variable',
  categoryId: 'ce', memberId: 'm1', accountId: '', cardId: 'cc1',
  paymentMethod: 'CreditCard', statementMonth: 7, statementYear: 2026, notes: '',
};

// Ancorado no placeholder do campo, não nos nomes das categorias: estes
// mudam conforme o tipo, que é exatamente o que o teste exercita.
const catSelect = (container) => {
  const select = [...container.querySelectorAll('select')].find(sel =>
    [...sel.options].some(o => o.textContent.includes('Selecione')));
  if (!select) throw new Error('select de categoria não encontrado');
  return select;
};

describe('reclassifying a card refund as income', () => {
  it('keeps the already-saved category available after switching to income', () => {
    const { container } = render(<TxForm {...props} tx={refund} />);
    const typeSelect = [...container.querySelectorAll('select')]
      .find(s => [...s.options].some(o => o.value === 'income'));
    fireEvent.change(typeSelect, { target: { value: 'income' } });

    const options = [...catSelect(container).options].map(o => o.textContent);
    expect(options.some(o => o.includes('Estorno de Compra'))).toBe(true);
    expect(options.some(o => o.includes('Salario'))).toBe(true);
  });

  it('drops unrelated expense categories once the type is income', () => {
    const { container } = render(<TxForm {...props} tx={refund} />);
    const typeSelect = [...container.querySelectorAll('select')]
      .find(s => [...s.options].some(o => o.value === 'income'));
    fireEvent.change(typeSelect, { target: { value: 'income' } });

    const options = [...catSelect(container).options].map(o => o.textContent);
    expect(options.some(o => o.includes('Besteira'))).toBe(false);
  });

  it('shows only matching categories for a brand new entry', () => {
    const { container } = render(<TxForm {...props} />);
    const typeSelect = [...container.querySelectorAll('select')]
      .find(s => [...s.options].some(o => o.value === 'income'));
    fireEvent.change(typeSelect, { target: { value: 'income' } });

    const options = [...catSelect(container).options].map(o => o.textContent);
    expect(options.some(o => o.includes('Estorno de Compra'))).toBe(false);
    expect(options.some(o => o.includes('Salario'))).toBe(true);
  });
});
