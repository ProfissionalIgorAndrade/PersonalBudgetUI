import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import React from 'react';
import AccountTile from '../AccountTile';

afterEach(cleanup);

const account = { id: 'a1', bank: 'Nubank', color: '#a78bfa', memberId: 'm1' };
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

  // Non-compact: owner stays in the footer actions row, not on the card face.
  it('names the owner in the footer row (non-compact)', () => {
    const { container } = render(tile({ flow: { income: 10, expense: 5 } }));
    const footer = container.querySelector('.card-sm');
    expect(footer.textContent).toMatch(/Igor Andrade/);
  });

  it('shows zeroes rather than blanks with no movement', () => {
    render(tile({ monthLabel: '2026-09' }));
    expect(screen.getAllByText(/0,00/).length).toBeGreaterThanOrEqual(2);
  });

  it('shows neither agency nor account number, keeping the month label', () => {
    const { container } = render(tile({ flow: { income: 0, expense: 0 }, monthLabel: '2026-09' }));
    expect(container.textContent).not.toMatch(/Agência|Conta \d|123456|0001/);
    expect(container.textContent).toMatch(/09\/2026/);
  });

  it('passes the account to the action callbacks', () => {
    const calls = [];
    const { container } = render(tile({
      flow: { income: 0, expense: 0 },
      onSelect: a => calls.push(['select', a.id]),
      onEdit: a => calls.push(['edit', a.id]),
      onDelete: a => calls.push(['delete', a.id]),
    }));
    const [edit, del] = container.querySelectorAll('.card-sm button');
    fireEvent.click(container.querySelector('.cc-visual'));
    fireEvent.click(edit);
    fireEvent.click(del);
    expect(calls).toEqual([['select', 'a1'], ['edit', 'a1'], ['delete', 'a1']]);
  });
});

describe('AccountTile — bank logo', () => {
  it('shows a bank logo badge on the card face', () => {
    const { container } = render(tile({ flow: { income: 0, expense: 0 } }));
    // BankLogo renders a .bkl-badge for known banks
    expect(container.querySelector('.bkl-badge')).toBeTruthy();
  });

  it('shows NU badge for Nubank', () => {
    const { container } = render(tile({ flow: { income: 0, expense: 0 } }));
    const badge = container.querySelector('.bkl-badge');
    expect(badge.textContent).toBe('NU');
  });

  it('shows fallback icon for unknown bank', () => {
    const unknownAccount = { ...account, bank: 'BancoDesconhecido' };
    const { container } = render(
      <AccountTile account={unknownAccount} members={members}
        onSelect={() => {}} onEdit={() => {}} onDelete={() => {}} />
    );
    expect(container.querySelector('.bkl-fallback')).toBeTruthy();
    expect(container.querySelector('.bkl-badge')).toBeNull();
  });

  it('renders logo in compact mode', () => {
    const { container } = render(tile({ compact: true, flow: { income: 0, expense: 0 } }));
    expect(container.querySelector('.bkl')).toBeTruthy();
  });

  it('uses sm size badge in compact mode', () => {
    const { container } = render(tile({ compact: true, flow: { income: 0, expense: 0 } }));
    expect(container.querySelector('.bkl-sm')).toBeTruthy();
  });
});

describe('AccountTile — compact mode', () => {
  it('shows owner name on the card face in compact mode', () => {
    const { container } = render(tile({ compact: true, flow: { income: 0, expense: 0 } }));
    expect(container.querySelector('.cc-visual').textContent).toMatch(/Igor Andrade/);
  });

  it('shows no .card-sm footer in compact mode', () => {
    const { container } = render(tile({ compact: true, flow: { income: 0, expense: 0 } }));
    expect(container.querySelector('.card-sm')).toBeNull();
  });

  it('shows edit and delete buttons inside the face in compact mode', () => {
    const { container } = render(tile({ compact: true, flow: { income: 0, expense: 0 } }));
    const buttons = container.querySelector('.cc-visual').querySelectorAll('button');
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });
});
