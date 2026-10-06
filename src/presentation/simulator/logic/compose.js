import { toCents, fromCents } from '../../../core/utils/simulatorMath';
import {
  headlineSingle, headlineMulti, lineSlack, lineGap, lineCommitment, lineTight, LINE_NO_SIMS,
  HEADLINE_NO_HISTORY, lineNoHistory, HEADLINE_NO_MONTHS, VERDICT_STATUS,
} from './labels';

/**
 * Composição mensal do cenário no cliente, sem saldo acumulado.
 *
 * A API devolve o baseline (com `fullMonth`) e o vetor mensal assinado de CADA
 * impacto (receita positiva, despesa negativa). Ligar ou desligar uma
 * simulação só muda quais vetores entram na soma, então recompomos aqui sem
 * nova chamada. Tudo em centavos inteiros.
 */

/** Um mês é "apertado" quando a sobra é menor que este percentual da receita dele. */
export const ATTENTION_THRESHOLD_PCT = 10;

/** Quantas simulações têm cor própria no gráfico; as demais viram "Outras". */
export const MAX_COLORED_SIMULATIONS = 6;

/**
 * Receita e despesa do MÊS INTEIRO, em centavos. `fullMonth` vem do backend;
 * sem ele (backend antigo) cai para `income` e `committed + variable`, que no
 * mês atual são só o restante do mês.
 */
export function fullMonthCents(b) {
  const fm = b.fullMonth;
  if (fm && fm.income !== undefined && fm.income !== null && fm.expense !== undefined && fm.expense !== null) {
    return { incomeC: toCents(fm.income), expenseC: toCents(fm.expense), fallback: false };
  }
  return { incomeC: toCents(b.income), expenseC: toCents(b.committed) + toCents(b.variable), fallback: true };
}

/** negative: sobra < 0. tight: sobra menor que o limiar da receita. ok: o resto. */
export function monthStatus(resultC, incomeC) {
  if (resultC < 0) return 'negative';
  if (resultC * 100 < incomeC * ATTENTION_THRESHOLD_PCT) return 'tight';
  return 'ok';
}

/**
 * Cor de cada simulação, estável por posição na lista COMPLETA (ligar/desligar
 * ou trocar o horizonte não muda cores). Devolve { [id]: 1..6 | 'other' }.
 */
export function assignSimColors(simulations) {
  const out = {};
  simulations.forEach((s, i) => { out[s.id] = i < MAX_COLORED_SIMULATIONS ? i + 1 : 'other'; });
  return out;
}

/**
 * Composição mensal: para cada mês, receita, despesa e o valor assinado de cada
 * simulação ligada. Tudo em centavos inteiros; a sobra é
 *   result = income - expense + simTotal   (baselineResult = income - expense).
 *
 * @param {object} p
 * @param {Array}  p.baseline    baseline[] da API (com fullMonth, ou o formato antigo)
 * @param {Array}  p.impacts     impacts[] da API
 * @param {Iterable<string>} p.enabledIds  ids ligados, na ordem em que as colunas aparecem
 */
export function composeMonthly({ baseline, impacts, enabledIds }) {
  const byId = new Map(impacts.map((i) => [i.id, i]));
  const active = [...enabledIds].map((id) => byId.get(id)).filter(Boolean);
  const simIds = active.map((i) => i.id);

  const totals = { income: 0, expense: 0, simTotal: 0, result: 0, baselineResult: 0 };
  const simTotalsC = active.map(() => 0);
  let fallback = false;
  let tightest = null;
  let firstNegative = null;
  let negativeCount = 0;

  const months = baseline.map((b, i) => {
    const full = fullMonthCents(b);
    fallback = fallback || full.fallback;
    const baselineC = full.incomeC - full.expenseC;
    let simTotalC = 0;
    const sims = active.map((imp, k) => {
      const v = toCents(imp.monthly?.[i] ?? 0);
      simTotalC += v;
      simTotalsC[k] += v;
      return { id: imp.id, amount: fromCents(v) };
    });
    const resultC = baselineC + simTotalC;
    const status = monthStatus(resultC, full.incomeC);
    if (status === 'negative') {
      negativeCount += 1;
      if (firstNegative === null) firstNegative = i;
    }
    if (tightest === null || resultC < tightest.resultC) {
      tightest = { index: i, resultC, incomeC: full.incomeC, baselineC };
    }
    totals.income += full.incomeC;
    totals.expense += full.expenseC;
    totals.simTotal += simTotalC;
    totals.result += resultC;
    totals.baselineResult += baselineC;

    return {
      year: b.year,
      month: b.month,
      label: b.label,
      income: fromCents(full.incomeC),
      expense: fromCents(full.expenseC),
      sims,
      simTotal: fromCents(simTotalC),
      result: fromCents(resultC),
      baselineResult: fromCents(baselineC),
      status,
      committed: b.committed ?? 0,
      variable: b.variable ?? 0,
      /** committed/variable só cobrem o restante do mês (mês atual de um backend sem fullMonth, ou com lançamentos já feitos). */
      detailIsRemaining: toCents(b.committed) + toCents(b.variable) !== full.expenseC,
    };
  });

  return {
    months,
    simIds,
    totals: {
      income: fromCents(totals.income),
      expense: fromCents(totals.expense),
      simTotal: fromCents(totals.simTotal),
      result: fromCents(totals.result),
      baselineResult: fromCents(totals.baselineResult),
      sims: active.map((imp, k) => ({ id: imp.id, amount: fromCents(simTotalsC[k]) })),
    },
    tightest: tightest && {
      index: tightest.index,
      label: months[tightest.index].label,
      result: fromCents(tightest.resultC),
      income: fromCents(tightest.incomeC),
      baselineResult: fromCents(tightest.baselineC),
    },
    negativeCount,
    firstNegative,
    fullMonthFallback: fallback,
  };
}

/**
 * Veredito da tela. `level`: critical (algum mês < 0), warning (nenhum negativo,
 * mas a sobra de algum mês < ATTENTION_THRESHOLD_PCT da receita dele), good, ou
 * unknown (sem histórico / sem meses). Só olha o fluxo do período: o saldo de
 * partida das contas não entra.
 *
 * @returns {{level, statusLabel, headline, lines: {kind, text}[], slack, commitmentPct}}
 */
export function buildVerdict({ composed, hasHistory = true, lookbackMonths = 3 }) {
  const mk = (level, headline, lines = []) => ({
    level, statusLabel: VERDICT_STATUS[level], headline, lines, slack: null, commitmentPct: null,
  });
  if (composed.months.length === 0) return mk('unknown', HEADLINE_NO_MONTHS);
  if (!hasHistory) {
    return mk('unknown', HEADLINE_NO_HISTORY, [{ kind: 'history', text: lineNoHistory(lookbackMonths) }]);
  }

  const { months, totals, tightest, negativeCount, firstNegative, simIds } = composed;
  const n = months.length;
  const withSims = simIds.length > 0;
  const level = negativeCount > 0 ? 'critical' : months.some((m) => m.status === 'tight') ? 'warning' : 'good';

  const headline = n === 1
    ? headlineSingle({
      label: months[0].label, result: months[0].result, baselineResult: months[0].baselineResult, withSims,
    })
    : headlineMulti({
      n, total: totals.result, baselineTotal: totals.baselineResult, withSims, negativeCount,
      firstNegativeLabel: firstNegative === null ? '' : months[firstNegative].label,
      tightestLabel: tightest.label, tightestResult: tightest.result,
    });

  const lines = [];
  let slack = null;
  if (tightest.result > 0) {
    slack = tightest.result;
    lines.push({ kind: 'slack', text: lineSlack(slack) });
  } else if (tightest.result < 0) {
    lines.push({ kind: 'gap', text: lineGap(tightest.label, -tightest.result) });
  }

  let commitmentPct = null;
  if (tightest.income > 0) {
    // parte da receita do mês que já está tomada: (receita - sobra) / receita
    const committedC = toCents(tightest.income) - toCents(tightest.result);
    commitmentPct = Math.round((committedC * 100) / toCents(tightest.income));
    lines.push({ kind: 'commitment', text: lineCommitment(commitmentPct, tightest.label, withSims) });
  }
  if (level === 'warning') {
    const tight = months.find((m) => m.status === 'tight');
    lines.push({ kind: 'tight', text: lineTight(tight.label, ATTENTION_THRESHOLD_PCT) });
  }
  if (!withSims) lines.push({ kind: 'hint', text: LINE_NO_SIMS });

  return { level, statusLabel: VERDICT_STATUS[level], headline, lines, slack, commitmentPct };
}
