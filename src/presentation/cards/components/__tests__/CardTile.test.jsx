import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';
import CardTile from '../CardTile';

afterEach(cleanup);

const card = { id: 'c1', name: 'Inter Black', flag: 'visa', lastDigits: '4417', limit: 15000, closingDay: 27, dueDay: 7, color: '#f87171', memberId: 'm1' };
const members = [{ id: 'm1', name: 'Igor', emoji: '🧑' }];

const tile = (props) => (
  <CardTile card={card} members={members} onSelect={() => {}} onEdit={() => {}} onDelete={() => {}} {...props} />
);

describe('CardTile statement preview', () => {
  it('shows the statement total without opening the card', () => {
    render(tile({ spent: 814.99, statementMonth: '2026-09' }));
    expect(screen.getByText(/Fatura 09\/2026/)).toBeTruthy();
    expect(screen.getByText(/814,99/)).toBeTruthy();
  });

  it('labels the month it is showing', () => {
    render(tile({ spent: 0, statementMonth: '2026-07' }));
    expect(screen.getByText(/Fatura 07\/2026/)).toBeTruthy();
  });

  it('does not repeat the total in the limit row', () => {
    render(tile({ spent: 814.99, statementMonth: '2026-09' }));
    expect(screen.getAllByText(/814,99/)).toHaveLength(1);
  });

  it('renders without a month rather than showing a broken label', () => {
    render(tile({ spent: 10 }));
    expect(screen.getByText('Fatura')).toBeTruthy();
  });
});
