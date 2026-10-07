import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import SavingsView from '../SavingsView';

vi.mock('../components/SavingsEvolution', () => ({ default: () => <div data-testid="evolution" /> }));

afterEach(cleanup);

const members = [{ id: 'm1', name: 'Igor Andrade' }];
const conta = { id: 'a1', kind: 'checking', bank: 'Nubank', balance: 0, memberId: 'm1', isActive: true };
const reserva = { id: 'b1', kind: 'savings', parentAccountId: 'a1', name: 'Reserva', balance: 4000, isActive: true };
const viagem  = { id: 'b2', kind: 'savings', parentAccountId: 'a1', name: 'Viagem',  balance: 2350, isActive: true };
const vazia   = { id: 'b3', kind: 'savings', parentAccountId: 'a1', name: 'Vazia',   balance: 0,    isActive: true };

const view = (props = {}) => (
  <SavingsView accounts={[conta, reserva, viagem, vazia]} members={members} movements={[]} events={[]}
    onCreateBox={() => {}} onRenameBox={() => {}} onSetGoal={() => {}} onMove={() => {}}
    onDeleteBox={vi.fn().mockResolvedValue()} {...props} />
);

const openDelete = (name) => {
  const card = screen.getAllByText(new RegExp(`🐷 ${name}`))[0].closest('.card-sm');
  fireEvent.click(card.querySelector('button[title="Renomear caixinha"]'));
  fireEvent.click(screen.getByText('Excluir caixinha'));
};
const modal = () => document.querySelector('.modal');
const reasonField = () => screen.getByLabelText(/Motivo/);
const destField = () => screen.getByLabelText(/Destino/);
const submit = () => fireEvent.click(modal().querySelector('button[type="submit"]'));

describe('delete savings box', () => {
  it('opens from the edit form and shows the name and balance', () => {
    render(view());
    openDelete('Reserva');
    expect(screen.getByRole('heading', { name: 'Excluir caixinha' })).toBeTruthy();
    expect(modal().textContent).toMatch(/Reserva/);
    expect(modal().textContent).toMatch(/R\$\s*4\.000,00/);
  });

  it('blocks submission without a reason and flags the field', () => {
    const onDeleteBox = vi.fn().mockResolvedValue();
    render(view({ onDeleteBox }));
    openDelete('Reserva');
    fireEvent.change(destField(), { target: { value: 'b2' } });
    submit();
    expect(onDeleteBox).not.toHaveBeenCalled();
    expect(reasonField().getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByRole('alert').textContent).toMatch(/motivo/i);
  });

  it('counts the reason up to 200 characters', () => {
    render(view());
    openDelete('Reserva');
    expect(reasonField().getAttribute('maxlength')).toBe('200');
    fireEvent.change(reasonField(), { target: { value: 'abc' } });
    expect(modal().textContent).toMatch(/3\/200/);
  });

  it('requires a destination when there is balance and lists only the other boxes', () => {
    const onDeleteBox = vi.fn().mockResolvedValue();
    render(view({ onDeleteBox }));
    openDelete('Reserva');
    const labels = [...destField().querySelectorAll('option')].map(o => o.textContent);
    expect(labels.some(l => l.startsWith('Viagem'))).toBe(true);
    expect(labels.some(l => l.startsWith('Reserva'))).toBe(false);
    expect(modal().textContent).toMatch(/O saldo de R\$\s*4\.000,00 será movido para a caixinha escolhida/);

    fireEvent.change(reasonField(), { target: { value: 'objetivo concluído' } });
    submit();
    expect(onDeleteBox).not.toHaveBeenCalled();
    expect(destField().getAttribute('aria-invalid')).toBe('true');
  });

  it('sends reason and destination, then closes and notifies', async () => {
    const onDeleteBox = vi.fn().mockResolvedValue();
    const notify = vi.fn();
    render(view({ onDeleteBox, notify }));
    openDelete('Reserva');
    fireEvent.change(reasonField(), { target: { value: '  objetivo concluído ' } });
    fireEvent.change(destField(), { target: { value: 'b2' } });
    submit();

    await waitFor(() => expect(onDeleteBox).toHaveBeenCalledWith(
      'b1', { reason: 'objetivo concluído', destinationAccountId: 'b2' }));
    await waitFor(() => expect(modal()).toBeNull());
    expect(notify).toHaveBeenCalledWith('Caixinha excluída.');
  });

  it('has no destination selector for an empty box and omits it from the payload', async () => {
    const onDeleteBox = vi.fn().mockResolvedValue();
    render(view({ onDeleteBox }));
    openDelete('Vazia');
    expect(screen.queryByLabelText(/Destino/)).toBeNull();
    expect(modal().textContent).toMatch(/Esta caixinha não tem saldo\./);
    fireEvent.change(reasonField(), { target: { value: 'não uso mais' } });
    submit();
    await waitFor(() => expect(onDeleteBox).toHaveBeenCalledWith('b3', { reason: 'não uso mais' }));
  });

  it('disables deletion and explains when there is balance and no other box', () => {
    const onDeleteBox = vi.fn();
    render(view({ accounts: [conta, reserva], onDeleteBox }));
    openDelete('Reserva');
    expect(modal().textContent).toMatch(/Crie outra caixinha para receber o saldo ou resgate antes\./);
    expect(modal().querySelector('button[type="submit"]').disabled).toBe(true);
    expect(destField().disabled).toBe(true);
  });

  it('shows a server error inline and keeps the modal open', async () => {
    const onDeleteBox = vi.fn().mockRejectedValue(new Error('A caixinha de destino não pertence ao lar.'));
    const notify = vi.fn();
    render(view({ onDeleteBox, notify }));
    openDelete('Reserva');
    fireEvent.change(reasonField(), { target: { value: 'x' } });
    fireEvent.change(destField(), { target: { value: 'b2' } });
    submit();

    await waitFor(() => expect(screen.getByText('A caixinha de destino não pertence ao lar.')).toBeTruthy());
    expect(modal()).not.toBeNull();
    expect(modal().querySelector('button[type="submit"]').disabled).toBe(false);
    expect(notify).not.toHaveBeenCalled();
  });

  it('does not offer deletion when the screen has no delete handler', () => {
    render(view({ onDeleteBox: undefined }));
    const card = screen.getAllByText(/🐷 Reserva/)[0].closest('.card-sm');
    fireEvent.click(card.querySelector('button[title="Renomear caixinha"]'));
    expect(screen.queryByText('Excluir caixinha')).toBeNull();
  });
});
