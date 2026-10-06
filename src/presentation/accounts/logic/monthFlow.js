import { txBelongsToMonth } from '../../../core/utils/billing';

const EMPTY_FLOW = Object.freeze({ income: 0, expense: 0 });

/**
 * Receita e despesa do mês por conta, em uma única passada pelos lançamentos.
 * Lançamentos de cartão e de tipos diferentes de income/expense (transferência)
 * ficam de fora. Devolve Map<accountId, { income, expense }>.
 */
export function groupMonthFlowByAccount(transactions, month) {
  const byAccount = new Map();
  for (const t of transactions || []) {
    if (t.cardId || (t.type !== 'income' && t.type !== 'expense')) continue;
    if (!txBelongsToMonth(t, month)) continue;
    let flow = byAccount.get(t.accountId);
    if (!flow) { flow = { income: 0, expense: 0 }; byAccount.set(t.accountId, flow); }
    flow[t.type] += Number(t.amount || 0);
  }
  return byAccount;
}

/** Fluxo de uma conta no agrupamento; zerado quando ela não teve movimento. */
export function flowOf(byAccount, accountId) {
  return byAccount.get(accountId) ?? EMPTY_FLOW;
}
