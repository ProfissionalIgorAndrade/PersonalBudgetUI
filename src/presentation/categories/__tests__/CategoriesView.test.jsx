import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import React from 'react';
import CategoriesView from '../CategoriesView';

afterEach(cleanup);

const categories = [
  { id: 'c1', name: 'Salario', type: 'income',  icon: '💵', color: '#fb923c' },
  { id: 'c2', name: 'Mercado', type: 'expense', icon: '🛒', color: '#2dd4bf' },
];

const setup = (over = {}) => {
  const props = { categories, onAdd: vi.fn(), onEdit: vi.fn(), onDelete: vi.fn(), ...over };
  render(<CategoriesView {...props} />);
  return props;
};

describe('CategoriesView delete confirmation', () => {
  it('does not delete on the first click, only opens the confirmation', () => {
    const { onDelete } = setup();
    fireEvent.click(screen.getByLabelText('Excluir Mercado'));
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.getByText('Excluir categoria?')).toBeTruthy();
  });

  it('deletes only after confirming', () => {
    const { onDelete } = setup();
    fireEvent.click(screen.getByLabelText('Excluir Mercado'));
    fireEvent.click(screen.getByText('Excluir'));
    expect(onDelete).toHaveBeenCalledWith('c2');
    expect(screen.queryByText('Excluir categoria?')).toBeNull();
  });

  it('cancel closes the confirmation without deleting', () => {
    const { onDelete } = setup();
    fireEvent.click(screen.getByLabelText('Excluir Mercado'));
    fireEvent.click(screen.getByText('Cancelar'));
    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.queryByText('Excluir categoria?')).toBeNull();
  });
});

describe('CategoriesView search', () => {
  const many = [
    ...categories,
    { id: 'c3', name: 'Saúde', type: 'expense', icon: '💊', color: '#f87171' },
  ];

  it('filters both groups ignoring case and accents, and counts what it found', () => {
    setup({ categories: many });
    fireEvent.change(screen.getByLabelText('Buscar categoria'), { target: { value: 'SAUDE' } });
    expect(screen.getByText('Saúde')).toBeTruthy();
    expect(screen.queryByText('Mercado')).toBeNull();
    expect(screen.getByText('1 categoria encontrada')).toBeTruthy();
    expect(screen.getByText('Nenhuma categoria de receita com “SAUDE”.')).toBeTruthy();
  });

  it('clears the search with Escape', () => {
    setup({ categories: many });
    const input = screen.getByLabelText('Buscar categoria');
    fireEvent.change(input, { target: { value: 'merc' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.getByText('Saúde')).toBeTruthy();
    expect(screen.getByText('Mercado')).toBeTruthy();
  });

  it('starts a new category with the searched name when nothing was found', () => {
    setup({ categories: many });
    fireEvent.change(screen.getByLabelText('Buscar categoria'), { target: { value: 'Pets' } });
    fireEvent.click(screen.getAllByText('＋ Adicionar')[1]);
    expect(screen.getAllByDisplayValue('Pets')).toHaveLength(2); // a busca e o nome no formulário
  });
});
