export const getFaturaMonth = (dateStr, closingDay) => {
  if (!dateStr) return null;
  const d = new Date(dateStr + 'T12:00');
  if (d.getDate() > closingDay) {
    const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    return next.toISOString().slice(0, 7);
  }
  return dateStr.slice(0, 7);
};

export const currentFaturaMonth = (closingDay) => {
  const now  = new Date();
  const base = now.getDate() > closingDay
    ? new Date(now.getFullYear(), now.getMonth() + 1, 1)
    : new Date(now.getFullYear(), now.getMonth(), 1);
  return base.toISOString().slice(0, 7);
};

export const getFaturaMonths = (closingDay, count = 6) => {
  const now      = new Date();
  const todayDay = now.getDate();
  const base     = todayDay > closingDay
    ? new Date(now.getFullYear(), now.getMonth() + 1, 1)
    : new Date(now.getFullYear(), now.getMonth(), 1);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
    return d.toISOString().slice(0, 7);
  });
};

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
