/**
 * Resolves the month (YYYY-MM) a transaction should be listed under.
 *
 * A credit card transaction belongs to its STATEMENT month, not to the month
 * of the purchase date. A purchase on 18/08 on a card closing on the 20th
 * lands on the September statement, and the card screen already shows it
 * there. Filtering the transaction list by t.date puts the same row in
 * August, so the two screens disagree about the same transaction.
 *
 * Every other transaction (account, transfer) follows its own date.
 *
 * @param {{cardId?: string, statementMonth?: number|null, statementYear?: number|null, date?: string}} t
 * @returns {string|null} 'YYYY-MM', or null when it cannot be determined
 */
export const txDisplayMonth = (t) => {
  if (!t) return null;
  if (t.cardId && t.statementMonth && t.statementYear) {
    return `${t.statementYear}-${String(t.statementMonth).padStart(2, '0')}`;
  }
  return t.date ? t.date.slice(0, 7) : null;
};

/**
 * Whether a transaction belongs to the given month, honouring the statement
 * month for credit card transactions.
 *
 * @param {object} t normalized transaction
 * @param {string} ym month as 'YYYY-MM'
 */
export const txBelongsToMonth = (t, ym) => {
  if (!ym) return true;
  return txDisplayMonth(t) === ym;
};

/**
 * Short label for the statement column, e.g. '09/2027'. Null for anything
 * that is not a card transaction carrying a statement.
 */
export const statementLabel = (t) => {
  if (!t?.cardId || !t.statementMonth || !t.statementYear) return null;
  return `${String(t.statementMonth).padStart(2, '0')}/${t.statementYear}`;
};

/**
 * Valor líquido de um conjunto de lançamentos de fatura.
 *
 * Estorno é lançado como receita (type 'income') no mesmo cartão. Os totais
 * filtravam apenas 'expense', então o estorno era simplesmente ignorado: a
 * fatura continuava mostrando o valor cheio da compra que foi devolvida.
 *
 * Despesa soma, estorno subtrai, cancelado fica de fora.
 */
export const statementNet = (rows = []) =>
  rows.reduce((sum, t) => {
    if (!t) return sum;
    const amount = Number(t.amount) || 0;
    return t.type === 'income' ? sum - amount : sum + amount;
  }, 0);

/** Lançamentos que compõem a fatura. */
export const statementRows = (rows = []) => rows.filter(t => !!t);

/**
 * Due date of a card statement: the card's dueDay inside the statement month,
 * clamped to that month's last day (dueDay 31 in February is the 28th/29th),
 * the same rule as the backend's DueDateFor.
 *
 * The Date is built from numbers in local time (no ISO string round trip), so
 * the day never drifts with the timezone.
 *
 * @param {{dueDay?: number}} card
 * @param {number} month statement month, 1-12
 * @param {number} year statement year
 * @returns {Date|null} null when the card, dueDay, month or year is missing/invalid
 */
export const statementDueDate = (card, month, year) => {
  const dueDay = Number(card?.dueDay);
  const m = Number(month);
  const y = Number(year);
  if (!Number.isInteger(dueDay) || dueDay < 1) return null;
  if (!Number.isInteger(m) || m < 1 || m > 12) return null;
  if (!Number.isInteger(y) || y < 1) return null;
  const lastDay = new Date(y, m, 0).getDate();
  return new Date(y, m - 1, Math.min(dueDay, lastDay));
};
