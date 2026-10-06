import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';
import TxTable from '../TxTable';

afterEach(cleanup);

const tx = (over = {}) => ({
  id: 't1', description: 'Mercado', amount: 10, date: '2026-08-05',
  type: 'expense', recurrence: 'variable', categoryId: '', memberId: 'm1',
  accountId: '', cardId: '', paymentMethod: 'Debit', notes: '', reviewed: false,
  ...over,
});

const base = {
  categories: [],
  members: [{ id: 'm1', name: 'Igor', emoji: '🧑' }],
  accounts: [{ id: 'a1', name: 'Conta Corrente', type: 'checking', memberId: 'm1' }],
  cards: [{ id: 'c1', name: 'Nubank Ultravioleta', dueDay: 7 }],
};

const originCell = (container) => {
  const headers = [...container.querySelectorAll('thead th')];
  const idx = headers.findIndex(th => th.textContent.includes('Origem'));
  return container.querySelector('tbody tr').querySelectorAll('td')[idx];
};

describe('TxTable origin column', () => {
  it('labels the column "Origem" and drops Conta, Cartão and Fatura', () => {
    const { container } = render(<TxTable {...base} rows={[tx()]} />);
    const headers = [...container.querySelectorAll('thead th')].map(th => th.textContent);
    expect(headers.filter(h => h.includes('Origem'))).toHaveLength(1);
    expect(headers.some(h => /Conta|Cartão|Fatura/.test(h))).toBe(false);
  });

  it('shows the account with the bank icon for an account transaction', () => {
    const { container } = render(<TxTable {...base} rows={[tx({ accountId: 'a1' })]} />);
    expect(originCell(container).textContent).toBe('🏦 Conta Corrente - Igor');
  });

  it('shows the card with the card icon for a card transaction', () => {
    const { container } = render(<TxTable {...base} rows={[tx({ cardId: 'c1', paymentMethod: 'CreditCard' })]} />);
    expect(originCell(container).textContent).toBe('💳 Nubank Ultravioleta');
  });

  it('prefers the card when both ids are present', () => {
    const { container } = render(<TxTable {...base} rows={[tx({ cardId: 'c1', accountId: 'a1' })]} />);
    expect(originCell(container).textContent).toBe('💳 Nubank Ultravioleta');
  });

  it('shows a dash when there is neither account nor card', () => {
    const { container } = render(<TxTable {...base} rows={[tx()]} />);
    expect(originCell(container).textContent).toBe('—');
  });

  it('can be hidden through hideCols', () => {
    const { container } = render(<TxTable {...base} rows={[tx({ accountId: 'a1' })]} hideCols={['origin']} />);
    expect(container.textContent.includes('Origem')).toBe(false);
    expect(container.textContent.includes('🏦')).toBe(false);
  });
});

describe('TxTable fixed actions layout', () => {
  const rows = [tx({ id: 'r1', notes: 'com observação' }), tx({ id: 'r2' }), tx({ id: 'r3', reviewed: true })];
  const slotsOf = (container) =>
    [...container.querySelectorAll('tbody tr')].map(r => r.querySelector('.tx-act-grid').children.length);

  it('always renders four slots per row with every action enabled', () => {
    const { container } = render(
      <TxTable {...base} rows={rows} onEdit={() => {}} onDelete={() => {}} onToggleReviewed={() => {}} />,
    );
    expect(slotsOf(container)).toEqual([4, 4, 4]);
    expect(container.querySelectorAll('.tx-act-spacer')).toHaveLength(0);
  });

  it('keeps four slots per row without onEdit, onDelete and onToggleReviewed', () => {
    const { container } = render(<TxTable {...base} rows={rows} />);
    expect(slotsOf(container)).toEqual([4, 4, 4]);
    expect(container.querySelectorAll('.tx-act-spacer')).toHaveLength(9);
    expect(screen.getAllByTitle('Detalhes')).toHaveLength(3);
  });

  it('places details in the last slot and keeps order review, edit, delete, details', () => {
    const { container } = render(
      <TxTable {...base} rows={[tx()]} onEdit={() => {}} onDelete={() => {}} onToggleReviewed={() => {}} />,
    );
    const titles = [...container.querySelector('.tx-act-grid').children].map(c => c.getAttribute('title'));
    expect(titles).toEqual(['Marcar como revisado', 'Editar', 'Excluir', 'Detalhes']);
  });

  it('keeps a spacer in the slot of the missing action, not shifting the others', () => {
    const { container } = render(<TxTable {...base} rows={[tx()]} onEdit={() => {}} />);
    const kids = [...container.querySelector('.tx-act-grid').children];
    expect(kids.map(c => c.tagName)).toEqual(['SPAN', 'BUTTON', 'SPAN', 'BUTTON']);
    expect(kids[1].getAttribute('title')).toBe('Editar');
    expect(kids[3].getAttribute('title')).toBe('Detalhes');
  });

  it('has no notes button on rows with notes', () => {
    render(<TxTable {...base} rows={rows} />);
    expect(screen.queryByTitle('Ver observações')).toBeNull();
  });
});
