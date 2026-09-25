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

describe('CardTile after the refactor', () => {
  it('shows the available limit, not the contracted one', () => {
    render(tile({ spent: 5008.74, statementMonth: '2026-09' }));
    expect(screen.getByText('Limite disponível')).toBeTruthy();
    // 15.000,00 - 5.008,74
    expect(screen.getByText(/9\.991,26/)).toBeTruthy();
  });

  it('drops the masked card number and the closing/due dates', () => {
    const { container } = render(tile({ spent: 100, statementMonth: '2026-09' }));
    expect(container.textContent).not.toMatch(/••••/);
    expect(container.textContent).not.toMatch(/Fecha/);
    expect(container.textContent).not.toMatch(/Vence/);
  });

  it('drops the usage percentage and the progress bar', () => {
    const { container } = render(tile({ spent: 5008.74, statementMonth: '2026-09' }));
    expect(container.textContent).not.toMatch(/33%/);
    expect(container.querySelector('.progress-bar')).toBeNull();
  });

  it('leaves only the two action buttons below', () => {
    const { container } = render(tile({ spent: 100, statementMonth: '2026-09' }));
    expect(container.querySelectorAll('.card-sm button')).toHaveLength(2);
  });

  it('never shows a negative available limit', () => {
    render(tile({ spent: 20000, statementMonth: '2026-09' }));
    expect(screen.getByText(/^R\$ 0,00$/)).toBeTruthy();
  });
});

describe('CardTile owner and footer', () => {
  it('shows the statement and available limit on the card face', () => {
    const { container } = render(tile({ spent: 5008.74, statementMonth: '2026-09' }));
    const face = container.querySelector('.cc-visual');
    expect(face.textContent).toMatch(/Fatura 09\/2026/);
    expect(face.textContent).toMatch(/Limite disponível/);
    expect(face.textContent).toMatch(/9\.991,26/);
  });

  it('names the owner beside the actions, not on the card face', () => {
    const { container } = render(tile({ spent: 100, statementMonth: '2026-09' }));
    expect(container.querySelector('.card-sm').textContent).toMatch(/Igor/);
    expect(container.querySelector('.cc-visual').textContent).not.toMatch(/Igor/);
  });

  it('keeps the two actions in the footer', () => {
    const { container } = render(tile({ spent: 100, statementMonth: '2026-09' }));
    expect(container.querySelectorAll('.card-sm button')).toHaveLength(2);
  });
});
