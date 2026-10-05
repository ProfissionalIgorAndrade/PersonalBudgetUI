/**
 * Nota 0-100, veredito e motivos em português, a partir das métricas.
 *
 * Cada pilar vira uma nota 0-100 por interpolação linear entre dois limiares
 * de targets.js. Pilar sem base de cálculo (sem receita, sem histórico) tem
 * `score: null` e sai da conta: os pesos dos demais são reescalados, em vez de
 * inventar um 0 ou um 100.
 */
import { R$ } from '../../../core/utils/format';
import {
  SAVINGS_RATE_TARGET, COMMITMENT_IDEAL, COMMITMENT_LIMIT, RESERVE_MONTHS_TARGET,
  STABILITY_TOLERANCE, WEIGHTS, HEALTHY_MIN, ATTENTION_MIN, BASELINE_MONTHS,
} from './targets';
import {
  summarizeMonth, averageExpense, reserveCoverage, stability,
} from './metrics';

/** Interpola de (x0 -> y0) a (x1 -> y1), travando nos extremos. Funciona com x0 > x1. */
export function linear(x, x0, x1, y0, y1) {
  if (!Number.isFinite(x) || x0 === x1) return y0;
  const t = (x - x0) / (x1 - x0);
  return y0 + (y1 - y0) * Math.min(Math.max(t, 0), 1);
}

export const pct = (v, digits = 0) =>
  `${(v * 100).toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`;

const months = (v) =>
  `${v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ${v >= 1.05 || v < 0.95 ? 'meses' : 'mês'}`;

export const LEVEL_LABELS = { good: 'Saudável', warning: 'Atenção', critical: 'Crítico', unknown: 'Sem dados suficientes' };

export const levelOf = (score) =>
  (score >= HEALTHY_MIN ? 'good' : score >= ATTENTION_MIN ? 'warning' : 'critical');

const unknown = (id, label, weight, target, reason) =>
  ({ id, label, weight, target, score: null, status: 'unknown', value: null, reason });

function pillar(id, label, target, score, value, reason) {
  return { id, label, weight: WEIGHTS[id], target, score: Math.round(score), status: levelOf(score), value, reason };
}

function savingsPillar(s) {
  const target = `meta ${pct(SAVINGS_RATE_TARGET)}`;
  if (s.savingsRate === null) {
    return unknown('savings', 'Poupança', WEIGHTS.savings, target, 'Sem receitas lançadas no mês: não dá para calcular a poupança.');
  }
  const score = linear(s.savingsRate, 0, SAVINGS_RATE_TARGET, 0, 100);
  const missing = Math.max(s.income * SAVINGS_RATE_TARGET - s.result, 0);
  const reason = missing > 0.005
    ? `Poupança ${pct(s.savingsRate)} — meta ${pct(SAVINGS_RATE_TARGET)}: faltam ${R$(missing)} por mês.`
    : `Poupança ${pct(s.savingsRate)} — acima da meta de ${pct(SAVINGS_RATE_TARGET)}.`;
  return pillar('savings', 'Poupança', target, score, s.savingsRate, reason);
}

function commitmentPillar(s) {
  const target = `meta até ${pct(COMMITMENT_IDEAL)}`;
  if (s.commitmentRate === null) {
    return unknown('commitment', 'Compromisso da renda', WEIGHTS.commitment, target, 'Sem receitas lançadas no mês: não dá para medir o compromisso da renda.');
  }
  const score = linear(s.commitmentRate, COMMITMENT_IDEAL, COMMITMENT_LIMIT, 100, 0);
  const excess = Math.max(s.commitments - s.income * COMMITMENT_IDEAL, 0);
  const reason = excess > 0.005
    ? `Fixos e parcelas levam ${pct(s.commitmentRate)} da renda — meta até ${pct(COMMITMENT_IDEAL)}: reduza ${R$(excess)} por mês.`
    : `Fixos e parcelas levam ${pct(s.commitmentRate)} da renda — dentro da meta de ${pct(COMMITMENT_IDEAL)}.`;
  return pillar('commitment', 'Compromisso da renda', target, score, s.commitmentRate, reason);
}

function reservePillar(reserve, avgExpense) {
  const target = `meta ${RESERVE_MONTHS_TARGET} meses`;
  const label = 'Reserva de emergência';
  if (reserve.state === 'no-boxes') {
    return pillar('reserve', label, target, 0, 0, `Nenhuma caixinha criada — meta de ${RESERVE_MONTHS_TARGET} meses de despesa guardados.`);
  }
  if (reserve.state === 'no-expense') {
    return unknown('reserve', label, WEIGHTS.reserve, target, 'Sem despesas nos meses anteriores: não dá para medir a reserva em meses.');
  }
  const score = linear(reserve.months, 0, RESERVE_MONTHS_TARGET, 0, 100);
  const missing = Math.max(avgExpense * RESERVE_MONTHS_TARGET - reserve.total, 0);
  const reason = missing > 0.005
    ? `Reserva cobre ${months(reserve.months)} — meta ${RESERVE_MONTHS_TARGET}: faltam ${R$(missing)}.`
    : `Reserva cobre ${months(reserve.months)} — meta de ${RESERVE_MONTHS_TARGET} atingida.`;
  return pillar('reserve', label, target, score, reserve.months, reason);
}

function stabilityPillar(st) {
  const target = 'meta: até a média';
  const label = 'Estabilidade do mês';
  if (st === null) {
    return unknown('stability', label, WEIGHTS.stability, target, `Sem despesas nos ${BASELINE_MONTHS} meses anteriores para comparar.`);
  }
  const score = linear(st.ratio, 1, 1 + STABILITY_TOLERANCE, 100, 0);
  const diff = st.ratio - 1;
  const reason = diff > 0.005
    ? `Despesa ${pct(diff)} acima da média dos últimos ${BASELINE_MONTHS} meses (${R$(st.average)}).`
    : `Despesa dentro da média dos últimos ${BASELINE_MONTHS} meses (${R$(st.average)}).`;
  return pillar('stability', label, target, score, st.ratio, reason);
}

/**
 * Avalia a saúde do mês `ym`.
 *
 * @returns {{
 *   score: number|null, level: 'good'|'warning'|'critical'|'unknown', label: string,
 *   capped: boolean, headline: string, pillars: object[], summary: object
 * }}
 */
export function evaluateHealth(transactions, accounts, ym) {
  const summary = summarizeMonth(transactions, ym);
  const avgExpense = averageExpense(transactions, ym);
  const pillars = [
    savingsPillar(summary),
    commitmentPillar(summary),
    reservePillar(reserveCoverage(accounts, avgExpense), avgExpense),
    stabilityPillar(stability(transactions, ym)),
  ];

  const scored = pillars.filter(p => p.score !== null);
  const weightSum = scored.reduce((s, p) => s + p.weight, 0);
  if (weightSum === 0) {
    return {
      score: null, level: 'unknown', label: 'Sem dados suficientes', capped: false,
      headline: 'Sem dados suficientes neste mês para calcular a saúde financeira.', pillars, summary,
    };
  }

  const score = Math.round(scored.reduce((s, p) => s + p.score * p.weight, 0) / weightSum);
  let level = levelOf(score);
  const capped = summary.result < 0 && level === 'good';
  if (capped) level = 'warning';

  // Principal motivo: mês no vermelho primeiro; senão o pilar que mais tira nota.
  let headline;
  if (summary.result < 0) {
    headline = `O mês fechou no vermelho: despesas superam as receitas em ${R$(-summary.result)}.`;
  } else {
    const worst = [...scored].sort((a, b) => b.weight * (100 - b.score) - a.weight * (100 - a.score))[0];
    headline = worst.score >= 100 ? 'Todos os pilares estão dentro das metas.' : worst.reason;
  }

  return { score, level, label: LEVEL_LABELS[level], capped, headline, pillars, summary };
}
