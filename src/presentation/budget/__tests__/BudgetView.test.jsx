import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, within, waitFor } from '@testing-library/react';
import React from 'react';
import BudgetView from '../BudgetView';
import { R$ } from '../../../core/utils/format';

vi.mock('../../../data/repositories/budgetRepository', () => ({
  listBudgets: vi.fn().mockResolvedValue([
    { id: 'p1', categoryId: 'mer', limitAmount: 2000 },
    { id: 'p2', categoryId: 'laz', limitAmount: 500 },
  ]),
  upsertBudget: vi.fn().mockResolvedValue(null),
}));
import * as repo from '../../../data/repositories/budgetRepository';

afterEach(() => { cleanup(); vi.clearAllMocks(); });

const categories = [
  { id: 'mer', name: 'Mercado', type: 'expense', icon: '🛒', color: '#2dd4bf' },
  { id: 'res', name: 'Restaurantes', type: 'expense', icon: '🍽️', color: '#fb923c' },
  { id: 'laz', name: 'Lazer', type: 'expense', icon: '🎬', color: '#ff79c6' },
  { id: 'sal', name: 'Salário', type: 'income', icon: '💵', color: '#50fa7b' },
];
const budgets = [
  { id: 'b1', categoryId: 'mer', limitAmount: 2000, spentAmount: 1500 },
  { id: 'b2', categoryId: 'res', limitAmount: 1000, spentAmount: 1104 },
];

const setup = (over = {}) => {
  const props = {
    budgets, categories, activeMonth: '2026-11', setActiveMonth: vi.fn(),
    loadBudgets: vi.fn().mockResolvedValue(undefined),
    budgetOps: { onUpsert: vi.fn().mockResolvedValue(undefined), onDelete: vi.fn().mockResolvedValue(undefined) },
    ...over,
  };
  render(<BudgetView {...props} />);
  return props;
};

const rowOf = (name) => screen.getByText(name, { selector: '.bud-name-text' }).closest('li');

describe('BudgetView', () => {
  it('loads the month it shows', () => {
    const { loadBudgets } = setup();
    expect(loadBudgets).toHaveBeenCalledWith(11, 2026);
  });

  it('sums the month and says what went over', () => {
    setup();
    const summary = screen.getByRole('region', { name: 'Resumo de novembro de 2026' });
    expect(summary.textContent).toContain(R$(2604));
    expect(summary.textContent).toContain(`de ${R$(3000)}`);
    expect(summary.textContent).toContain('1 categoria');
    expect(within(rowOf('Restaurantes')).getByText(/104,00 acima/)).toBeTruthy();
    expect(within(rowOf('Restaurantes')).getByText('110%')).toBeTruthy();
  });

  it('lists over-limit categories first and those without a limit apart', () => {
    setup();
    const limited = screen.getByRole('region', { name: 'Com limite' });
    expect(within(limited).getAllByRole('listitem').map(li => li.querySelector('.bud-name-text').textContent))
      .toEqual(['Restaurantes', 'Mercado']);
    const free = screen.getByRole('region', { name: 'Sem limite' });
    expect(free.textContent).toContain('Lazer');
    expect(free.textContent).not.toContain('Salário');
  });

  it('edits a limit inline and saves it for the month', async () => {
    const { budgetOps } = setup();
    fireEvent.click(screen.getByLabelText('Editar limite de Mercado'));
    const input = screen.getByLabelText('Limite de Mercado');
    fireEvent.change(input, { target: { value: '2500' } });
    fireEvent.click(within(rowOf('Mercado')).getByText('Salvar'));
    await waitFor(() => expect(budgetOps.onUpsert).toHaveBeenCalledWith({ categoryId: 'mer', month: 11, year: 2026, limitAmount: 2500 }));
  });

  it('saves with Enter and cancels with Escape', async () => {
    const { budgetOps } = setup();
    fireEvent.click(within(rowOf('Lazer')).getByText('+ Definir limite'));
    const input = screen.getByLabelText('Limite de Lazer');
    fireEvent.change(input, { target: { value: '600' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => expect(budgetOps.onUpsert).toHaveBeenCalledWith(expect.objectContaining({ categoryId: 'laz', limitAmount: 600 })));

    fireEvent.click(screen.getByLabelText('Editar limite de Mercado'));
    fireEvent.keyDown(screen.getByLabelText('Limite de Mercado'), { key: 'Escape' });
    expect(screen.queryByLabelText('Limite de Mercado')).toBeNull();
  });

  it('removes a limit, and a zero limit also removes it', async () => {
    const { budgetOps } = setup();
    fireEvent.click(screen.getByLabelText('Editar limite de Mercado'));
    fireEvent.click(screen.getByText('Remover limite'));
    await waitFor(() => expect(budgetOps.onDelete).toHaveBeenCalledWith('b1', 11, 2026));

    fireEvent.click(screen.getByLabelText('Editar limite de Restaurantes'));
    fireEvent.change(screen.getByLabelText('Limite de Restaurantes'), { target: { value: '0' } });
    fireEvent.click(within(rowOf('Restaurantes')).getByText('Salvar'));
    await waitFor(() => expect(budgetOps.onDelete).toHaveBeenCalledWith('b2', 11, 2026));
    expect(budgetOps.onUpsert).not.toHaveBeenCalled();
  });

  it('always offers to copy last month, also when the month already has limits', () => {
    setup();
    expect(screen.getByRole('button', { name: /Copiar mês anterior/ })).toBeTruthy();
    cleanup();
    setup({ budgets: [] });
    expect(screen.getByRole('button', { name: /Copiar mês anterior/ })).toBeTruthy();
  });

  it('asks before copying, shows what changes, and saves nothing if cancelled', async () => {
    setup({ budgets: [{ id: 'b1', categoryId: 'mer', limitAmount: 1800, spentAmount: 100 }] });
    fireEvent.click(screen.getByRole('button', { name: /Copiar mês anterior/ }));
    expect(screen.getByText('Copiar limites do mês anterior?')).toBeTruthy();
    await screen.findByText('Copiar 2 limites');
    expect(repo.listBudgets).toHaveBeenCalledWith(10, 2026);
    const list = document.querySelector('.bud-copy-list');
    expect(list.textContent).toContain('Lazer');
    expect(list.textContent).toContain('novo');
    expect(list.textContent).toContain(`substitui ${R$(1800)}`);
    fireEvent.click(screen.getByText('Cancelar'));
    expect(screen.queryByText('Copiar limites do mês anterior?')).toBeNull();
    expect(repo.upsertBudget).not.toHaveBeenCalled();
  });

  it('on confirm saves every new and changed limit on the server, reloads and tells', async () => {
    const notify = vi.fn();
    const { loadBudgets } = setup({ notify, budgets: [{ id: 'b1', categoryId: 'mer', limitAmount: 1800, spentAmount: 100 }] });
    fireEvent.click(screen.getByRole('button', { name: /Copiar mês anterior/ }));
    fireEvent.click(await screen.findByText('Copiar 2 limites'));
    await waitFor(() => expect(notify).toHaveBeenCalledWith('2 limites copiados de outubro de 2026.', 'success'));
    expect(repo.upsertBudget).toHaveBeenCalledWith({ categoryId: 'laz', month: 11, year: 2026, limitAmount: 500 });
    expect(repo.upsertBudget).toHaveBeenCalledWith({ categoryId: 'mer', month: 11, year: 2026, limitAmount: 2000 });
    expect(loadBudgets).toHaveBeenLastCalledWith(11, 2026);
    expect(screen.queryByText('Copiar limites do mês anterior?')).toBeNull();
  });

  it('says there is nothing to copy when the months already match', async () => {
    setup({ budgets: [
      { id: 'b1', categoryId: 'mer', limitAmount: 2000, spentAmount: 0 },
      { id: 'b3', categoryId: 'laz', limitAmount: 500, spentAmount: 0 },
    ] });
    fireEvent.click(screen.getByRole('button', { name: /Copiar mês anterior/ }));
    expect(await screen.findByText(/já são iguais aos de outubro de 2026/)).toBeTruthy();
    expect(screen.queryByText(/^Copiar d/)).toBeNull();
  });

  it('keeps the dialog open with the error when the server fails', async () => {
    repo.upsertBudget.mockResolvedValueOnce(null).mockRejectedValueOnce(new Error('offline'));
    setup({ budgets: [] });
    fireEvent.click(screen.getByRole('button', { name: /Copiar mês anterior/ }));
    fireEvent.click(await screen.findByText('Copiar 2 limites'));
    expect(await screen.findByText(/1 de 2 já foram salvos/)).toBeTruthy();
    expect(screen.getByText('Copiar 2 limites')).toBeTruthy();
  });

  it('points to Meu Lar when there is no expense category', () => {
    setup({ categories: [categories[3]], budgets: [] });
    expect(screen.getByText('Criar categorias em Meu Lar').getAttribute('href')).toBe('#household/categories');
  });
});
