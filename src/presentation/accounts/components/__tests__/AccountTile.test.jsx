import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';
import AccountTile from '../AccountTile';

afterEach(cleanup);

const account = { id: 'a1', bank: 'Nubank', agency: '0001', accountNumber: '123456', color: '#a78bfa', memberId: 'm1' };
const members = [{ id: 'm1', name: 'Igor Andrade', emoji: '🧑' }];

const tile = (props) => (
  <AccountTile account={account} members={members} onSelect={() => {}} onEdit={() => {}} onDelete={() => {}} {...props} />
);

describe('AccountTile', () => {
  it('leads with income and expense for the month', () => {
    render(tile({ flow: { income: 12242.69, expense: 1500 }, monthLabel: '2026-09' }));
    expect(screen.getByText('Receita')).toBeTruthy();
    expect(screen.getByText('Despesa')).toBeTruthy();
    expect(screen.getByText(/12\.242,69/)).toBeTruthy();
    expect(screen.getByText(/1\.500,00/)).toBeTruthy();
  });

  // The running balance was removed: it is no longer maintained and read
  // R$ 0,00 on every account, which said nothing.
  it('does not show a running balance', () => {
    const { container } = render(tile({ balance: 4321, flow: { income: 10, expense: 5 }, monthLabel: '2026-09' }));
    expect(container.textContent).not.toMatch(/4\.321/);
  });

  it('drops the movement row, leaving owner and actions', () => {
    const { container } = render(tile({ flow: { income: 10, expense: 5 }, monthLabel: '2026-09' }));
    expect(container.textContent).not.toMatch(/Movimento/);
    expect(container.querySelectorAll('.card-sm button')).toHaveLength(2);
  });

  // The owner moved off the coloured face and into the actions row.
  it('names the owner beside the actions, not on the card face', () => {
    const { container } = render(tile({ flow: { income: 10, expense: 5 } }));
    const footer = container.querySelector('.card-sm');
    expect(footer.textContent).toMatch(/Igor Andrade/);
    expect(container.querySelector('.cc-visual').textContent).not.toMatch(/Igor Andrade/);
  });

  it('shows zeroes rather than blanks with no movement', () => {
    render(tile({ monthLabel: '2026-09' }));
    expect(screen.getAllByText(/0,00/).length).toBeGreaterThanOrEqual(2);
  });

  it('keeps agency and account visible', () => {
    render(tile({ flow: { income: 0, expense: 0 } }));
    expect(screen.getByText(/Agência 0001/)).toBeTruthy();
  });
});
