import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';
import SavingsView from '../SavingsView';
import { TotalCard, SummaryCard } from '../components/SavingsOverview';
import SavingsMovements from '../components/SavingsMovements';

vi.mock('../components/SavingsEvolution', () => ({
  default: ({ series, growth }) => (
    <div data-testid="evolution" data-points={series.length} data-growth={growth.amount} />
  ),
}));

afterEach(cleanup);

const members = [{ id: 'm1', name: 'Igor Andrade' }];
const conta = { id: 'a1', kind: 'checking', bank: 'Nubank', agency: '0001', accountNumber: '123456', balance: 0, memberId: 'm1', isActive: true };
const reserva = { id: 'b1', kind: 'savings', parentAccountId: 'a1', name: 'Reserva', balance: 4000, savingsGoal: 5000, isActive: true };
const viagem  = { id: 'b2', kind: 'savings', parentAccountId: 'a1', name: 'Viagem',  balance: 2350, isActive: true };

const thisMonth = new Date().toISOString().slice(0, 7);
const moves = [
  { id: 't1', type: 'savings', accountId: 'b1', savingsDirection: 'in',  amount: 500, date: `${thisMonth}-02` },
  { id: 't2', type: 'savings', accountId: 'b2', savingsDirection: 'in',  amount: 350, date: `${thisMonth}-05` },
  { id: 't3', type: 'savings', accountId: 'b1', savingsDirection: 'out', amount: 150, date: `${thisMonth}-07` },
];

const view = (props = {}) => (
  <SavingsView accounts={[conta, reserva, viagem]} members={members} movements={moves}
    onCreateBox={() => {}} onRenameBox={() => {}} onSetGoal={() => {}} onMove={() => {}} {...props} />
);

describe('Cofrinho screen', () => {
  it('leads with the total put away', () => {
    render(view());
    expect(screen.getByText('Total guardado')).toBeTruthy();
    expect(screen.getByText(/6\.350,00/)).toBeTruthy();
  });

  // The total goal is the sum of the box goals; only Reserva has one.
  it('sums the goals that exist', () => {
    const { container } = render(view());
    expect(screen.getByText('Meta total')).toBeTruthy();
    expect(container.textContent).toMatch(/Meta total\s*R\$\s*5\.000,00/);
  });

  // Only Reserva has a goal. Comparing every box's balance against it read
  // 100% while the goal was nowhere near met.
  it('measures progress only against boxes that have a goal', () => {
    const { container } = render(view());
    expect(container.textContent).toMatch(/80% da meta total/);
    expect(container.textContent).not.toMatch(/100% da meta total/);
  });

  it('nets this month, deposits minus withdrawals', () => {
    const { container } = render(view());
    // 500 + 350 - 150. The same figure also appears as the year's total, so
    // the assertion is anchored on its own label.
    expect(container.textContent).toMatch(/Este mês\s*\+?\s*R\$\s*700,00/);
  });

  it('totals the year separately', () => {
    const { container } = render(view());
    expect(container.textContent).toMatch(/Guardado este ano\s*R\$\s*700,00/);
  });

  // Part of the original layout. It reads zero because the account balance is
  // no longer maintained - honest, and the row is what was asked for.
  it('shows what is available in the source accounts', () => {
    render(view());
    expect(screen.getByText('Disponível para guardar')).toBeTruthy();
  });

  it('plots the evolution and lists the statement', () => {
    render(view());
    expect(screen.getByTestId('evolution')).toBeTruthy();
    expect(screen.getByText('Últimas movimentações')).toBeTruthy();
  });

  it('names the box on each movement', () => {
    render(view());
    expect(screen.getAllByText(/Depósito · Reserva/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Resgate · Reserva/).length).toBeGreaterThan(0);
  });

  it('shows goal progress only on a box that has a goal', () => {
    const { container } = render(view());
    expect(container.textContent).toMatch(/Meta\s*R\$\s*5\.000,00/);
    expect(container.querySelectorAll('.progress-bar').length).toBeGreaterThanOrEqual(2);
  });
});

describe('TotalCard without goals', () => {
  it('invites a goal instead of showing a bar with no target', () => {
    render(<TotalCard total={1000} towardGoal={0} goalTotal={0} monthNet={0} />);
    expect(screen.getByText(/Comece definindo uma meta/)).toBeTruthy();
  });
});

describe('SummaryCard', () => {
  it('nudges toward setting a goal when none exists', () => {
    render(<SummaryCard availableToSave={0} boxCount={3} savedThisYear={0} hasGoal={false} />);
    expect(screen.getByText(/Próximo passo/)).toBeTruthy();
  });

  it('drops the nudge once a goal exists', () => {
    render(<SummaryCard availableToSave={0} boxCount={3} savedThisYear={0} hasGoal />);
    expect(screen.queryByText(/Próximo passo/)).toBeNull();
  });
});

describe('SavingsMovements empty state', () => {
  it('explains that the history starts now', () => {
    render(<SavingsMovements movements={[]} boxNameOf={() => 'x'} />);
    expect(screen.getByText(/O histórico começa no primeiro depósito/)).toBeTruthy();
  });

  it('survives a movement whose box was removed', () => {
    render(<SavingsMovements
      movements={[{ id: 'x', accountId: 'gone', savingsDirection: 'in', amount: 10, date: '2026-09-01' }]}
      boxNameOf={() => 'caixinha removida'} />);
    expect(screen.getByText(/caixinha removida/)).toBeTruthy();
  });
});
