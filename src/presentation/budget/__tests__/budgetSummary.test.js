import { describe, it, expect } from 'vitest';
import { budgetRows, budgetSummary, monthName, pctLabel, statusOf, NEAR_RATIO, previousMonth, copyPlan } from '../budgetSummary';

const categories = [
  { id: 'sal', name: 'Salário',      type: 'income' },
  { id: 'mer', name: 'Mercado',      type: 'expense' },
  { id: 'res', name: 'Restaurantes', type: 'expense' },
  { id: 'pet', name: 'Pets',         type: 'expense' },
  { id: 'laz', name: 'Lazer',        type: 'expense' },
  { id: 'via', name: 'Viagens',      type: 'expense' },
  { id: 'edu', name: 'Educação',     type: 'expense' },
];
const budgets = [
  { id: 'b1', categoryId: 'mer', limitAmount: 2600, spentAmount: 2432 },  // 94%: perto
  { id: 'b2', categoryId: 'res', limitAmount: 1000, spentAmount: 1104 },  // 104 acima
  { id: 'b3', categoryId: 'pet', limitAmount: 360,  spentAmount: 387 },   // 27 acima
  { id: 'b4', categoryId: 'laz', limitAmount: 800,  spentAmount: 450 },   // 56%: ok
];

describe('statusOf', () => {
  it('reads none, ok, near and over against the limit', () => {
    expect(statusOf(100, 0)).toBe('none');
    expect(statusOf(100, 1000)).toBe('ok');
    expect(statusOf(1000 * NEAR_RATIO, 1000)).toBe('near');
    expect(statusOf(1000, 1000)).toBe('near');
    expect(statusOf(1000.01, 1000)).toBe('over');
  });
});

describe('budgetRows', () => {
  it('ignores income, puts the most overrun first, then the tightest, then the rest', () => {
    const { limited } = budgetRows(categories, budgets);
    expect(limited.map(r => r.cat.id)).toEqual(['res', 'pet', 'mer', 'laz']);
    expect(limited.map(r => r.status)).toEqual(['over', 'over', 'near', 'ok']);
  });

  it('lists categories without a limit alphabetically, in Portuguese order', () => {
    const { free } = budgetRows(categories, budgets);
    expect(free.map(r => r.cat.name)).toEqual(['Educação', 'Viagens']);
    expect(free.every(r => r.ratio === null)).toBe(true);
  });
});

describe('budgetSummary', () => {
  it('adds up only the categories with a limit, as shown on screen', () => {
    const s = budgetSummary(budgetRows(categories, budgets));
    expect(s.limit).toBe(2600 + 1000 + 360 + 800);
    expect(s.spent).toBe(2432 + 1104 + 387 + 450);
    expect(s.left).toBe(s.limit - s.spent);
    expect(s.overCount).toBe(2);
    expect(s.overAmount).toBe(104 + 27);
    expect(s.nearCount).toBe(1);
    expect(s.limitedCount).toBe(4);
    expect(s.freeCount).toBe(2);
  });

  it('has no ratio when there is no limit at all', () => {
    const s = budgetSummary(budgetRows(categories, []));
    expect(s.ratio).toBeNull();
    expect(s.limit).toBe(0);
    expect(s.freeCount).toBe(6);
  });
});

describe('labels', () => {
  it('names the month in full and rounds the percentage', () => {
    expect(monthName('2026-11')).toBe('novembro de 2026');
    expect(monthName('')).toBe('');
    expect(pctLabel(0.936)).toBe('94%');
    expect(pctLabel(12)).toBe('>999%');
    expect(pctLabel(null)).toBe('—');
  });
});

describe('copying last month', () => {
  it('steps back a month, across the year too', () => {
    expect(previousMonth('2026-11')).toBe('2026-10');
    expect(previousMonth('2026-01')).toBe('2025-12');
  });

  it('creates what is missing, replaces what differs and leaves the rest alone', () => {
    const previous = [
      { categoryId: 'mer', limitAmount: 2600 },   // existe com outro valor: substitui
      { categoryId: 'res', limitAmount: 1000 },   // igual: não muda
      { categoryId: 'laz', limitAmount: 800 },    // não existe: cria
      { categoryId: 'old', limitAmount: 300 },    // categoria apagada: ignora
      { categoryId: 'sal', limitAmount: 999 },    // receita: ignora
    ];
    const current = [
      { categoryId: 'mer', limitAmount: 2000 },
      { categoryId: 'res', limitAmount: 1000 },
      { categoryId: 'pet', limitAmount: 360 },    // só no mês atual: fica
    ];
    const plan = copyPlan(previous, current, categories);
    expect(plan.create.map(i => [i.cat.id, i.limitAmount])).toEqual([['laz', 800]]);
    expect(plan.update.map(i => [i.cat.id, i.from, i.limitAmount])).toEqual([['mer', 2000, 2600]]);
    expect(plan.same).toBe(1);
  });
});
