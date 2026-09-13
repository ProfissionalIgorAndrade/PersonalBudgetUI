import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';
import CategoryExpensesWidget from '../CategoryExpensesWidget';
import CategoryIncomeWidget from '../CategoryIncomeWidget';

afterEach(cleanup);

// Ten categories: more than the seven the widgets used to cut at.
const names = ['Moradia', 'Besteira', 'Transporte', 'Viagens', 'Dizimo',
               'Outros', 'Lazer', 'Mercado', 'Beleza', 'Pet'];
const categories = names.map((name, i) => ({ id: `c${i}`, name, icon: '📦', color: '#f87171' }));
const byCat = Object.fromEntries(categories.map((c, i) => [c.id, (10 - i) * 100]));
const catKeys = categories.map(c => c.id);
const total = Object.values(byCat).reduce((a, b) => a + b, 0);

describe('CategoryExpensesWidget', () => {
  it('lists every category, not just the top seven', () => {
    render(<CategoryExpensesWidget categories={categories} byCat={byCat} catKeys={catKeys} totalOut={total} />);
    for (const name of names) {
      expect(screen.getByText(new RegExp(name))).toBeTruthy();
    }
  });

  // The ones that used to fall off the end.
  it('includes Mercado, Beleza and Pet', () => {
    render(<CategoryExpensesWidget categories={categories} byCat={byCat} catKeys={catKeys} totalOut={total} />);
    expect(screen.getByText(/Mercado/)).toBeTruthy();
    expect(screen.getByText(/Beleza/)).toBeTruthy();
    expect(screen.getByText(/Pet/)).toBeTruthy();
  });

  it('still shows the empty state with no expenses', () => {
    render(<CategoryExpensesWidget categories={categories} byCat={{}} catKeys={[]} totalOut={0} />);
    expect(screen.getByText(/Sem despesas este mês/)).toBeTruthy();
  });
});

describe('CategoryIncomeWidget', () => {
  it('lists every income category too', () => {
    render(<CategoryIncomeWidget categories={categories} byIncCat={byCat} incCatKeys={catKeys} totalIn={total} />);
    expect(screen.getByText(/Beleza/)).toBeTruthy();
    expect(screen.getByText(/Pet/)).toBeTruthy();
  });
});
