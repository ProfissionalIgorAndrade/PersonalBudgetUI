import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import SavingsView from '../SavingsView';

vi.mock('../components/SavingsEvolution', () => ({ default: () => <div data-testid="evolution" /> }));

afterEach(cleanup);

const members = [{ id: 'm1', name: 'Igor Andrade' }];
const conta = { id: 'a1', kind: 'checking', bank: 'Nubank', balance: 0, memberId: 'm1', isActive: true };
const reserva = { id: 'b1', kind: 'savings', parentAccountId: 'a1', name: 'Reserva', balance: 4000, savingsGoal: 5000, isActive: true };
const semMeta = { id: 'b2', kind: 'savings', parentAccountId: 'a1', name: 'Viagem', balance: 1000, isActive: true };

const view = (props = {}) => (
  <SavingsView accounts={[conta, reserva, semMeta]} members={members} movements={[]}
    onCreateBox={() => {}} onRenameBox={() => {}} onSetGoal={() => {}} onMove={() => {}} {...props} />
);

const goalInput = (c) => {
  const group = [...c.querySelectorAll('.form-group')]
    .find(g => g.textContent.includes('Meta'));
  return group.querySelector('input');
};

describe('setting a goal', () => {
  // The create endpoint does not accept a goal; it has its own route. Before
  // this, a goal typed while creating was silently discarded.
  it('saves the goal on a box being created, using the returned id', async () => {
    const onCreateBox = vi.fn().mockResolvedValue('new-box-id');
    const onSetGoal = vi.fn().mockResolvedValue();
    const { container } = render(view({ onCreateBox, onSetGoal }));

    fireEvent.click(screen.getByText(/Nova Caixinha/));
    fireEvent.change(screen.getByPlaceholderText(/Reserva de emergência/), { target: { value: 'Carro' } });
    fireEvent.change(goalInput(container), { target: { value: '12.000,00' } });
    fireEvent.click(screen.getByText(/Salvar/));

    await waitFor(() => expect(onCreateBox).toHaveBeenCalled());
    await waitFor(() => expect(onSetGoal).toHaveBeenCalledWith('new-box-id', 12000));
  });

  it('saves the goal when editing an existing box', async () => {
    const onSetGoal = vi.fn().mockResolvedValue();
    const { container } = render(view({ onSetGoal }));

    fireEvent.click(screen.getAllByTitle(/Renomear/)[0]);
    fireEvent.change(goalInput(container), { target: { value: '9.000,00' } });
    fireEvent.click(screen.getByText(/Salvar/));

    await waitFor(() => expect(onSetGoal).toHaveBeenCalledWith(expect.any(String), 9000));
  });

  it('clears the goal when the field is emptied', async () => {
    const onSetGoal = vi.fn().mockResolvedValue();
    const { container } = render(view({ onSetGoal }));

    fireEvent.click(screen.getAllByTitle(/Renomear/)[0]);
    fireEvent.change(goalInput(container), { target: { value: '' } });
    fireEvent.click(screen.getByText(/Salvar/));

    await waitFor(() => expect(onSetGoal).toHaveBeenCalledWith(expect.any(String), null));
  });

  it('warns rather than failing silently when the id is missing', async () => {
    const onCreateBox = vi.fn().mockResolvedValue(null);
    const onSetGoal = vi.fn();
    const notify = vi.fn();
    const { container } = render(view({ onCreateBox, onSetGoal, notify }));

    fireEvent.click(screen.getByText(/Nova Caixinha/));
    fireEvent.change(screen.getByPlaceholderText(/Reserva de emergência/), { target: { value: 'Carro' } });
    fireEvent.change(goalInput(container), { target: { value: '500,00' } });
    fireEvent.click(screen.getByText(/Salvar/));

    await waitFor(() => expect(notify).toHaveBeenCalled());
    expect(onSetGoal).not.toHaveBeenCalled();
  });
});

describe('goal display', () => {
  it('shows progress on a box that has a goal', () => {
    const { container } = render(view());
    expect(container.textContent).toMatch(/Meta\s*R\$\s*5\.000,00/);
    expect(container.textContent).toMatch(/80%/);
  });

  it('says the goal is unset on a box without one', () => {
    const { container } = render(view());
    expect(container.textContent).toMatch(/Meta não definida/);
  });
});
