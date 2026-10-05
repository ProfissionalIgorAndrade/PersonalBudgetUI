import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

vi.mock('../../../../../data/repositories/cardRepository', () => ({ getStatement: vi.fn() }));

import * as cardRepository from '../../../../../data/repositories/cardRepository';
import HealthView from '../../../HealthView';
import { CATALOG, LAYOUT_KEY, MANDATORY_IDS } from '../../../layout';
import { CATALOG_COMPONENTS } from '../index';
import HcInvoices from '../HcInvoices';
import HcPace from '../HcPace';
import HcSubscriptions from '../HcSubscriptions';
import { tx, box, categories } from '../../../logic/__tests__/fixtures';

// jsdom não implementa ResizeObserver; os gráficos são SVG/HTML, mas o
// MonthSelector da HealthView pode observar.
globalThis.ResizeObserver = globalThis.ResizeObserver || class {
  observe() {} unobserve() {} disconnect() {}
};

afterEach(cleanup);
beforeEach(() => { localStorage.clear(); vi.mocked(cardRepository.getStatement).mockReset(); vi.mocked(cardRepository.getStatement).mockResolvedValue({ transactions: [] }); });

const MONTH = '2026-06';
const TODAY = new Date(2026, 5, 15);
const income = (amount, date, over = {}) => tx({ type: 'income', amount, date, ...over });
const cats = [...categories, { id: 'c-ass', name: 'Assinaturas', icon: '📺' }];
const cards = [{ id: 'k1', name: 'Roxinho', limit: 5000 }, { id: 'k2', name: 'Azulão', limit: 0 }];
const members = [{ id: 'm1', name: 'Igor', emoji: '🧑' }];
const accounts = [
  { id: 'a1', name: 'Itaú', kind: 'checking', balance: 4000, isActive: true },
  box({ id: 'b1', name: 'Viagem', balance: 2500, savingsGoal: 10000 }),
];

const rows = [
  income(10000, '2026-06-05', { memberId: 'm1' }), income(10000, '2026-05-05'), income(10000, '2026-04-05'), income(10000, '2026-03-05'),
  tx({ amount: 2000, recurrence: 'fixed', categoryId: 'c-moradia', date: '2026-06-06', memberId: 'm1', reviewed: true }),
  tx({ amount: 40, recurrence: 'fixed', categoryId: 'c-ass', description: 'Netflix', date: '2026-06-09' }),
  tx({ amount: 500, recurrence: 'installment', recurrenceId: 'r1', description: 'Notebook (4/12)', date: '2026-06-07', cardId: 'k1', accountId: '' }),
  tx({ amount: 500, recurrence: 'installment', recurrenceId: 'r1', description: 'Notebook (5/12)', date: '2026-07-07' }),
  tx({ amount: 900, categoryId: 'c-lazer', date: '2026-06-08', accountId: 'a1' }),
  ...['2026-05', '2026-04', '2026-03'].map(m => tx({ amount: 400, categoryId: 'c-lazer', date: `${m}-08` })),
  ...['2026-05', '2026-04', '2026-03'].map(m => tx({ amount: 3000, categoryId: 'c-mercado', date: `${m}-09` })),
];
const savingsTransactions = [{ id: 's1', type: 'savings', accountId: 'b1', amount: 500, date: '2026-06-02', savingsDirection: 'in', description: 'Aporte' }];

const normal = { transactions: rows, accounts, cards, members, categories: cats, savingsTransactions, month: MONTH, today: TODAY };
const empty = { transactions: [], accounts: [], cards: [], members: [], categories: [], savingsTransactions: [], month: MONTH, today: TODAY };

describe('catalog widgets', () => {
  it('has a component for every registry entry', () => {
    expect(Object.keys(CATALOG_COMPONENTS).sort()).toEqual(CATALOG.map(w => w.id).sort());
  });

  for (const w of CATALOG) {
    describe(w.title, () => {
      const Widget = CATALOG_COMPONENTS[w.id];

      it('renders with normal data, titled, without NaN or Infinity', async () => {
        const { container } = render(<Widget {...normal} />);
        expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(w.title);
        await waitFor(() => expect(container.textContent).not.toMatch(/carregando/));
        expect(container.textContent).not.toMatch(/NaN|Infinity|undefined/);
      });

      it('renders an explicit state with no data, without NaN or Infinity', async () => {
        const { container } = render(<Widget {...empty} />);
        expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(w.title);
        expect(container.textContent).not.toMatch(/NaN|Infinity|undefined/);
        expect(container.querySelector('.hl-empty')).toBeTruthy();
      });

      it('does not crash when props are missing', () => {
        expect(() => render(<Widget month={MONTH} />)).not.toThrow();
      });
    });
  }

  it('offers a table twin where there is a chart', () => {
    for (const id of ['cashflow', 'share', 'trend', 'increases', 'member-expense', 'member-income', 'income-sources',
      'balances', 'review', 'rule', 'weekday', 'projection', 'pace', 'invoices']) {
      const Widget = CATALOG_COMPONENTS[id];
      const { unmount } = render(<Widget {...normal} />);
      fireEvent.click(screen.getByRole('button', { name: 'Tabela' }));
      expect(screen.getAllByRole('table').length, id).toBeGreaterThan(0);
      unmount();
    }
  });
});

describe('HcInvoices', () => {
  it('shows the statement total and the limit usage per card', async () => {
    vi.mocked(cardRepository.getStatement).mockImplementation(async (id) =>
      (id === 'k1' ? { transactions: [{ id: 'x', amount: 1000, type: 'Expense' }, { id: 'y', amount: 100, transactionType: 'Income' }] } : { transactions: [] }));
    render(<HcInvoices cards={cards} month={MONTH} />);
    await waitFor(() => expect(screen.getByLabelText(/Roxinho: .*900,00.*22%/)).toBeTruthy());
    expect(cardRepository.getStatement).toHaveBeenCalledWith('k1', 6, 2026);
    expect(screen.getByText(/Cartão sem limite cadastrado/)).toBeTruthy();
  });

  it('treats 404 and errors as "sem fatura" without crashing', async () => {
    vi.mocked(cardRepository.getStatement).mockRejectedValue(Object.assign(new Error('Not found'), { status: 404 }));
    const { container } = render(<HcInvoices cards={cards} month={MONTH} />);
    await waitFor(() => expect(screen.getAllByText('sem fatura')).toHaveLength(2));
    expect(container.textContent).not.toMatch(/NaN|Infinity/);
  });

  it('shows loading first', () => {
    vi.mocked(cardRepository.getStatement).mockReturnValue(new Promise(() => {}));
    render(<HcInvoices cards={cards} month={MONTH} />);
    expect(screen.getAllByText('carregando…')).toHaveLength(2);
  });

  it('ignores a late response from the previous month', async () => {
    let resolveJune;
    vi.mocked(cardRepository.getStatement).mockImplementation((id, m) => (m === 6
      ? new Promise(r => { resolveJune = r; })
      : Promise.resolve({ transactions: [{ id: 'j', amount: 111, type: 'Expense' }] })));
    const one = [cards[0]];
    const { rerender } = render(<HcInvoices cards={one} month="2026-06" />);
    rerender(<HcInvoices cards={one} month="2026-07" />);
    await waitFor(() => expect(screen.getByLabelText(/Roxinho: .*111,00/)).toBeTruthy());
    resolveJune({ transactions: [{ id: 'z', amount: 999, type: 'Expense' }] });
    await Promise.resolve();
    expect(screen.queryByLabelText(/999,00/)).toBeNull();
    expect(screen.getByLabelText(/Roxinho: .*111,00/)).toBeTruthy();
  });

  it('shows an empty state without cards and does not call the API', () => {
    render(<HcInvoices cards={[]} month={MONTH} />);
    expect(screen.getByText('Nenhum cartão cadastrado.')).toBeTruthy();
    expect(cardRepository.getStatement).not.toHaveBeenCalled();
  });
});

describe('HcPace', () => {
  it('says the month is in the future instead of drawing an empty chart', () => {
    render(<HcPace {...normal} month="2026-09" />);
    expect(screen.getByText(/Mês futuro/)).toBeTruthy();
  });

  it('labels the state with icon text, not only color', () => {
    render(<HcPace {...normal} />);
    expect(screen.getByText(/No ritmo|Acima do ritmo|Muito acima do ritmo/)).toBeTruthy();
  });
});

describe('HcSubscriptions', () => {
  it('lists the fixed expenses of the Assinaturas category with the yearly cost', () => {
    render(<HcSubscriptions {...normal} />);
    expect(screen.getByText('Netflix')).toBeTruthy();
    expect(screen.getByText(/por ano/)).toBeTruthy();
  });

  it('explains how to start when there is no matching category', () => {
    render(<HcSubscriptions {...normal} categories={categories} />);
    expect(screen.getByText(/Nenhuma categoria com "Assinaturas"/)).toBeTruthy();
  });
});

describe('HealthView extras', () => {
  const view = (extra = {}) => render(<HealthView data={{ transactions: rows, accounts, categories: cats, cards, members }}
    savingsTransactions={savingsTransactions} activeMonth={MONTH} setActiveMonth={() => {}} {...extra} />);

  it('shows no extras by default, only a hint to customize', () => {
    view();
    expect(screen.getAllByRole('heading', { level: 2 }).map(h => h.textContent)).toHaveLength(7);
    expect(screen.getByText(/Use "Personalizar"/)).toBeTruthy();
  });

  it('renders enabled widgets in the saved order, below the mandatory ones', () => {
    localStorage.setItem(LAYOUT_KEY, JSON.stringify([{ id: 'weekday', on: true }, { id: 'rule', on: true }]));
    view();
    const titles = screen.getAllByRole('heading', { level: 2 }).map(h => h.textContent);
    expect(titles.slice(7)).toEqual(['Extras', 'Padrão por dia da semana', 'Regra 50/30/20']);
    expect(MANDATORY_IDS).toHaveLength(7);
  });

  it('opens the customizer from the header and turns a widget on', () => {
    view();
    fireEvent.click(screen.getByRole('button', { name: 'Personalizar' }));
    fireEvent.click(screen.getByLabelText(/Assinaturas/));
    fireEvent.click(screen.getByRole('button', { name: 'Concluir' }));
    expect(screen.getByRole('heading', { level: 2, name: 'Assinaturas' })).toBeTruthy();
    expect(JSON.parse(localStorage.getItem(LAYOUT_KEY)).find(w => w.id === 'subscriptions').on).toBe(true);
  });

  it('never prints NaN or Infinity with every extra on', async () => {
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(CATALOG.map(w => ({ id: w.id, on: true }))));
    const { container } = view();
    await waitFor(() => expect(container.textContent).not.toMatch(/carregando/));
    expect(container.textContent).not.toMatch(/NaN|Infinity/);
  });
});
