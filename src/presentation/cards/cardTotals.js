import { txBelongsToMonth, statementNet } from '../../core/utils/billing';

/**
 * Net statement total of every card for a month, in a single pass over the
 * transactions. Cards without rows in the month are absent from the Map; read
 * them with `totals.get(id) ?? 0`.
 *
 * @param {Array<{cardId?: string}>} transactions normalized transactions
 * @param {string} month 'YYYY-MM'
 * @returns {Map<string, number>} cardId -> net total (expense adds, refund subtracts)
 */
export function statementTotalsByCard(transactions = [], month) {
  const rowsByCard = new Map();
  for (const t of transactions) {
    if (!t?.cardId || !txBelongsToMonth(t, month)) continue;
    const rows = rowsByCard.get(t.cardId);
    if (rows) rows.push(t); else rowsByCard.set(t.cardId, [t]);
  }
  const totals = new Map();
  for (const [cardId, rows] of rowsByCard) totals.set(cardId, statementNet(rows));
  return totals;
}
