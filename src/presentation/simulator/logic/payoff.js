import { txDisplayMonth } from '../../../core/utils/billing';
import { toCents, fromCents } from '../../../core/utils/simulatorMath';
import { R$, monthLabel } from '../../../core/utils/format';

/**
 * Quitação de parcelas de cartão ("CardPayoff"): no mês M, paga de uma vez
 * todas as parcelas dos cartões escolhidos que cairiam nas faturas DEPOIS de M.
 *
 * - A fatura do próprio mês M já está na base e é paga normalmente: não entra.
 * - Só lançamentos parcelados (`recurrence === 'installment'`) com cartão.
 *   Compra à vista e assinatura (fixa) no cartão ficam de fora.
 * - Estorno parcelado (receita no cartão) reduz o valor a pagar.
 * - O valor é calculado aqui, a cada render, a partir dos lançamentos atuais:
 *   o servidor guarda só o mês e os cartões (`creditCardIds` null = todos).
 * - Efeito: −total em M; em cada fatura seguinte, + o que ela deixa de cobrar.
 *   Somando tudo, zero: muda só o mês em que o dinheiro sai.
 *
 * Tudo em centavos inteiros.
 */

export const PAYOFF_MODE = 'CardPayoff';
export const isPayoff = (sim) => sim?.mode === PAYOFF_MODE;

const shortMonth = (ym) => monthLabel(ym).toLowerCase();

const ordinal = (ym) => {
  const [y, m] = ym.split('-').map(Number);
  return y * 12 + (m - 1);
};

const addMonths = (ym, k) => {
  const ord = ordinal(ym) + k;
  return `${Math.floor(ord / 12)}-${String((ord % 12) + 1).padStart(2, '0')}`;
};

/** Despesa soma, estorno (receita) subtrai. */
const netCents = (t) => (t.type === 'income' ? -1 : 1) * toCents(Number(t.amount) || 0);

/**
 * Conjunto de cartões efetivo: null = todos. Com a lista de cartões do lar
 * carregada, ids que não estão mais nela (excluídos ou desativados) saem e
 * viram aviso; sem a lista, os ids valem como vieram.
 */
function resolveCards(sim, cards) {
  if (!Array.isArray(sim.creditCardIds)) return { set: null, missing: [] };
  if (!cards || cards.length === 0) return { set: new Set(sim.creditCardIds), missing: [] };
  const known = new Set(cards.map((c) => c.id));
  return {
    set: new Set(sim.creditCardIds.filter((id) => known.has(id))),
    missing: sim.creditCardIds.filter((id) => !known.has(id)),
  };
}

/**
 * Parcelas que a quitação cobre, já sem as reivindicadas por outra quitação
 * (`claimed`, ids de lançamento).
 */
export function payoffRows(sim, transactions, cards, claimed) {
  const { set } = resolveCards(sim, cards);
  const rows = [];
  for (const t of transactions || []) {
    if (!t || t.recurrence !== 'installment' || !t.cardId) continue;
    if (t.type !== 'expense' && t.type !== 'income') continue;
    if (set && !set.has(t.cardId)) continue;
    if (claimed && claimed.has(t.id)) continue;
    const ym = txDisplayMonth(t);
    if (!ym || ym <= sim.startMonth) continue;
    rows.push({ t, ym });
  }
  return rows;
}

/** "Quitar todos os cartões" ou "Quitar Nubank, Itaú": nome padrão quando não há descrição. */
export function payoffDefaultName(creditCardIds, cards = []) {
  if (!Array.isArray(creditCardIds)) return 'Quitar todos os cartões';
  const names = creditCardIds
    .map((id) => cards.find((c) => c.id === id)?.name)
    .filter(Boolean);
  if (names.length === 0) return 'Quitar cartões';
  const text = `Quitar ${names.join(', ')}`;
  return text.length > 120 ? `${text.slice(0, 117)}...` : text;
}

/**
 * Schedule de uma quitação, no mesmo formato de buildSchedule, mais `payoff`
 * com o detalhe por cartão para o painel e o cartão da simulação.
 *
 * @param {object} sim { id, description, mode: 'CardPayoff', startMonth, creditCardIds, enabled }
 * @param {string} firstMonth 'YYYY-MM'
 * @param {number} horizon meses da janela
 * @param {{transactions?: Array, cards?: Array}} ctx lançamentos normalizados e cartões do lar
 * @param {Set<string>|null} claimed parcelas já quitadas por outra quitação ligada
 */
export function buildPayoffSchedule(sim, firstMonth, horizon, ctx = {}, claimed = null) {
  const { transactions = [], cards = [] } = ctx;
  const { missing } = resolveCards(sim, cards);
  const rows = payoffRows(sim, transactions, cards, claimed);
  const horizonEnd = addMonths(firstMonth, horizon - 1);
  const offset = (ym) => ordinal(ym) - ordinal(firstMonth);

  const monthlyC = new Array(Math.max(0, horizon)).fill(0);
  let totalC = 0;
  let afterC = 0;
  const byCard = new Map();

  for (const { t, ym } of rows) {
    const c = netCents(t);
    totalC += c;
    const i = offset(ym);
    if (i >= 0 && i < horizon) monthlyC[i] += c;
    else if (ym > horizonEnd) afterC += c;

    const entry = byCard.get(t.cardId) ?? { cardId: t.cardId, count: 0, cents: 0, first: ym, last: ym };
    if (t.type === 'expense') entry.count += 1;
    entry.cents += c;
    if (ym < entry.first) entry.first = ym;
    if (ym > entry.last) entry.last = ym;
    byCard.set(t.cardId, entry);
  }

  const payIndex = offset(sim.startMonth);
  if (payIndex >= 0 && payIndex < horizon) monthlyC[payIndex] -= totalC;
  const inHorizonC = monthlyC.reduce((a, v) => a + v, 0);

  const cardName = (id) => cards.find((c) => c.id === id)?.name || 'Cartão desativado';
  const perCard = [...byCard.values()]
    .map((e) => ({
      cardId: e.cardId, name: cardName(e.cardId), count: e.count, amount: fromCents(e.cents),
      firstMonth: e.first, lastMonth: e.last,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  const name = sim.description?.trim() || payoffDefaultName(sim.creditCardIds, cards);
  const start = shortMonth(sim.startMonth);
  const warnings = [];
  const warn = (code, message) => warnings.push({ impactId: sim.id, code, message });

  if (missing.length > 0) {
    warn('MissingCard', missing.length === 1
      ? `"${name}": 1 cartão escolhido não existe mais ou foi desativado e ficou de fora.`
      : `"${name}": ${missing.length} cartões escolhidos não existem mais ou foram desativados e ficaram de fora.`);
  }
  if (totalC === 0) {
    warn('Empty', `Nenhuma parcela de cartão a quitar depois de ${start}.`);
  }
  if (sim.startMonth < firstMonth) {
    warn('Truncated', `"${name}" quita em ${start}, antes de ${shortMonth(firstMonth)}: o pagamento fica fora do período.`);
  } else if (sim.startMonth > horizonEnd) {
    warn('AfterWindow', `"${name}" quita em ${start}, depois de ${shortMonth(horizonEnd)}, e não entra no período.`);
  } else if (afterC !== 0) {
    warn('AfterWindow', `${R$(fromCents(afterC))} de alívio depois de ${shortMonth(horizonEnd)}: essas faturas ficam fora do período.`);
  }

  return {
    id: sim.id,
    type: 'Expense',
    mode: PAYOFF_MODE,
    monthly: monthlyC.map(fromCents),
    totalInHorizon: fromCents(inHorizonC),
    totalFull: 0,
    installmentAmount: null,
    lastInstallmentAmount: null,
    installmentsInHorizon: 0,
    installmentsTotal: null,
    warnings,
    payoff: {
      total: fromCents(totalC),
      afterWindow: fromCents(afterC),
      count: perCard.reduce((a, c) => a + c.count, 0),
      cards: perCard,
      rowIds: rows.map(({ t }) => t.id),
    },
  };
}
