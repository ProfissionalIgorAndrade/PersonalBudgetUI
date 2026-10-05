/**
 * Lógica pura dos widgets opcionais (catálogo) da Saúde Financeira.
 *
 * Mesmas regras de metrics.js: entrada é `transactions` já sem transferência
 * e sem movimento de caixinha, o mês de referência é sempre argumento, nada
 * lê relógio (a data de hoje entra como parâmetro quando importa) e nenhum
 * resultado é NaN ou Infinity: sem base de cálculo, devolve null ou um
 * `state` explícito para o widget mostrar um estado vazio.
 */
import { txDisplayMonth, statementNet } from '../../../core/utils/billing';
import { normalizeTransaction } from '../../../application/mappers';
import {
  monthRange, monthTotals, monthRows, expenseByCategory, categoryInfo,
  averageIncome, baselineMonths, futurePlan, parseInstallment,
} from './metrics';
import {
  BASELINE_MONTHS, SHARE_TOP_N, PROJECTION_MONTHS, RULE_NEEDS, RULE_WANTS, RULE_SAVINGS,
  CARD_USAGE_WARN, CARD_USAGE_CRITICAL, PACE_TOLERANCE,
} from './targets';

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const isExpense = (t) => t?.type === 'expense';
const isIncome = (t) => t?.type === 'income';
const sum = (list) => list.reduce((s, v) => s + v, 0);
const share = (value, total) => (total > 0 ? value / total : 0);

/** Nome do lançamento sem o sufixo "(4/12)". */
export const baseDescription = (description) =>
  String(description || '').replace(/\s*\(\d+\s*\/\s*\d+\)\s*$/, '').trim();

/* ── Participação, tendência e pessoas ─────────────────────────── */

/**
 * Participação de cada categoria na despesa do mês: as `topN` maiores e o
 * resto somado em "Outras". Devolve { total, items }.
 */
export function categoryShare(transactions, categories, ym, topN = SHARE_TOP_N) {
  const byCat = expenseByCategory(transactions, ym);
  const total = sum(Object.values(byCat));
  const sorted = Object.entries(byCat)
    .map(([id, value]) => ({ ...categoryInfo(categories, id), value }))
    .filter(c => c.value > 0)
    .sort((a, b) => b.value - a.value);
  const top = sorted.slice(0, topN);
  const rest = sorted.slice(topN);
  const items = top.map(c => ({ ...c, share: share(c.value, total) }));
  if (rest.length > 0) {
    const value = sum(rest.map(c => c.value));
    items.push({ id: '__others', name: 'Outras', icon: '…', value, share: share(value, total), isOther: true, count: rest.length });
  }
  return { total, items };
}

/**
 * Despesa mensal das maiores categorias nos últimos `months` meses (terminando
 * em `ym`). Ranking pelo total da janela. `average` divide pelo número de
 * meses da janela; `change` compara o último mês com o primeiro mês com gasto.
 */
export function categoryTrend(transactions, categories, ym, months = 6, limit = 5) {
  const keys = monthRange(ym, months);
  const perMonth = keys.map(key => expenseByCategory(transactions, key));
  const ids = new Set(perMonth.flatMap(m => Object.keys(m)));
  const items = [...ids].map(id => {
    const points = keys.map((key, i) => ({ key, value: perMonth[i][id] || 0 }));
    const total = sum(points.map(p => p.value));
    const first = points.find(p => p.value > 0);
    const last = points[points.length - 1].value;
    return {
      ...categoryInfo(categories, id), points, total, last,
      average: total / months,
      change: first && first.value > 0 && first.key !== keys[keys.length - 1] ? (last - first.value) / first.value : null,
    };
  })
    .filter(c => c.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
  return { keys, items };
}

/** Total por membro (despesa ou receita) no mês; lançamento sem membro vira "Sem membro". */
export function byMember(transactions, members, ym, kind = 'expense') {
  const pick = kind === 'income' ? isIncome : isExpense;
  const acc = {};
  for (const t of monthRows(transactions, ym)) {
    if (!pick(t)) continue;
    const id = t.memberId ? String(t.memberId) : '';
    acc[id] = (acc[id] || 0) + num(t.amount);
  }
  const total = sum(Object.values(acc));
  const items = Object.entries(acc)
    .map(([id, value]) => {
      const m = (members || []).find(x => String(x.id) === id);
      return {
        id, value, share: share(value, total),
        name: id === '' ? 'Sem membro' : (m?.name || 'Membro'),
        emoji: id === '' ? '❔' : (m?.emoji || '👤'),
      };
    })
    .filter(i => i.value > 0)
    .sort((a, b) => b.value - a.value);
  return { total, items };
}

/**
 * Fontes de renda do mês. Agrupa por categoria; sem categoria, pela descrição
 * (sem sufixo de parcela). As `limit` maiores aparecem, o resto vira "Outras".
 */
export function incomeSources(transactions, categories, ym, limit = 8) {
  const acc = {};
  for (const t of monthRows(transactions, ym)) {
    if (!isIncome(t)) continue;
    const desc = baseDescription(t.description);
    const key = t.categoryId ? `c:${t.categoryId}` : `d:${desc.toLowerCase()}`;
    if (!acc[key]) {
      const cat = t.categoryId ? categories?.find(c => c.id === t.categoryId) : null;
      acc[key] = { id: key, name: cat?.name || desc || 'Sem descrição', icon: cat?.icon || '💵', value: 0 };
    }
    acc[key].value += num(t.amount);
  }
  const total = sum(Object.values(acc).map(s => s.value));
  const sorted = Object.values(acc).filter(s => s.value > 0).sort((a, b) => b.value - a.value);
  const items = sorted.slice(0, limit).map(s => ({ ...s, share: share(s.value, total) }));
  const rest = sorted.slice(limit);
  if (rest.length > 0) {
    const value = sum(rest.map(s => s.value));
    items.push({ id: '__others', name: 'Outras', icon: '…', value, share: share(value, total), isOther: true });
  }
  return { total, items };
}

/* ── Faturas e limite ──────────────────────────────────────────── */

/**
 * Total de uma fatura a partir do payload de getStatement (array, objeto com
 * `transactions` ou aninhado em `statement`). Estorno subtrai. Null quando o
 * payload não existe: quem chama trata como "sem fatura". Só enxerga a página
 * devolvida pela API.
 */
export function statementTotal(payload) {
  if (payload === null || payload === undefined) return null;
  const pick = (o) => o && (o.transactions ?? o.Transactions ?? o.transactionDtos ?? o.TransactionDtos ?? o.items ?? o.Items);
  let list = Array.isArray(payload) ? payload : pick(payload);
  if (!Array.isArray(list)) {
    for (const k of ['statement', 'Statement', 'creditCardStatement', 'CreditCardStatement']) {
      const inner = pick(payload[k]);
      if (Array.isArray(inner)) { list = inner; break; }
    }
  }
  if (!Array.isArray(list)) return null;
  return statementNet(list.map(normalizeTransaction).filter(Boolean));
}

/** Uso do limite: { used, limit, pct, level }. `pct` é null sem limite cadastrado. */
export function cardUsage(used, limit) {
  const u = num(used);
  const l = num(limit);
  const pct = l > 0 ? u / l : null;
  let level = 'unknown';
  if (pct !== null) level = pct > CARD_USAGE_CRITICAL ? 'critical' : pct > CARD_USAGE_WARN ? 'warning' : 'good';
  return { used: u, limit: l, pct, level };
}

/* ── Lançamentos e revisão ─────────────────────────────────────── */

/** Últimos lançamentos do mês (receita e despesa), mais recentes primeiro. */
export function latestTransactions(transactions, ym, limit = 10) {
  return monthRows(transactions, ym)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.id).localeCompare(String(a.id)))
    .slice(0, limit);
}

/**
 * Progresso de revisão do mês: % de lançamentos com `reviewed`, geral e por
 * cartão (quando o lançamento é de cartão) ou conta. Pior grupo primeiro.
 */
export function reviewProgress(transactions, accounts, cards, ym) {
  const rows = monthRows(transactions, ym);
  const groups = {};
  for (const t of rows) {
    const card = t.cardId ? (cards || []).find(c => String(c.id) === String(t.cardId)) : null;
    const acc = !card && t.accountId ? (accounts || []).find(a => String(a.id) === String(t.accountId)) : null;
    const key = card ? `card:${card.id}` : acc ? `acc:${acc.id}` : 'none';
    if (!groups[key]) {
      groups[key] = { key, label: card ? card.name : acc ? acc.name : 'Sem conta', icon: card ? '💳' : '🏦', total: 0, reviewed: 0 };
    }
    groups[key].total += 1;
    if (t.reviewed) groups[key].reviewed += 1;
  }
  const list = Object.values(groups)
    .map(g => ({ ...g, pct: g.total > 0 ? g.reviewed / g.total : null }))
    .sort((a, b) => a.pct - b.pct || b.total - a.total);
  const reviewed = rows.filter(t => t.reviewed).length;
  return { total: rows.length, reviewed, pct: rows.length > 0 ? reviewed / rows.length : null, groups: list };
}

/* ── Contas, fixos, parcelas, assinaturas ──────────────────────── */

/** Contas correntes ativas com saldo, maior primeiro (caixinhas ficam de fora). */
export function accountBalances(accounts) {
  const items = (accounts || [])
    .filter(a => a && a.kind !== 'savings' && a.isActive !== false)
    .map(a => ({ id: a.id, name: a.name, balance: num(a.balance), color: a.color }))
    .sort((a, b) => b.balance - a.balance);
  return { total: sum(items.map(a => a.balance)), items };
}

/** Despesas fixas do mês, maiores primeiro, com total e peso na renda (null sem renda). */
export function fixedOfMonth(transactions, categories, ym) {
  const items = monthRows(transactions, ym)
    .filter(t => isExpense(t) && t.recurrence === 'fixed')
    .map(t => ({ id: t.id, description: baseDescription(t.description) || 'Sem descrição', date: t.date, value: num(t.amount),
      category: categoryInfo(categories, t.categoryId || '') }))
    .sort((a, b) => b.value - a.value);
  const total = sum(items.map(i => i.value));
  const income = monthTotals(transactions, ym).income;
  return { total, items, incomeShare: income > 0 ? total / income : null };
}

/**
 * Parcelamentos ativos: despesas `installment` agrupadas por recurrenceId (ou,
 * sem ele, pela descrição sem o "(4/12)"). Só entram grupos com parcela no mês
 * ou depois. `remainingMonths` e `remainingAmount` contam as linhas
 * posteriores ao mês, que já existem em `transactions`. "parcela x de y" vem
 * do sufixo da descrição e serve só para exibição (null se não houver).
 */
export function activeInstallments(transactions, ym) {
  const groups = {};
  for (const t of transactions || []) {
    if (!t || !isExpense(t) || t.recurrence !== 'installment') continue;
    const month = txDisplayMonth(t);
    if (!month || month < ym) continue;
    const name = baseDescription(t.description) || 'Sem descrição';
    const key = t.recurrenceId ? `r:${t.recurrenceId}` : `d:${name.toLowerCase()}`;
    (groups[key] = groups[key] || { key, name, rows: [] }).rows.push({ t, month });
  }
  const items = Object.values(groups).map(g => {
    const rows = g.rows.sort((a, b) => a.month.localeCompare(b.month));
    const here = rows[0];
    const future = rows.filter(r => r.month > ym);
    const inst = parseInstallment(here.t.description);
    return {
      key: g.key, name: g.name,
      current: inst?.current ?? null, total: inst?.total ?? null,
      inMonth: here.month === ym,
      installmentAmount: num(here.t.amount),
      remainingMonths: future.length,
      remainingAmount: sum(future.map(r => num(r.t.amount))),
      lastMonth: rows[rows.length - 1].month,
    };
  }).sort((a, b) => b.remainingAmount - a.remainingAmount || a.name.localeCompare(b.name));
  return {
    items,
    monthly: sum(items.filter(i => i.inMonth).map(i => i.installmentAmount)),
    remaining: sum(items.map(i => i.remainingAmount)),
  };
}

/** Assinaturas: despesas fixas do mês em categorias cujo nome casa /assinatur/i. */
export function subscriptions(transactions, categories, ym) {
  const ids = new Set((categories || []).filter(c => /assinatur/i.test(c?.name || '')).map(c => c.id));
  const items = monthRows(transactions, ym)
    .filter(t => isExpense(t) && t.recurrence === 'fixed' && ids.has(t.categoryId))
    .map(t => ({ id: t.id, name: baseDescription(t.description) || 'Sem descrição', value: num(t.amount), date: t.date }))
    .sort((a, b) => b.value - a.value);
  const total = sum(items.map(i => i.value));
  return { hasCategory: ids.size > 0, items, total, yearly: total * 12 };
}

/* ── Planejamento ──────────────────────────────────────────────── */

/**
 * Regra 50/30/20 sobre a renda do mês. APROXIMAÇÃO: o app não classifica
 * necessidade e desejo, então o proxy é a recorrência. Necessidades = fixos +
 * parcelas; desejos = despesa variável; poupança = sobra do mês (receita -
 * despesa, nunca negativa). Null sem renda no mês.
 */
export function rule503020(transactions, ym) {
  const t = monthTotals(transactions, ym);
  if (t.income <= 0) return null;
  const needs = t.commitments;
  const wants = t.variable;
  const savings = Math.max(t.income - t.expense, 0);
  const level = (value, target, kind) => {
    const s = value / t.income;
    if (kind === 'max') return s <= target ? 'good' : s <= target + 0.10 ? 'warning' : 'critical';
    return s >= target ? 'good' : s >= target / 2 ? 'warning' : 'critical';
  };
  const bucket = (id, label, value, target, kind) => ({
    id, label, value, share: value / t.income, target, kind, level: level(value, target, kind),
  });
  return {
    income: t.income,
    overspent: t.expense > t.income,
    buckets: [
      bucket('needs', 'Necessidades', needs, RULE_NEEDS, 'max'),
      bucket('wants', 'Desejos', wants, RULE_WANTS, 'max'),
      bucket('savings', 'Poupança', savings, RULE_SAVINGS, 'min'),
    ],
  };
}

export const daysInMonth = (ym) => {
  const [y, m] = String(ym).split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
};

/** Dia do mês de um lançamento ('YYYY-MM-DD'); sem data conta no dia 1. */
const dayOf = (t) => Math.max(Number(String(t.date || '').slice(8, 10)) || 1, 1);

/** Despesa acumulada por dia do mês `key`: índice d-1 = gasto até o dia d. */
function cumulativeExpense(transactions, key) {
  const n = daysInMonth(key);
  const perDay = Array(n).fill(0);
  for (const t of monthRows(transactions, key)) {
    if (isExpense(t)) perDay[Math.min(dayOf(t), n) - 1] += num(t.amount);
  }
  let run = 0;
  return perDay.map(v => (run += v));
}

/**
 * Ritmo de gasto: despesa acumulada até hoje contra o esperado para esse dia,
 * que é a média, dia a dia, do acumulado dos 3 meses anteriores (só meses com
 * despesa; mês mais curto repete o total final). `refDate` é um Date: em mês
 * passado o mês está completo; em mês futuro não há ritmo (state 'future').
 * A data usada é a do lançamento, inclusive para cartão. Lançamentos fixos já
 * lançados com data futura só entram quando o dia chega.
 */
export function spendingPace(transactions, ym, refDate) {
  const dim = daysInMonth(ym);
  const refYm = `${refDate.getFullYear()}-${String(refDate.getMonth() + 1).padStart(2, '0')}`;
  const day = ym < refYm ? dim : ym > refYm ? 0 : Math.min(refDate.getDate(), dim);

  const base = baselineMonths(ym)
    .map(key => cumulativeExpense(transactions, key))
    .filter(c => c[c.length - 1] > 0);
  const expectedAt = (d) => (base.length === 0 ? null : sum(base.map(c => c[Math.min(d, c.length) - 1])) / base.length);
  const cum = cumulativeExpense(transactions, ym);

  const expected = base.length === 0 ? [] : Array.from({ length: dim }, (_, i) => ({ day: i + 1, value: expectedAt(i + 1) }));
  const actual = Array.from({ length: day }, (_, i) => ({ day: i + 1, value: cum[i] }));
  const spent = day > 0 ? cum[day - 1] : 0;
  const expectedToDate = day > 0 ? expectedAt(day) : null;
  const ratio = expectedToDate > 0 ? spent / expectedToDate : null;

  let level = 'unknown';
  if (ratio !== null) level = ratio <= 1 ? 'good' : ratio <= 1 + PACE_TOLERANCE ? 'warning' : 'critical';
  return {
    state: day === 0 ? 'future' : base.length === 0 ? 'no-baseline' : 'ok',
    closed: day === dim && ym < refYm,
    daysInMonth: dim, day, spent, expectedToDate, expectedTotal: expectedAt(dim),
    ratio, level, actual, expected,
  };
}

/** Maiores aumentos de despesa por categoria contra a média dos 3 meses anteriores (média 0 fica de fora). */
export function biggestIncreases(transactions, categories, ym, limit = 5) {
  const current = expenseByCategory(transactions, ym);
  const prev = baselineMonths(ym).map(key => expenseByCategory(transactions, key));
  return Object.entries(current)
    .map(([id, value]) => {
      const average = sum(prev.map(m => m[id] || 0)) / BASELINE_MONTHS;
      return { ...categoryInfo(categories, id), value, average, increase: value - average,
        increasePct: average > 0 ? (value - average) / average : null };
    })
    .filter(c => c.average > 0 && c.increase > 0.005)
    .sort((a, b) => b.increase - a.increase)
    .slice(0, limit);
}

export const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
export const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

/** Despesa do mês por dia da semana (pela data do lançamento), domingo a sábado. */
export function weekdayPattern(transactions, ym) {
  const items = WEEKDAYS.map((name, i) => ({ index: i, name, short: WEEKDAYS_SHORT[i], value: 0, count: 0 }));
  for (const t of monthRows(transactions, ym)) {
    if (!isExpense(t) || !t.date) continue;
    const [y, m, d] = String(t.date).slice(0, 10).split('-').map(Number);
    const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    if (!Number.isInteger(wd)) continue;
    items[wd].value += num(t.amount);
    items[wd].count += 1;
  }
  const total = sum(items.map(i => i.value));
  return { total, items };
}

/**
 * Projeção de saldo: saldo atual das contas correntes + (renda média dos
 * últimos 3 meses - compromissos já lançados no mês) acumulado mês a mês.
 * Não desconta gasto variável nem prevê renda variável. O ponto de partida é
 * o saldo de hoje, independentemente do mês selecionado.
 * state: 'ok' | 'no-accounts' | 'no-income'.
 */
export function balanceProjection(transactions, accounts, ym, count = PROJECTION_MONTHS) {
  const { items, total: start } = accountBalances(accounts);
  if (items.length === 0) return { state: 'no-accounts', start: 0, income: null, months: [] };
  const income = averageIncome(transactions, ym);
  if (income === null) return { state: 'no-income', start, income: null, months: [] };

  let balance = start;
  const months = futurePlan(transactions, ym, count).months.map(m => {
    const delta = income - m.total;
    balance += delta;
    return { key: m.key, commitments: m.total, delta, balance };
  });
  const negative = months.find(m => m.balance < 0);
  return { state: 'ok', start, income, months, negativeAt: negative ? negative.key : null };
}
