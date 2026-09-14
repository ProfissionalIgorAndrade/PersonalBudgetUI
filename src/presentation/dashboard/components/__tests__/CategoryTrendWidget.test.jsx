import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import React from 'react';
import CategoryTrendWidget from '../CategoryTrendWidget';

// Chart.js needs a real canvas; the chart view is exercised through its
// presence, not its pixels.
vi.mock('../../../shared/components/charts/GroupedBars', () => ({
  default: ({ labels, series }) => (
    <div data-testid="chart" data-labels={labels.join('|')} data-series={series.map(s => `${s.label}:${s.data.join(',')}`).join('|')} />
  ),
}));

// jsdom não implementa ResizeObserver, que o gráfico passou a observar.
globalThis.ResizeObserver = globalThis.ResizeObserver || class {
  observe() {} unobserve() {} disconnect() {}
};

afterEach(cleanup);

const months = [
  { key: '2026-07', label: 'Jul/26', color: '#3b82f6' },
  { key: '2026-08', label: 'Ago/26', color: '#f97316' },
  { key: '2026-09', label: 'Set/26', color: '#22c55e' },
];

const rows = [
  { id: 'c1', name: 'Moradia',    icon: '🏠', values: { '2026-07': 6748.83, '2026-08': 6871.31, '2026-09': 6860.17 }, total: 20480 },
  { id: 'c2', name: 'Transporte', icon: '🚗', values: { '2026-07': 3346.99, '2026-08': 2846.62, '2026-09': 3997.71 }, total: 10191 },
  { id: 'c3', name: 'Viagens',    icon: '✈️', values: { '2026-07': 2935.60, '2026-09': 544.40 }, total: 3480 },
];

const widget = (props = {}) => (
  <CategoryTrendWidget months={months} rows={rows} monthsCount={3} onChangeMonths={() => {}} {...props} />
);

describe('CategoryTrendWidget', () => {
  it('opens on the chart view with one series per month', () => {
    render(widget());
    const chart = screen.getByTestId('chart');
    expect(chart.dataset.labels).toBe('Moradia|Transporte|Viagens');
    expect(chart.dataset.series).toContain('Jul/26:6748.83,3346.99,2935.6');
  });

  it('sends zero for a category with no spending that month', () => {
    render(widget());
    // Viagens has nothing in August.
    expect(screen.getByTestId('chart').dataset.series).toContain('Ago/26:6871.31,2846.62,0');
  });

  it('switches to the table view', () => {
    render(widget());
    fireEvent.click(screen.getByTitle('Ver como tabela'));
    expect(screen.getByText('Categoria')).toBeTruthy();
    expect(screen.getByText(/6.748,83/)).toBeTruthy();
  });

  it('shows a dash rather than zero for a month with no spending', () => {
    render(widget());
    fireEvent.click(screen.getByTitle('Ver como tabela'));
    const viagens = screen.getByText(/Viagens/).closest('tr');
    expect(viagens.textContent).toContain('—');
  });

  it('marks a rise in red and a fall in green', () => {
    render(widget());
    fireEvent.click(screen.getByTitle('Ver como tabela'));
    const transporte = screen.getByText(/Transporte/).closest('tr');
    // 3346.99 -> 3997.71 is a rise
    expect(transporte.textContent).toMatch(/\+19%/);
    const viagens = screen.getByText(/Viagens/).closest('tr');
    expect(viagens.textContent).toMatch(/-81%/);
  });

  it('reports a change of month count', () => {
    const onChangeMonths = vi.fn();
    render(widget({ onChangeMonths }));
    fireEvent.change(screen.getByLabelText('Meses comparados'), { target: { value: '6' } });
    expect(onChangeMonths).toHaveBeenCalledWith(6);
  });

  it('shows an empty state with no rows', () => {
    render(widget({ rows: [] }));
    expect(screen.getByText(/Sem despesas no período/)).toBeTruthy();
  });
});

describe('chart sizing', () => {
  const sized = (n) => {
    const many = Array.from({ length: n }, (_, i) => ({
      id: `x${i}`, name: `Cat ${i}`, icon: '📦',
      values: { '2026-07': 100, '2026-08': 100, '2026-09': 100 }, total: 300,
    }));
    const { container } = render(
      <CategoryTrendWidget months={months} rows={many} monthsCount={3} onChangeMonths={() => {}} />);
    return container.querySelector('[data-testid="chart"]').parentElement.style.height;
  };

  it('keeps a floor so a short list is not a sliver', () => {
    expect(sized(3)).toBe('340px');
  });

  it('grows with the number of categories', () => {
    expect(sized(16)).toBe('544px');
  });

  it('stops growing so the card cannot run away', () => {
    expect(sized(40)).toBe('620px');
  });
});
