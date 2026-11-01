import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react';
import React from 'react';
import PlanningView from '../PlanningView';

const h = vi.hoisted(() => ({ calls: 0, state: null }));
vi.mock('../../../application/hooks/useSimulator', () => ({
  useSimulator: () => { h.calls += 1; return h.state; },
}));
// As seções têm testes próprios; aqui interessa a tela que as junta.
vi.mock('../../health/HealthView', () => ({
  default: ({ activeMonth }) => <h2 id="hh-health-title" tabIndex={-1}>Saúde financeira {activeMonth}</h2>,
}));
vi.mock('../../simulator/SimulatorView', () => ({
  SimulatorScreen: ({ sim }) => <h2 id="hh-simulator-title" tabIndex={-1}>E se...? {sim.simulations.length}</h2>,
}));

afterEach(() => { cleanup(); h.calls = 0; });

const categories = [
  { id: 'mer', name: 'Mercado', type: 'expense', icon: '🛒', color: '#2dd4bf' },
  { id: 'res', name: 'Restaurantes', type: 'expense', icon: '🍽️', color: '#fb923c' },
];

const setup = (over = {}) => {
  h.state = { simulations: [{ id: 's1', enabled: true }, { id: 's2', enabled: false }, { id: 's3', enabled: true }], loading: false };
  const props = {
    section: 'health', onSection: vi.fn(),
    data: { transactions: [], accounts: [], categories, members: [] },
    activeMonth: '2026-11', setActiveMonth: vi.fn(),
    budgets: [
      { id: 'b1', categoryId: 'mer', limitAmount: 1000, spentAmount: 500 },
      { id: 'b2', categoryId: 'res', limitAmount: 500, spentAmount: 600 },
    ],
    loadBudgets: vi.fn(), budgetOps: { onUpsert: vi.fn(), onDelete: vi.fn() },
    authSession: { userId: 'u1' },
    ...over,
  };
  const utils = render(<PlanningView {...props} />);
  return { props, ...utils };
};

const nav = () => screen.getByRole('navigation', { name: 'Seções de Planejamento' });
const link = (name) => within(nav()).getByRole('link', { name: new RegExp(`^${name.replace(/[.?]/g, '\\$&')}`) });

describe('PlanningView', () => {
  it('answers each section at a glance in the sub-menu', () => {
    setup();
    expect(link('Saúde financeira').textContent).toContain('Sem dados suficientes');
    expect(link('Orçamentos').textContent).toContain('1 categoria acima do limite');
    expect(link('Orçamentos').textContent).toContain('73%'); // 1.100 de 1.500 no total
    expect(link('E se...?').textContent).toContain('3 simulações · 2 ligadas');
  });

  it('loads the simulations once and shares them with the section', () => {
    setup({ section: 'simulator' });
    expect(h.calls).toBe(1);
    expect(screen.getByRole('heading', { name: 'E se...? 3' })).toBeTruthy();
  });

  it('keeps every section mounted and shows only the active one', () => {
    setup({ section: 'budgets' });
    const budgetsPanel = screen.getByRole('heading', { name: 'Orçamentos' }).closest('section');
    const healthPanel = screen.getByRole('heading', { name: /Saúde financeira/, hidden: true }).closest('section');
    expect(budgetsPanel.hidden).toBe(false);
    expect(healthPanel.hidden).toBe(true);
    expect(link('Orçamentos').getAttribute('aria-current')).toBe('page');
  });

  it('switches section through its own address and focuses its title', () => {
    const { props, rerender } = setup();
    const target = link('Orçamentos');
    expect(target.getAttribute('href')).toBe('#planning/budgets');
    fireEvent.click(target);
    expect(props.onSection).toHaveBeenCalledWith('budgets');
    rerender(<PlanningView {...props} section="budgets" />);
    expect(document.activeElement.id).toBe('hh-budgets-title');
  });

  it('says when there is no limit and no simulation yet', () => {
    h.state = { simulations: [], loading: false };
    render(<PlanningView section="health" data={{ categories }} budgets={[]} activeMonth="2026-11" />);
    expect(link('Orçamentos').textContent).toContain('Nenhum limite no mês');
    expect(link('E se...?').textContent).toContain('Nenhuma simulação');
  });
});
