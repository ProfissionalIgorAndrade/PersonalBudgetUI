import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import SavingsView from '../SavingsView';
import SavingsMovements from '../components/SavingsMovements';

vi.mock('../components/SavingsEvolution', () => ({ default: () => <div data-testid="evolution" /> }));

afterEach(cleanup);

const members = [{ id: 'm1', name: 'Igor Andrade' }];
const conta = { id: 'a1', kind: 'checking', bank: 'Nubank', agency: '0001', accountNumber: '1', balance: 0, memberId: 'm1', isActive: true };
const reserva = { id: 'b1', kind: 'savings', parentAccountId: 'a1', name: 'Reserva', balance: 4000, isActive: true };

const view = (props = {}) => (
  <SavingsView accounts={[conta, reserva]} members={members} movements={[]}
    onCreateBox={() => {}} onRenameBox={() => {}} onSetGoal={() => {}} onMove={() => {}} {...props} />
);

const reasonInput = (c) =>
  [...c.querySelectorAll('.modal .form-group')]
    .find(g => g.textContent.includes('Motivo'))
    .querySelector('input');

const amountInput = (c) => c.querySelector('.modal input');

describe('reason on a movement', () => {
  it('sends the reason with a deposit', async () => {
    const onMove = vi.fn().mockResolvedValue();
    const { container } = render(view({ onMove }));

    fireEvent.click(screen.getAllByText(/Guardar/)[0]);
    fireEvent.change(amountInput(container), { target: { value: '500,00' } });
    fireEvent.change(reasonInput(container), { target: { value: 'sobra do mês' } });
    fireEvent.click(container.querySelector('.modal button[type="submit"]'));

    await waitFor(() => expect(onMove).toHaveBeenCalledWith(
      expect.objectContaining({ direction: 'in', reason: 'sobra do mês' })));
  });

  it('sends the reason with a withdrawal', async () => {
    const onMove = vi.fn().mockResolvedValue();
    const { container } = render(view({ onMove }));

    fireEvent.click(screen.getAllByText(/Resgatar/)[0]);
    fireEvent.change(amountInput(container), { target: { value: '100,00' } });
    fireEvent.change(reasonInput(container), { target: { value: 'conserto do carro' } });
    fireEvent.click(container.querySelector('.modal button[type="submit"]'));

    await waitFor(() => expect(onMove).toHaveBeenCalledWith(
      expect.objectContaining({ direction: 'out', reason: 'conserto do carro' })));
  });

  // Optional on purpose: requiring a justification on every movement would
  // make people invent text to get past the form.
  it('saves fine with no reason', async () => {
    const onMove = vi.fn().mockResolvedValue();
    const { container } = render(view({ onMove }));

    fireEvent.click(screen.getAllByText(/Guardar/)[0]);
    fireEvent.change(amountInput(container), { target: { value: '500,00' } });
    expect(container.querySelector('.modal button[type="submit"]').disabled).toBe(false);
    fireEvent.click(container.querySelector('.modal button[type="submit"]'));

    await waitFor(() => expect(onMove).toHaveBeenCalled());
  });
});

describe('reason in the statement', () => {
  const movement = (notes) => ([{
    id: 'x', accountId: 'b1', savingsDirection: 'in', amount: 500, date: '2026-09-20', notes,
  }]);

  it('shows the reason beside the date', () => {
    render(<SavingsMovements movements={movement('sobra do mês')} boxNameOf={() => 'Reserva'} />);
    expect(screen.getByText(/20\/09\s*·\s*sobra do mês/)).toBeTruthy();
  });

  it('shows only the date when there is no reason', () => {
    const { container } = render(<SavingsMovements movements={movement('')} boxNameOf={() => 'Reserva'} />);
    expect(container.textContent).toMatch(/20\/09/);
    expect(container.textContent).not.toMatch(/·\s*$/);
  });

  it('handles a null reason the same as an empty one', () => {
    const { container } = render(<SavingsMovements movements={movement(null)} boxNameOf={() => 'Reserva'} />);
    expect(container.textContent).toMatch(/20\/09/);
  });
});
