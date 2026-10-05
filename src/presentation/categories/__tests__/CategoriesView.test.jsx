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
