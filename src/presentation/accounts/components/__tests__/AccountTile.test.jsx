import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';
import AccountTile from '../AccountTile';

afterEach(cleanup);

const account = { id: 'a1', bank: 'Nubank', agency: '0001', accountNumber: '123456', color: '#a78bfa', memberId: 'm1' };
const members = [{ id: 'm1', name: 'Igor', emoji: '🧑' }];

const tile = (props) => (
  <AccountTile account={account} members={members} onSelect={() => {}} onEdit={() => {}} onDelete={() => {}} {...props} />
);

describe('AccountTile month preview', () => {
  it('shows income and expense for the month', () => {
    render(tile({ balance: 903.8, flow: { income: 12000, expense: 6505.22 }, monthLabel: '2026-07' }));
    expect(screen.getByText(/Movimento 07\/2026/)).toBeTruthy();
    expect(screen.getByText(/12\.000,00/)).toBeTruthy();
    expect(screen.getByText(/6\.505,22/)).toBeTruthy();
  });

  it('keeps showing the running balance alongside it', () => {
    render(tile({ balance: 903.8, flow: { income: 0, expense: 0 }, monthLabel: '2026-07' }));
    expect(screen.getByText(/903,80/)).toBeTruthy();
  });

  it('omits the block entirely when no flow is supplied', () => {
    render(tile({ balance: 0 }));
    expect(screen.queryByText(/Movimento/)).toBeNull();
  });
});
