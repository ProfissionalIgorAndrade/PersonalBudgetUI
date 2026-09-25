import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import React from 'react';
import SavingsView from '../SavingsView';
import { checkingOnly, normalizeAccount } from '../../../application/mappers/index';

afterEach(cleanup);

const members = [{ id: 'm1', name: 'Igor Andrade' }];
const conta = { id: 'a1', kind: 'checking', bank: 'nubank', agency: '0001', accountNumber: '123456', balance: 2000, memberId: 'm1', isActive: true, name: 'Nubank' };
const reserva = { id: 'b1', kind: 'savings', parentAccountId: 'a1', name: 'Reserva', balance: 5000, isActive: true };
const viagem  = { id: 'b2', kind: 'savings', parentAccountId: 'a1', name: 'Viagem',  balance: 1500, isActive: true };

const view = (props = {}) => (
  <SavingsView accounts={[conta, reserva, viagem]} members={members}
    onCreateBox={() => {}} onRenameBox={() => {}} onMove={() => {}} {...props} />
);

describe('SavingsView', () => {
  it('totals what is put away, not the account balance', () => {
    render(view());
    expect(screen.getByText(/6\.500,00/)).toBeTruthy();
  });

  it('lists each box under its account', () => {
    render(view());
    expect(screen.getByText(/Reserva/)).toBeTruthy();
    expect(screen.getByText(/Viagem/)).toBeTruthy();
  });

  it('shows an empty state when nothing is saved', () => {
    render(view({ accounts: [conta] }));
    expect(screen.getByText(/Nenhum dinheiro guardado ainda/)).toBeTruthy();
  });

  it('cannot create a box with no current account', () => {
    render(view({ accounts: [] }));
    expect(screen.getByText(/Nova Caixinha/).disabled).toBe(true);
  });

  // A box whose parent was deactivated still holds money; hiding it would
  // hide the money.
  it('keeps an orphaned box visible', () => {
    render(view({ accounts: [reserva] }));
    expect(screen.getByText(/Sem conta de origem/)).toBeTruthy();
    expect(screen.getByText(/Reserva/)).toBeTruthy();
  });

  it('allows Resgatar even on an empty box', () => {
    render(view({ accounts: [conta, { ...reserva, balance: 0 }] }));
    const btn = screen.getAllByText(/Resgatar/)[0];
    expect(btn.disabled).toBe(false);
  });

  it('opens the move form asking to save into the chosen box', () => {
    render(view());
    fireEvent.click(screen.getAllByText(/Guardar/)[0]);
    expect(screen.getByText(/Guardar dinheiro/)).toBeTruthy();
  });
});

describe('checkingOnly', () => {
  it('keeps savings boxes out of account lists', () => {
    expect(checkingOnly([conta, reserva, viagem]).map(a => a.id)).toEqual(['a1']);
  });

  it('survives empty input', () => {
    expect(checkingOnly()).toEqual([]);
  });
});

describe('normalizeAccount', () => {
  it('reads the kind and parent the API sends', () => {
    const a = normalizeAccount({ id: 'b1', kind: 'Savings', parentAccountId: 'a1', name: 'Reserva', balance: 5000 });
    expect(a.kind).toBe('savings');
    expect(a.parentAccountId).toBe('a1');
    expect(a.name).toBe('Reserva');
  });

  it('treats an account with no kind as checking', () => {
    expect(normalizeAccount({ id: 'a1', bank: 'nubank', balance: 0 }).kind).toBe('checking');
  });
});

describe('moving money has no cap', () => {
  const open = (label) => {
    const utils = render(view());
    fireEvent.click(screen.getAllByText(label)[0]);
    return utils;
  };
  // Ancorado no próprio modal: o texto dos botões também existe nos cards.
  const modal = (c) => c.querySelector('.modal');
  const amountInput = (c) => modal(c).querySelector('input');
  const submitBtn = (c) => modal(c).querySelector('button[type="submit"]');

  // The account balance is 0 and the old form capped deposits by it, so
  // nothing could be put away at all.
  it('accepts a deposit larger than the account balance', () => {
    const { container } = open(/Guardar/);
    fireEvent.change(amountInput(container), { target: { value: '1000,00' } });
    expect(submitBtn(container).disabled).toBe(false);
  });

  it('accepts a withdrawal larger than the box holds', () => {
    const { container } = open(/Resgatar/);
    fireEvent.change(amountInput(container), { target: { value: '999.999,00' } });
    expect(submitBtn(container).disabled).toBe(false);
  });

  it('still refuses zero', () => {
    const { container } = open(/Guardar/);
    fireEvent.change(amountInput(container), { target: { value: '0' } });
    expect(submitBtn(container).disabled).toBe(true);
  });

  it('warns that a large withdrawal goes negative, without blocking it', () => {
    const { container } = open(/Resgatar/);
    fireEvent.change(amountInput(container), { target: { value: '999.999,00' } });
    expect(container.textContent).toMatch(/deixa a caixinha negativa/);
  });
});
