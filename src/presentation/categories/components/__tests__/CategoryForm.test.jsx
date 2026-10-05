import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import React from 'react';
import CategoryForm from '../CategoryForm';

afterEach(cleanup);

const form = (f, over = {}) => (
  <CategoryForm f={f} onChange={() => {}} onSave={() => {}} onClose={() => {}} {...over} />
);

describe('CategoryForm', () => {
  it('disables Save while the name is blank', () => {
    render(form({ name: '   ', icon: '📦', color: '#2dd4bf', type: 'expense' }));
    expect(screen.getByText('💾 Salvar').disabled).toBe(true);
  });

  it('shows an inline message after the name field loses focus empty', () => {
    render(form({ name: '', icon: '📦', color: '#2dd4bf', type: 'expense' }));
    fireEvent.blur(screen.getByLabelText('Nome'));
    expect(screen.getByRole('alert').textContent).toMatch(/Informe um nome/);
  });

  it('saves when the name is filled', () => {
    const onSave = vi.fn();
    render(form({ name: 'Mercado', icon: '🛒', color: '#2dd4bf', type: 'expense' }, { onSave }));
    fireEvent.click(screen.getByText('💾 Salvar'));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('previews the typed name, icon and colour', () => {
    render(form({ name: 'Mercado', icon: '🛒', color: '#2dd4bf', type: 'expense' }));
    const tile = screen.getByLabelText('Prévia da categoria').querySelector('.cat-tile');
    expect(tile.textContent).toContain('Mercado');
    expect(tile.textContent).toContain('🛒');
    expect(tile.style.getPropertyValue('--cat')).toBe('#2dd4bf');
  });

  it('switches the type through the segmented control', () => {
    const onChange = vi.fn();
    render(form({ name: 'X', icon: '📦', color: '#2dd4bf', type: 'expense' }, { onChange }));
    expect(screen.getByText('💸 Despesa').getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByText('💰 Receita'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ type: 'income' }));
  });
});
