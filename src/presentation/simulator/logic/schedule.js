import { toCents, fromCents, installmentBreakdown } from '../../../core/utils/simulatorMath';
import { addMonths, shortMonth } from './labels';

/**
 * Posiciona cada simulação na linha do tempo do horizonte. Porte fiel do
 * ImpactSchedule do backend (matemática pura, centavos inteiros):
 *
 * - Single: uma ocorrência no mês de início.
 * - Installment: n ocorrências seguidas. PerInstallment usa o valor dado;
 *   Total usa Round(total/n, 2) e o resto vai na última (installmentBreakdown).
 * - Monthly: uma ocorrência por mês, por `months` meses, ou do início até o
 *   fim do horizonte quando não há duração (vazio ou 0).
 * - Ocorrências fora da janela não entram no vetor mensal nem em
 *   totalInHorizon, mas entram em totalFull e geram aviso.
 *
 * Receita é positiva e despesa negativa.
 */

const ordinal = (ym) => {
  const [y, m] = ym.split('-').map(Number);
  return y * 12 + (m - 1);
};

/** Quantos meses de `a` até `b` (negativo se b é anterior). */
export const monthsUntil = (a, b) => ordinal(b) - ordinal(a);

/**
 * @param {object} sim { id, description, type, mode, startMonth, amount, amountKind, installments, months }
 * @param {string} firstMonth 'YYYY-MM'
 * @param {number} horizon quantidade de meses da janela
 * @returns {{id, type, mode, monthly: number[], totalInHorizon, totalFull,
 *   installmentAmount, lastInstallmentAmount, installmentsInHorizon, installmentsTotal,
 *   warnings: {impactId, code, message}[]}}
 */
export function buildSchedule(sim, firstMonth, horizon) {
  const horizonEnd = addMonths(firstMonth, horizon - 1);
  const sign = sim.type === 'Income' ? 1 : -1;
  const isInstallment = sim.mode === 'Installment';

  let perC;
  let lastC;
  if (isInstallment) {
    const b = installmentBreakdown(sim);
    perC = b ? toCents(b.per) : 0;
    lastC = b ? toCents(b.last) : 0;
  } else {
    perC = toCents(sim.amount);
    lastC = perC;
  }

  // null = sem fim definido (Monthly sem duração): vai até o fim do horizonte.
  let definedCount;
  if (sim.mode === 'Single') definedCount = 1;
  else if (isInstallment) definedCount = Number(sim.installments) || 0;
  else definedCount = Number(sim.months) > 0 ? Number(sim.months) : null;

  const occurrences = definedCount ?? Math.max(0, monthsUntil(sim.startMonth, horizonEnd) + 1);

  const monthlyC = new Array(horizon).fill(0);
  let inHorizonC = 0;
  let fullC = 0;
  let inHorizon = 0;
  const startOffset = monthsUntil(firstMonth, sim.startMonth);

  for (let k = 0; k < occurrences; k++) {
    const amountC = sign * (k === occurrences - 1 ? lastC : perC);
    fullC += amountC;
    const index = startOffset + k;
    if (index < 0 || index >= horizon) continue;
    monthlyC[index] = amountC;
    inHorizonC += amountC;
    inHorizon += 1;
  }

  const name = sim.description?.trim() || 'Simulação';
  const first = shortMonth(firstMonth);
  const end = shortMonth(horizonEnd);
  const warnings = [];
  const warn = (code, message) => warnings.push({ impactId: sim.id, code, message });

  if (sim.startMonth < firstMonth) {
    warn(
      inHorizon > 0 ? 'Truncated' : 'BeforeWindow',
      inHorizon > 0
        ? `"${name}" começa antes de ${first}: só os meses a partir de ${first} entram na projeção.`
        : `"${name}" termina antes de ${first} e não afeta o período projetado.`,
    );
  }

  if (sim.startMonth > horizonEnd) {
    warn('AfterWindow', `"${name}" começa depois de ${end} e não entra no horizonte; só o total completo o considera.`);
  } else if (definedCount !== null && addMonths(sim.startMonth, definedCount - 1) > horizonEnd) {
    warn('AfterWindow', `"${name}" continua depois de ${end}: o total no horizonte considera só até lá e o total completo inclui todas as ocorrências.`);
  }

  return {
    id: sim.id,
    type: sim.type,
    mode: sim.mode,
    monthly: monthlyC.map(fromCents),
    totalInHorizon: fromCents(inHorizonC),
    totalFull: fromCents(fullC),
    installmentAmount: isInstallment ? fromCents(perC) : null,
    lastInstallmentAmount: isInstallment ? fromCents(lastC) : null,
    installmentsInHorizon: inHorizon,
    installmentsTotal: definedCount,
    warnings,
  };
}

/** Um schedule por simulação (ligada ou não), na ordem da lista. */
export const buildSchedules = (simulations, firstMonth, horizon) =>
  simulations.map((s) => buildSchedule(s, firstMonth, horizon));
