/**
 * Métricas puras da tela de Saúde Financeira.
 *
 * Entrada: `transactions` já sem transferência e sem movimento de caixinha
 * (a separação é feita em useAppData), mais contas, categorias etc. Nada aqui
 * faz I/O nem lê relógio: o mês de referência é sempre argumento.
 *
 * Regra de ouro: nenhum resultado é NaN ou Infinity. Quando não há base para
 * calcular (sem receita, sem histórico), a função devolve `null` e quem
 * consome mostra um estado vazio explícito.
 */
import { txBelongsToMonth } from '../../../core/utils/billing';
import { goalProgress } from '../../savings/savingsHistory';
import {
  BASELINE_MONTHS, CATEGORY_EXCESS_THRESHOLD, CATEGORY_TOP_N, FUTURE_MONTHS,
} from './targets';

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** Soma `delta` meses a 'YYYY-MM', atravessando a virada de ano. */
export function addMonths(ym, delta) {
  const [y, m] = String(ym).split('-').map(Number);
  const total = y * 12 + (m - 1) + delta;
  const year = Math.floor(total / 12);
  return `${year}-${String(total - year * 12 + 1).padStart(2, '0')}`;
}

/** Os `count` meses terminando em `ym`, do mais antigo ao mais novo. */
export function monthRange(ym, count) {
  return Array.from({ length: count }, (_, i) => addMonths(ym, i - (count - 1)));
}

const isExpense = (t) => t?.type === 'expense';
const isIncome = (t) => t?.type === 'income';
const isCommitment = (t) => t.recurrence === 'fixed' || t.recurrence === 'installment';

/** Linhas de um mês, só receita e despesa (defesa extra contra transferência/caixinha). */
function monthRows(transactions, ym) {
  return (transactions || []).filter(
    t => t && (isIncome(t) || isExpense(t)) && txBelongsToMonth(t, ym));
}

/**
 * Totais de um mês. `fixed`, `variable` e `installment` dividem a despesa por
 * recorrência; `commitments` é fixo + parcelado.
 */
export function monthTotals(transactions, ym) {
  const out = { income: 0, expense: 0, fixed: 0, variable: 0, installment: 0 };
  for (const t of monthRows(transactions, ym)) {
    const amount = num(t.amount);
    if (isIncome(t)) { out.income += amount; continue; }
    out.expense += amount;
    if (t.recurrence === 'fixed') out.fixed += amount;
    else if (t.recurrence === 'installment') out.installment += amount;
    else out.variable += amount;
  }
  out.commitments = out.fixed + out.installment;
  return out;
}

/** Resumo do mês: sobra e taxa de poupança (null quando não há receita). */
export function summarizeMonth(transactions, ym) {
  const t = monthTotals(transactions, ym);
  const result = t.income - t.expense;
  return {
    ...t,
    result,
    savingsRate: t.income > 0 ? result / t.income : null,
    commitmentRate: t.income > 0 ? t.commitments / t.income : null,
  };
}

/** Variação de `current` contra `previous`: absoluta e percentual (null sem base). */
export function variation(current, previous) {
  const cur = num(current);
  const prev = num(previous);
  return {
    abs: cur - prev,
    pct: prev !== 0 ? (cur - prev) / Math.abs(prev) : null,
  };
}

/** Série mensal (receita, despesa, sobra, taxa) dos `count` meses terminando em `ym`. */
export function monthSeries(transactions, ym, count = 6) {
  return monthRange(ym, count).map(key => ({ key, ...summarizeMonth(transactions, key) }));
}

/** Os BASELINE_MONTHS meses imediatamente anteriores a `ym`. */
export const baselineMonths = (ym, count = BASELINE_MONTHS) => monthRange(addMonths(ym, -1), count);

/**
 * Despesa média mensal dos meses anteriores. Só conta meses com despesa
 * lançada: um mês vazio (conta nova, ano virando) não pode puxar a média para
 * baixo e fazer a reserva parecer maior. Null quando não há nenhum.
 */
export function averageExpense(transactions, ym, count = BASELINE_MONTHS) {
  const values = baselineMonths(ym, count)
    .map(key => monthTotals(transactions, key).expense)
    .filter(v => v > 0);
  if (values.length === 0) return null;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

/**
 * Reserva de emergência: soma de todas as caixinhas ÷ despesa média mensal.
 * state: 'ok' | 'no-boxes' | 'no-expense'. `months` só existe em 'ok'.
 */
export function reserveCoverage(accounts, avgExpense) {
  const boxes = (accounts || []).filter(a => a?.kind === 'savings');
  if (boxes.length === 0) return { state: 'no-boxes', total: 0, months: null, boxes: 0 };
  const total = boxes.reduce((s, b) => s + Math.max(num(b.balance), 0), 0);
  if (!avgExpense || avgExpense <= 0) return { state: 'no-expense', total, months: null, boxes: boxes.length };
  return { state: 'ok', total, months: total / avgExpense, boxes: boxes.length };
}

/** Estabilidade: despesa do mês contra a média anterior. Null sem histórico. */
export function stability(transactions, ym) {
  const avg = averageExpense(transactions, ym);
  if (avg === null) return null;
  const expense = monthTotals(transactions, ym).expense;
  return { expense, average: avg, ratio: expense / avg };
}

/** Despesa por categoria num mês: { [categoryId]: total }. */
function expenseByCategory(transactions, ym) {
  const acc = {};
  for (const t of monthRows(transactions, ym)) {
    if (!isExpense(t)) continue;
    const key = t.categoryId || '';
    acc[key] = (acc[key] || 0) + num(t.amount);
  }
  return acc;
}

function categoryInfo(categories, id) {
  const c = (categories || []).find(x => x.id === id);
  return { id, name: c?.name || 'Sem categoria', icon: c?.icon || '📦' };
}

/**
 * Categorias com despesa no mês >= 20% acima da média dos 3 meses anteriores.
 * A média usa divisor fixo 3 (soma dos 3 meses ÷ 3), então uma categoria nova
 * ou esporádica não é tratada como "estourou" por falta de base: sem gasto
 * nos meses anteriores (média 0) ela fica de fora.
 *
 * Devolve { mode: 'excess', items } ordenado pelo excesso em R$ (top 5); se
 * nada passa do limite, { mode: 'top-variable', items } com as maiores
 * categorias variáveis do mês.
 */
export function savingOpportunities(transactions, categories, ym) {
  const current = expenseByCategory(transactions, ym);
  const prev = baselineMonths(ym).map(key => expenseByCategory(transactions, key));

  const excess = Object.entries(current)
    .map(([id, value]) => {
      const average = prev.reduce((s, m) => s + (m[id] || 0), 0) / BASELINE_MONTHS;
      return { ...categoryInfo(categories, id), value, average, excess: value - average,
        excessPct: average > 0 ? (value - average) / average : null };
    })
    .filter(c => c.average > 0 && c.value >= c.average * (1 + CATEGORY_EXCESS_THRESHOLD))
    .sort((a, b) => b.excess - a.excess)
    .slice(0, CATEGORY_TOP_N);

  if (excess.length > 0) return { mode: 'excess', items: excess };

  const variable = {};
  for (const t of monthRows(transactions, ym)) {
    if (!isExpense(t) || t.recurrence === 'fixed' || t.recurrence === 'installment') continue;
    const key = t.categoryId || '';
    variable[key] = (variable[key] || 0) + num(t.amount);
  }
  const items = Object.entries(variable)
    .map(([id, value]) => ({ ...categoryInfo(categories, id), value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, CATEGORY_TOP_N);
  return { mode: 'top-variable', items };
}

/** Maiores categorias de despesa do mês, com participação no total. */
export function topCategories(transactions, categories, ym, limit = CATEGORY_TOP_N) {
  const byCat = expenseByCategory(transactions, ym);
  const total = Object.values(byCat).reduce((s, v) => s + v, 0);
  return Object.entries(byCat)
    .map(([id, value]) => ({ ...categoryInfo(categories, id), value, share: total > 0 ? value / total : 0 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

/** Maiores lançamentos de despesa do mês. */
export function topExpenses(transactions, ym, limit = 5) {
  return monthRows(transactions, ym)
    .filter(isExpense)
    .sort((a, b) => num(b.amount) - num(a.amount))
    .slice(0, limit);
}

/** "Notebook (4/12)" -> { current: 4, total: 12 }. Só para exibição. */
export function parseInstallment(description) {
  const m = /\((\d+)\s*\/\s*(\d+)\)\s*$/.exec(String(description || ''));
  return m ? { current: Number(m[1]), total: Number(m[2]) } : null;
}

/** Renda média dos últimos `count` meses terminando em `ym` (só meses com receita). */
export function averageIncome(transactions, ym, count = BASELINE_MONTHS) {
  const values = monthRange(ym, count)
    .map(key => monthTotals(transactions, key).income)
    .filter(v => v > 0);
  if (values.length === 0) return null;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

/**
 * Compromissos já lançados (fixos + parcelas) nos próximos `count` meses
 * contra a renda média. As linhas futuras já existem em `transactions`.
 *
 * `relief` é o primeiro mês em que o total comprometido fica abaixo do do mês
 * de referência, com o valor liberado por mês. Null se nada diminui no horizonte.
 */
export function futurePlan(transactions, ym, count = FUTURE_MONTHS) {
  const income = averageIncome(transactions, ym);
  const base = monthTotals(transactions, ym).commitments;
  const months = Array.from({ length: count }, (_, i) => {
    const key = addMonths(ym, i + 1);
    const t = monthTotals(transactions, key);
    return {
      key, fixed: t.fixed, installment: t.installment, total: t.commitments,
      free: income === null ? null : income - t.commitments,
    };
  });
  const reliefMonth = months.find(m => m.total < base - 0.005);
  return {
    income,
    base,
    months,
    relief: reliefMonth ? { key: reliefMonth.key, freed: base - reliefMonth.total } : null,
  };
}

/** Caixinhas com meta: saldo, meta, % (limitado a 100) e quanto falta. */
export function savingsGoals(accounts) {
  return (accounts || [])
    .filter(a => a?.kind === 'savings' && num(a.savingsGoal) > 0)
    .map(a => {
      const balance = num(a.balance);
      const goal = num(a.savingsGoal);
      return { id: a.id, name: a.name, balance, goal, pct: goalProgress(a) ?? 0, remaining: Math.max(goal - balance, 0) };
    });
}
