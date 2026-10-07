import { toCents, fromCents } from '../../../core/utils/simulatorMath';
import {
  headlineSingle, headlineMulti, headlineMixed, lineSlack, lineGap, lineCommitment, lineTight, lineExcluded,
  LINE_NO_SIMS, HEADLINE_NO_DATA, HEADLINE_NO_MONTHS, VERDICT_STATUS,
} from './labels';

/**
 * Composição mensal do cenário no cliente, sem saldo acumulado.
 *
 * A base de cada mês vem de buildMonthlyBaseline (exatamente o Dashboard) e o
 * vetor mensal assinado de CADA simulação vem de buildSchedule (receita
 * positiva, despesa negativa). Ligar ou desligar uma simulação só muda quais
 * vetores entram na soma. Tudo em centavos inteiros.
 *
 * Mês sem lançamentos (`hasData === false`) é mostrado como "sem lançamentos",
 * mas fica fora do veredito e dos totais; as simulações aparecem nele mesmo assim.
 */

/** Um mês é "apertado" quando a sobra é menor que este percentual da receita dele. */
export const ATTENTION_THRESHOLD_PCT = 10;

/** Quantas simulações têm cor própria no gráfico; as demais viram "Outras". */
export const MAX_COLORED_SIMULATIONS = 6;

/** negative: sobra < 0. tight: sobra menor que o limiar da receita. ok: o resto. (nodata é decidido por quem chama.) */
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
 * Os totais, `tightest`, `negativeCount` e `firstNegative` consideram só os
 * meses com lançamentos (`counted`); `excludedCount` diz quantos ficaram de fora.
 * `firstNegative`/`tightest.index` são índices em `months`.
 *
 * @param {object} p
 * @param {Array}  p.baseline   saída de buildMonthlyBaseline
 * @param {Array}  p.schedules  saída de buildSchedules ({ id, monthly[] })
 * @param {Iterable<string>} p.enabledIds  ids ligados, na ordem em que as colunas aparecem
 */
export function composeMonthly({ baseline, schedules, enabledIds }) {
  const byId = new Map(schedules.map((s) => [s.id, s]));
  const active = [...enabledIds].map((id) => byId.get(id)).filter(Boolean);
  const simIds = active.map((s) => s.id);

  const totals = { income: 0, expense: 0, simTotal: 0, result: 0, baselineResult: 0 };
  const simTotalsC = active.map(() => 0);
  let tightest = null;
  let firstNegative = null;
  let negativeCount = 0;
  let countedMonths = 0;

  const months = baseline.map((b, i) => {
    const hasData = b.hasData !== false;
    const incomeC = hasData ? toCents(b.income) : 0;
    const expenseC = hasData ? toCents(b.expense) : 0;
    const baselineC = incomeC - expenseC;
    let simTotalC = 0;
    const sims = active.map((sch, k) => {
      const v = toCents(sch.monthly?.[i] ?? 0);
      simTotalC += v;
      if (hasData) simTotalsC[k] += v;
      return { id: sch.id, amount: fromCents(v) };
    });
    const resultC = baselineC + simTotalC;
    const status = hasData ? monthStatus(resultC, incomeC) : 'nodata';

    if (hasData) {
      countedMonths += 1;
      if (status === 'negative') {
        negativeCount += 1;
        if (firstNegative === null) firstNegative = i;
      }
      if (tightest === null || resultC < tightest.resultC) {
        tightest = { index: i, resultC, incomeC, baselineC };
      }
      totals.income += incomeC;
      totals.expense += expenseC;
      totals.simTotal += simTotalC;
      totals.result += resultC;
      totals.baselineResult += baselineC;
    }

    return {
      ym: b.ym,
      label: b.label,
      hasData,
      income: fromCents(incomeC),
      expense: fromCents(expenseC),
      sims,
      simTotal: fromCents(simTotalC),
      result: fromCents(resultC),
      baselineResult: fromCents(baselineC),
      status,
      committed: b.committed ?? 0,
      variable: b.variable ?? 0,
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
      sims: active.map((sch, k) => ({ id: sch.id, amount: fromCents(simTotalsC[k]) })),
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
    countedCount: countedMonths,
    excludedCount: months.length - countedMonths,
  };
}

/**
 * Veredito da tela, só com os meses que têm lançamentos.
 *
 * - 1 mês contado: negativo = critical.
 * - 2 ou mais: critical se o total do período é negativo OU mais da metade dos
 *   meses é negativa; se só alguns meses são negativos mas o total é positivo,
 *   warning ("Atenção"); sem negativos, warning se algum mês fica abaixo de
 *   ATTENTION_THRESHOLD_PCT da receita dele; good no resto.
 * - unknown: sem meses, ou nenhum mês com lançamentos.
 *
 * Só olha o fluxo do período: o saldo de partida das contas não entra.
 *
 * @returns {{level, statusLabel, headline, lines: {kind, text}[], slack, commitmentPct}}
 */
export function buildVerdict({ composed }) {
  const mk = (level, headline, lines = []) => ({
    level, statusLabel: VERDICT_STATUS[level], headline, lines, slack: null, commitmentPct: null,
  });
  if (composed.months.length === 0) return mk('unknown', HEADLINE_NO_MONTHS);

  const { months, totals, tightest, negativeCount, firstNegative, simIds, countedCount, excludedCount } = composed;
  const excludedLine = excludedCount > 0 ? [{ kind: 'excluded', text: lineExcluded(excludedCount) }] : [];
  if (countedCount === 0) return mk('unknown', HEADLINE_NO_DATA, excludedLine);

  const n = countedCount;
  const withSims = simIds.length > 0;
  const mostlyNegative = negativeCount * 2 > n;
  const anyTight = months.some((m) => m.status === 'tight');

  let level;
  if (n === 1) level = negativeCount > 0 ? 'critical' : anyTight ? 'warning' : 'good';
  else if (totals.result < 0 || mostlyNegative) level = 'critical';
  else if (negativeCount > 0 || anyTight) level = 'warning';
  else level = 'good';

  const firstNegativeLabel = firstNegative === null ? '' : months[firstNegative].label;
  let headline;
  if (n === 1) {
    headline = headlineSingle({
      label: tightest.label, result: tightest.result, baselineResult: tightest.baselineResult, withSims,
    });
  } else if (level !== 'critical' && negativeCount > 0) {
    headline = headlineMixed({
      n, total: totals.result, baselineTotal: totals.baselineResult, withSims, negativeCount, firstNegativeLabel,
    });
  } else {
    headline = headlineMulti({
      n, total: totals.result, baselineTotal: totals.baselineResult, withSims, negativeCount, firstNegativeLabel,
      tightestLabel: tightest.label, tightestResult: tightest.result, scoped: excludedCount > 0,
    });
  }

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
  const tight = months.find((m) => m.status === 'tight');
  if (level === 'warning' && tight) {
    lines.push({ kind: 'tight', text: lineTight(tight.label, ATTENTION_THRESHOLD_PCT) });
  }
  lines.push(...excludedLine);
  if (!withSims) lines.push({ kind: 'hint', text: LINE_NO_SIMS });

  return { level, statusLabel: VERDICT_STATUS[level], headline, lines, slack, commitmentPct };
}
