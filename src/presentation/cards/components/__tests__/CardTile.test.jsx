import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';
import CardTile from '../CardTile';

afterEach(cleanup);

const card = { id: 'c1', name: 'Inter Black', flag: 'master', limit: 15000, dueDay: 7, color: '#f87171', memberId: 'm1' };
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

describe('CardTile after the redesign', () => {
  it('shows the available limit', () => {
    render(tile({ spent: 5008.74, statementMonth: '2026-09' }));
    expect(screen.getByText('Disponível')).toBeTruthy();
    // 15.000,00 - 5.008,74
    expect(screen.getByText(/9\.991,26/)).toBeTruthy();
  });

  it('renders a progress bar reflecting usage', () => {
    const { container } = render(tile({ spent: 5008.74, statementMonth: '2026-09' }));
    expect(container.querySelector('.progress-bar')).toBeTruthy();
    expect(container.querySelector('.progress-fill')).toBeTruthy();
  });

  it('shows usage percentage label', () => {
    const { container } = render(tile({ spent: 7500, statementMonth: '2026-09' }));
    // 7500 / 15000 = 50%
    expect(container.querySelector('.cc-face-progress-pct').textContent).toBe('50%');
  });

  it('leaves only the two action buttons in the footer', () => {
    const { container } = render(tile({ spent: 100, statementMonth: '2026-09' }));
    expect(container.querySelectorAll('.card-sm button')).toHaveLength(2);
  });

  it('never shows a negative available limit', () => {
    render(tile({ spent: 20000, statementMonth: '2026-09' }));
    expect(screen.getByText(/^R\$ 0,00$/)).toBeTruthy();
  });

  it('shows the due day on the card face', () => {
    const { container } = render(tile({ spent: 100, statementMonth: '2026-09' }));
    const face = container.querySelector('.cc-visual');
    expect(face.textContent).toMatch(/Vence dia 7/);
  });
});

describe('CardTile owner visibility', () => {
  it('shows owner name on the card face', () => {
    const { container } = render(tile({ spent: 100, statementMonth: '2026-09' }));
    const face = container.querySelector('.cc-visual');
    expect(face.textContent).toMatch(/Igor/);
  });

  it('shows card name on the face', () => {
    const { container } = render(tile({ spent: 5008.74, statementMonth: '2026-09' }));
    const face = container.querySelector('.cc-visual');
    expect(face.textContent).toMatch(/Inter Black/);
  });

  it('still keeps the two action buttons in the footer', () => {
    const { container } = render(tile({ spent: 100, statementMonth: '2026-09' }));
    expect(container.querySelectorAll('.card-sm button')).toHaveLength(2);
  });
});

describe('CardTile CardBrandLogo integration', () => {
  it('renders the CardBrandLogo on the card face', () => {
    const { container } = render(tile({ spent: 100, statementMonth: '2026-09' }));
    expect(container.querySelector('.cbl')).toBeTruthy();
  });

  it('renders mastercard circles for master flag', () => {
    const { container } = render(tile({ spent: 100, statementMonth: '2026-09' }));
    expect(container.querySelector('.cbl-master')).toBeTruthy();
  });
});
