import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import React from 'react';
import CategoryGroup from '../CategoryGroup';

afterEach(cleanup);

const tileFor = (name) => screen.getByText(name).closest('.cat-tile');

const group = (cats, over = {}) => (
  <CategoryGroup title="Despesas" cats={cats} type="expense"
    onEdit={() => {}} onDelete={() => {}} onAddForType={() => {}} {...over} />
);

describe('CategoryGroup', () => {
  it('exposes the category colour as an accent, never as the tile background', () => {
    render(group([{ id: '1', name: 'Moradia', icon: '🏠', color: '#f87171' }]));
    const tile = tileFor('Moradia');
    expect(tile.style.getPropertyValue('--cat')).toBe('#f87171');
    expect(tile.style.background).toBe('');
    expect(tile.style.color).toBe('');
  });

  it('shows name, icon and the section count', () => {
    render(group([
      { id: '1', name: 'Moradia', icon: '🏠', color: '#f87171' },
      { id: '2', name: 'Lazer', icon: '📺', color: '#fde047' },
    ]));
    expect(screen.getByText('Moradia')).toBeTruthy();
    expect(screen.getByText('🏠')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
  });

  it('labels the row actions and wires them to the handlers', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const cat = { id: '1', name: 'Moradia', icon: '🏠', color: '#f87171' };
    render(group([cat], { onEdit, onDelete }));
    fireEvent.click(screen.getByLabelText('Editar Moradia'));
    fireEvent.click(screen.getByLabelText('Excluir Moradia'));
    expect(onEdit).toHaveBeenCalledWith(cat);
    expect(onDelete).toHaveBeenCalledWith('1');
  });

  it('add button calls onAddForType with the section type', () => {
    const onAddForType = vi.fn();
    render(group([], { onAddForType }));
    fireEvent.click(screen.getByText('＋ Adicionar'));
    expect(onAddForType).toHaveBeenCalledWith('expense');
  });

  it('shows an empty state when the section has no categories', () => {
    render(group([]));
    expect(screen.getByText(/Nenhuma categoria de despesas/)).toBeTruthy();
  });
});
