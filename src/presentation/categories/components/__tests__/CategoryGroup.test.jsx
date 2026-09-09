import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';
import CategoryGroup from '../CategoryGroup';
import { PALETTE, inkOn } from '../../../../core/constants/palette';

afterEach(cleanup);

const hex = (rgb) => {
  const m = rgb.match(/\d+/g);
  return m ? '#' + m.slice(0, 3).map(n => (+n).toString(16).padStart(2, '0')).join('') : rgb;
};

const cardFor = (name) => screen.getByText(name).closest('.card-sm');

const group = (cats) => (
  <CategoryGroup title="Despesas" cats={cats} type="expense"
    onEdit={() => {}} onDelete={() => {}} onAddForType={() => {}} />
);

describe('CategoryGroup colouring', () => {
  it('paints the card background with the category colour', () => {
    render(group([{ id: '1', name: 'Moradia', icon: '🏠', color: '#f87171' }]));
    expect(hex(cardFor('Moradia').style.background)).toBe('#f87171');
  });

  it('uses dark ink on a pale colour', () => {
    render(group([{ id: '1', name: 'Lazer', icon: '📺', color: '#fde047' }]));
    const card = cardFor('Lazer');
    expect(hex(card.style.color)).toBe('#0b0f14');
    expect(card.style.border).toContain('rgb(11, 15, 20)');
  });

  it('uses light ink on a deep colour', () => {
    render(group([{ id: '1', name: 'Viagens', icon: '✈️', color: '#0d9488' }]));
    const card = cardFor('Viagens');
    expect(hex(card.style.color)).toBe('#ffffff');
    expect(card.style.border).toContain('rgb(255, 255, 255)');
  });

  it('border and text always agree, across the whole palette', () => {
    for (const color of PALETTE) {
      cleanup();
      render(group([{ id: '1', name: 'X', icon: '📦', color }]));
      const card = cardFor('X');
      expect(hex(card.style.color)).toBe(inkOn(color));
    }
  });
});
