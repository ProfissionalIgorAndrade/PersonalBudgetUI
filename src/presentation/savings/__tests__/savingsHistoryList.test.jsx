import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';
import SavingsView from '../SavingsView';
import SavingsMovements from '../components/SavingsMovements';

vi.mock('../components/SavingsEvolution', () => ({ default: () => <div data-testid="evolution" /> }));

afterEach(cleanup);

const mv = (id, date, extra = {}) => ({ id, type: 'savings', accountId: 'b1', savingsDirection: 'in', amount: 10, date, ...extra });
const created = { id: 'e1', kind: 'created', accountId: 'b1', boxName: 'Reserva', reason: null, amount: 0, date: '2026-09-01' };
const deleted = {
  id: 'e2', kind: 'deleted', accountId: 'b9', boxName: 'Viagem', reason: 'objetivo concluído',
  amount: 350, destinationAccountId: 'b1', destinationName: 'Reserva', date: '2026-09-15',
};
const nameOf = (id) => (id === 'b1' ? 'Reserva' : 'Caixinha excluída');

describe('Histórico', () => {
  it('titles the card Histórico', () => {
    render(<SavingsMovements movements={[]} events={[]} boxNameOf={nameOf} />);
    expect(screen.getByText('Histórico')).toBeTruthy();
    expect(screen.queryByText('Últimas movimentações')).toBeNull();
  });

  it('merges movements and events newest first', () => {
    const { container } = render(<SavingsMovements
      movements={[mv('m1', '2026-09-20'), mv('m2', '2026-09-05')]}
      events={[created, deleted]} boxNameOf={nameOf} />);
    const text = container.textContent;
    const order = ['20/09', '15/09', '05/09', '01/09'].map(d => text.indexOf(d));
    expect(order.every(i => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it('renders the creation row', () => {
    render(<SavingsMovements movements={[]} events={[created]} boxNameOf={nameOf} />);
    expect(screen.getByText('Caixinha criada · Reserva')).toBeTruthy();
  });

  it('renders the deletion row with reason and destination', () => {
    const { container } = render(<SavingsMovements movements={[]} events={[deleted]} boxNameOf={nameOf} />);
    expect(screen.getByText('Caixinha excluída · Viagem')).toBeTruthy();
    expect(container.textContent).toMatch(/15\/09\s*·\s*objetivo concluído/);
    expect(container.textContent).toMatch(/R\$\s*350,00\s*→\s*Reserva/);
  });

  it('omits the destination line when the box had no balance', () => {
    const { container } = render(<SavingsMovements movements={[]}
      events={[{ ...deleted, amount: 0, destinationAccountId: null, destinationName: null }]} boxNameOf={nameOf} />);
    expect(container.textContent).not.toMatch(/→/);
  });

  it('counts movements and events in the total', () => {
    render(<SavingsMovements limit={2}
      movements={[mv('m1', '2026-09-20'), mv('m2', '2026-09-05')]}
      events={[created, deleted]} boxNameOf={nameOf} />);
    expect(screen.getByText('4 no total')).toBeTruthy();
  });

  it('keeps the exact empty-state text', () => {
    const { container } = render(<SavingsMovements movements={[]} events={[]} boxNameOf={nameOf} />);
    expect(container.textContent).toContain(
      'Nenhum registro ainda. O histórico começa na criação de uma caixinha ou no primeiro depósito ou resgate.');
  });
});

describe('Histórico on the Cofrinho screen', () => {
  const conta = { id: 'a1', kind: 'checking', bank: 'Nubank', balance: 0, memberId: 'm1', isActive: true };
  const reserva = { id: 'b1', kind: 'savings', parentAccountId: 'a1', name: 'Reserva', balance: 4350, isActive: true };
  const props = { accounts: [conta, reserva], members: [{ id: 'm1', name: 'Igor' }], onCreateBox() {}, onRenameBox() {}, onSetGoal() {}, onMove() {} };

  it('uses the recorded name for a box that is no longer among the accounts', () => {
    render(<SavingsView {...props}
      movements={[mv('m1', '2026-09-15', { accountId: 'b9', savingsDirection: 'out', amount: 350 })]}
      events={[deleted]} />);
    expect(screen.getByText('Caixinha excluída · Viagem')).toBeTruthy();
    expect(screen.getByText(/Resgate · Viagem/)).toBeTruthy();
  });

  it('leaves out movements of a box that has no account and no event', () => {
    render(<SavingsView {...props}
      movements={[mv('m1', '2026-09-15', { accountId: 'b9' })]} events={[]} />);
    // A tela só lista caixinhas que conhece, por conta ativa ou por evento.
    expect(screen.queryByText(/Depósito · /)).toBeNull();
  });

  it('keeps deleted-box movements out of the month total', () => {
    const thisMonth = new Date().toISOString().slice(0, 7);
    const { container } = render(<SavingsView {...props}
      movements={[
        mv('m1', `${thisMonth}-02`, { accountId: 'b1', amount: 350 }),
        mv('m2', `${thisMonth}-02`, { accountId: 'b9', savingsDirection: 'out', amount: 350 }),
      ]}
      events={[{ ...deleted, date: `${thisMonth}-02` }]} />);
    expect(container.textContent).toMatch(/Este mês\s*\+?\s*R\$\s*350,00/);
  });
});
