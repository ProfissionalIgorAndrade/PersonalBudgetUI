import { toCents, fromCents } from '../../../core/utils/simulatorMath';

/**
 * Composição do cenário no cliente.
 *
 * A API devolve o baseline e o vetor mensal assinado de CADA impacto (receita
 * positiva, despesa negativa). Ligar ou desligar uma simulação só muda quais
 * vetores entram na soma, então recalculamos aqui sem nova chamada.
 *
 * Fórmulas (iguais às de ProjectionBuilder, em centavos inteiros):
 *   simulatedIncome[i]  = soma dos monthly[i] > 0 dos impactos ligados
 *   simulatedExpense[i] = soma dos -monthly[i] quando monthly[i] < 0 (positivo)
 *   result[i]           = baseline.result[i] + simulatedIncome[i] - simulatedExpense[i]
 *   balance[i]          = opening + soma de result[0..i]
 *   delta[i]            = balance[i] - baseline.balance[i]
 * Menor saldo: primeiro mês de menor saldo (empate fica com o mais cedo).
 * Primeiro negativo: primeiro mês com saldo < 0.
 */

function minBalance(balances) {
  let index = 0;
  for (let i = 1; i < balances.length; i++) if (balances[i] < balances[index]) index = i;
  return { amount: balances[index], monthIndex: index };
}

function firstNegative(balances) {
  const i = balances.findIndex((b) => b < 0);
  return i === -1 ? null : i;
}

/**
 * @param {object}   p
 * @param {Array}    p.baseline        baseline[] da API
 * @param {Array}    p.impacts         impacts[] da API (monthly, totalInHorizon, totalFull)
 * @param {number}   p.openingBalance  openingBalance.amount
 * @param {Iterable<string>} p.enabledIds  ids ligados; impactos fora do conjunto não entram
 */
export function composeScenario({ baseline, impacts, openingBalance, enabledIds }) {
  const enabled = new Set(enabledIds);
  const active = impacts.filter((imp) => enabled.has(imp.id));
  const n = baseline.length;
  const openingC = toCents(openingBalance);

  const allMonthlyC = new Array(n).fill(0);
  const months = [];
  const baselineBalances = [];
  const scenarioBalances = [];
  let runningC = openingC;

  for (let i = 0; i < n; i++) {
    let incomeC = 0;
    let expenseC = 0;
    for (const imp of active) {
      const v = toCents(imp.monthly[i] ?? 0);
      if (v > 0) incomeC += v;
      else if (v < 0) expenseC += -v;
      allMonthlyC[i] += v;
    }
    const resultC = toCents(baseline[i].result) + incomeC - expenseC;
    runningC += resultC;
    const baseBalanceC = toCents(baseline[i].balance);

    baselineBalances.push(fromCents(baseBalanceC));
    scenarioBalances.push(fromCents(runningC));
    months.push({
      year: baseline[i].year,
      month: baseline[i].month,
      label: baseline[i].label,
      simulatedIncome: fromCents(incomeC),
      simulatedExpense: fromCents(expenseC),
      result: fromCents(resultC),
      balance: fromCents(runningC),
      delta: fromCents(runningC - baseBalanceC),
    });
  }

  const sumC = (pick) => active.reduce((acc, imp) => acc + toCents(pick(imp)), 0);
  const totalInHorizonC = sumC((imp) => imp.totalInHorizon);
  const totalFullC = sumC((imp) => imp.totalFull);

  return {
    months,
    summary: {
      baselineMinBalance: n ? minBalance(baselineBalances) : { amount: fromCents(openingC), monthIndex: 0 },
      scenarioMinBalance: n ? minBalance(scenarioBalances) : { amount: fromCents(openingC), monthIndex: 0 },
      firstNegativeMonthIndexBaseline: firstNegative(baselineBalances),
      firstNegativeMonthIndexScenario: firstNegative(scenarioBalances),
      endBalanceBaseline: n ? baselineBalances[n - 1] : fromCents(openingC),
      endBalanceScenario: n ? scenarioBalances[n - 1] : fromCents(openingC),
      totalImpactInHorizon: fromCents(totalInHorizonC),
      totalImpactFull: fromCents(totalFullC),
    },
    /** Linha "Todas juntas": soma assinada dos vetores ligados e os dois totais. */
    all: {
      monthly: allMonthlyC.map(fromCents),
      totalInHorizon: fromCents(totalInHorizonC),
      totalFull: fromCents(totalFullC),
      count: active.length,
    },
  };
}
