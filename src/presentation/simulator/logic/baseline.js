import { txDisplayMonth } from '../../../core/utils/billing';
import { toCents, fromCents } from '../../../core/utils/simulatorMath';
import { addMonths, shortMonth } from './labels';

/**
 * Base mensal do "E se...?": exatamente os números do Dashboard.
 *
 * O Dashboard calcula, para um mês, `transactions.filter(txBelongsToMonth)` e
 * soma `Number(amount)` das linhas 'income' e das 'expense'; a sobra é
 * receita - despesa. Aqui a mesma regra é aplicada à janela inteira em UMA
 * passada pela lista: cada linha cai no mês de `txDisplayMonth` (fatura para
 * cartão, data para o resto) e só entra se esse mês estiver na janela. Nunca
 * se filtra a lista inteira uma vez por mês.
 *
 * Os acumuladores somam `Number(amount)` na mesma ordem do Dashboard (a soma
 * em ponto flutuante é idêntica) e só então viram centavos inteiros.
 * `transactions` já vem sem transferências e sem movimentos de caixinha
 * (useAppData); aqui só entram linhas 'income' e 'expense'.
 */

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const emptyAcc = () => ({ income: 0, expense: 0, fixedLike: 0, rows: 0 });

/**
 * @param {Array} transactions lançamentos normalizados (data.transactions)
 * @param {string} firstMonth 'YYYY-MM' do primeiro mês da janela
 * @param {number} months tamanho da janela
 * @returns {Array<{ym, label, income, expense, result, hasData, committed, variable}>}
 *   valores em reais com 2 casas, vindos de centavos inteiros. `hasData`: o mês
 *   tem ao menos uma linha de receita ou despesa. `committed`: despesas fixas +
 *   parceladas; `variable`: o resto da despesa (só para o detalhe do mês).
 */
export function buildMonthlyBaseline(transactions, firstMonth, months) {
  const window = Array.from({ length: Math.max(0, months) }, (_, i) => addMonths(firstMonth, i));
  const acc = new Map(window.map((ym) => [ym, emptyAcc()]));

  for (const t of transactions || []) {
    if (!t) continue;
    const isIncome = t.type === 'income';
    if (!isIncome && t.type !== 'expense') continue;
    const slot = acc.get(txDisplayMonth(t));
    if (!slot) continue;
    const amount = num(t.amount);
    slot.rows += 1;
    if (isIncome) {
      slot.income += amount;
    } else {
      slot.expense += amount;
      if (t.recurrence === 'fixed' || t.recurrence === 'installment') slot.fixedLike += amount;
    }
  }

  return window.map((ym) => {
    const a = acc.get(ym);
    const incomeC = toCents(a.income);
    const expenseC = toCents(a.expense);
    const committedC = Math.min(toCents(a.fixedLike), expenseC);
    return {
      ym,
      label: shortMonth(ym),
      income: fromCents(incomeC),
      expense: fromCents(expenseC),
      result: fromCents(incomeC - expenseC),
      hasData: a.rows > 0,
      committed: fromCents(committedC),
      variable: fromCents(expenseC - committedC),
    };
  });
}
