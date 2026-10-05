import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react';
import React from 'react';
import HealthView from '../../HealthView';
import HlVerdict from '../HlVerdict';
import HlPillars from '../HlPillars';
import HlSavings from '../HlSavings';
import HlEvolution from '../HlEvolution';
import HlFuture from '../HlFuture';
import { evaluateHealth } from '../../logic/score';
import { monthSeries, savingOpportunities, futurePlan } from '../../logic/metrics';
import { tx, box, categories } from '../../logic/__tests__/fixtures';

// jsdom não implementa ResizeObserver; os gráficos desta tela são SVG/HTML e
// não o usam, mas o MonthSelector e a árvore de animação podem observar.
globalThis.ResizeObserver = globalThis.ResizeObserver || class {
  observe() {} unobserve() {} disconnect() {}
};

afterEach(cleanup);

const MONTH = '2026-06';
const income = (amount, date) => tx({ type: 'income', amount, date });

const rows = [
  income(10000, '2026-06-05'), income(10000, '2026-05-05'), income(10000, '2026-04-05'),
  tx({ amount: 2000, recurrence: 'fixed', categoryId: 'c-moradia', date: '2026-06-06' }),
  tx({ amount: 500, recurrence: 'installment', description: 'Notebook (4/12)', date: '2026-06-07' }),
  tx({ amount: 900, categoryId: 'c-lazer', date: '2026-06-08' }),
  tx({ amount: 400, categoryId: 'c-lazer', date: '2026-05-08' }),
  tx({ amount: 400, categoryId: 'c-lazer', date: '2026-04-08' }),
  tx({ amount: 400, categoryId: 'c-lazer', date: '2026-03-08' }),
  tx({ amount: 3000, categoryId: 'c-mercado', date: '2026-05-09' }),
  tx({ amount: 3000, categoryId: 'c-mercado', date: '2026-04-09' }),
  tx({ amount: 3000, categoryId: 'c-mercado', date: '2026-03-09' }),
  tx({ amount: 2000, recurrence: 'fixed', categoryId: 'c-moradia', date: '2026-07-06' }),
  tx({ amount: 500, recurrence: 'installment', description: 'Notebook (5/12)', date: '2026-07-07' }),
  tx({ amount: 2000, recurrence: 'fixed', categoryId: 'c-moradia', date: '2026-08-06' }),
];
const accounts = [box({ id: 'b1', name: 'Viagem', balance: 2500, savingsGoal: 10000 })];
const data = { transactions: rows, accounts, categories, cards: [], members: [] };

describe('HealthView', () => {
  it('renders the seven mandatory widgets in the fixed order', () => {
    render(<HealthView data={data} activeMonth={MONTH} setActiveMonth={() => {}} />);
    const titles = screen.getAllByRole('heading', { level: 2 }).map(h => h.textContent);
    expect(titles).toEqual([
      'Veredito', 'Resultado do mês', 'Pilares da saúde', 'Onde economizar',
      'Para onde vai o dinheiro', 'Evolução (6 meses)', 'Plano de futuro',
    ]);
  });

  it('shows the month selector with the active month', () => {
    render(<HealthView data={data} activeMonth={MONTH} setActiveMonth={() => {}} />);
    expect(screen.getByText(/Junho 2026/)).toBeTruthy();
  });

  it('renders explicit empty states with no data at all', () => {
    render(<HealthView data={{ transactions: [], accounts: [], categories: [], cards: [], members: [] }}
      activeMonth={MONTH} setActiveMonth={() => {}} />);
    expect(screen.getAllByText(/Sem dados suficientes|Sem lançamentos|Sem despesas/).length).toBeGreaterThan(0);
    expect(document.body.textContent).not.toMatch(/NaN|Infinity/);
  });

  it('never prints NaN or Infinity with populated data', () => {
    render(<HealthView data={data} activeMonth={MONTH} setActiveMonth={() => {}} />);
    expect(document.body.textContent).not.toMatch(/NaN|Infinity/);
  });

  it('does not crash when data props are missing', () => {
    render(<HealthView activeMonth={MONTH} setActiveMonth={() => {}} />);
    expect(screen.getByText('Veredito')).toBeTruthy();
  });
});

describe('HlVerdict', () => {
  it('shows score, label with icon text and the headline', () => {
    const health = evaluateHealth(rows, accounts, MONTH);
    render(<HlVerdict health={health} />);
    expect(screen.getByText(String(health.score))).toBeTruthy();
    expect(screen.getByText(health.label)).toBeTruthy();
    expect(screen.getByText(health.headline)).toBeTruthy();
  });

  it('explains the cap when the month is negative', () => {
    const health = evaluateHealth([tx({ amount: 1000 }), ...['2026-03', '2026-04', '2026-05'].map(m => tx({ amount: 1000, date: `${m}-10` }))],
      [box({ balance: 6000 })], MONTH);
    render(<HlVerdict health={health} />);
    expect(screen.getByText(/limitado a Atenção/)).toBeTruthy();
  });

  it('shows a dash instead of a score without data', () => {
    render(<HlVerdict health={evaluateHealth([], [box({ balance: 1 })], MONTH)} />);
    expect(screen.getAllByText('Sem dados suficientes').length).toBeGreaterThan(0);
    expect(screen.getByText('—')).toBeTruthy();
  });
});

describe('HlPillars', () => {
  it('lists the four pillars with reasons and a status label', () => {
    render(<HlPillars health={evaluateHealth(rows, accounts, MONTH)} />);
    for (const name of ['Poupança', 'Compromisso da renda', 'Reserva de emergência', 'Estabilidade do mês']) {
      expect(screen.getAllByText(name).length).toBeGreaterThan(0);
    }
    expect(screen.getAllByRole('meter')).toHaveLength(4);
    expect(document.body.textContent).toMatch(/meta 20%/);
  });
});

describe('HlSavings', () => {
  it('ranks categories above the average and offers a table view', () => {
    const opp = savingOpportunities(rows, categories, MONTH);
    expect(opp.mode).toBe('excess');
    render(<HlSavings opportunities={opp} />);
    expect(screen.getByText(/Lazer/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Tabela' }));
    expect(screen.getByRole('columnheader', { name: 'Excesso' })).toBeTruthy();
  });

  it('uses a neutral message when nothing exceeds the average', () => {
    render(<HlSavings opportunities={{ mode: 'top-variable', items: [{ id: 'c-lazer', name: 'Lazer', icon: '🎮', value: 100 }] }} />);
    expect(screen.getByText(/Nenhuma categoria passou 20%/)).toBeTruthy();
  });

  it('shows an empty state without items', () => {
    render(<HlSavings opportunities={{ mode: 'top-variable', items: [] }} />);
    expect(screen.getByText(/Sem despesas variáveis/)).toBeTruthy();
  });
});

describe('HlEvolution', () => {
  it('reads the focused month in the readout and switches to a table', () => {
    render(<HlEvolution series={monthSeries(rows, MONTH, 6)} />);
    const hits = screen.getAllByRole('img').filter(el => el.getAttribute('aria-label')?.startsWith('Mar:'));
    expect(hits.length).toBe(2);
    fireEvent.focus(hits[0]);
    expect(screen.getAllByText('Mar').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Tabela' }));
    expect(screen.getByRole('columnheader', { name: 'Taxa de poupança' })).toBeTruthy();
  });
});

describe('HlFuture', () => {
  it('shows commitments, the relief month and goal progress', () => {
    const plan = futurePlan(rows, MONTH);
    render(<HlFuture plan={plan} goals={[{ id: 'b1', name: 'Viagem', balance: 2500, goal: 10000, pct: 25, remaining: 7500 }]} />);
    expect(screen.getByText(/A folga aumenta em/)).toBeTruthy();
    const goal = screen.getByLabelText(/Viagem: .*de .*25%/);
    expect(within(goal).getByText(/faltam/)).toBeTruthy();
  });

  it('degrades to explicit empty states', () => {
    render(<HlFuture plan={futurePlan([], MONTH)} goals={[]} />);
    expect(screen.getByText(/Nenhum fixo ou parcela/)).toBeTruthy();
    expect(screen.getByText(/Nenhuma caixinha com meta/)).toBeTruthy();
    expect(screen.getByText(/Sem renda nos últimos 3 meses/)).toBeTruthy();
  });
});
