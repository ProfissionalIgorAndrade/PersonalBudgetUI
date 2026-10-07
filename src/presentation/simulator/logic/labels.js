import { R$, monthLabel } from '../../../core/utils/format';
import { installmentBreakdown } from '../../../core/utils/simulatorMath';
import { findMember } from '../../../application/mappers/index';

/** Único rótulo de modalidade da tela (formulário, lista e tabelas). */
export const MODE_LABEL = { Single: 'Única', Installment: 'Parcelada', Monthly: 'Mensal' };
export const TYPE_LABEL = { Income: 'Receita', Expense: 'Despesa' };
export const TYPE_ICON = { Income: '📥', Expense: '📤' };

/** "2026-03" -> "mar/26". */
export const shortMonth = (ym) => monthLabel(ym).toLowerCase();

/** Soma meses a um "yyyy-MM". */
export function addMonths(ym, k) {
  const [y, m] = ym.split('-').map(Number);
  const ord = y * 12 + (m - 1) + k;
  return `${Math.floor(ord / 12)}-${String((ord % 12) + 1).padStart(2, '0')}`;
}

/** Valor com sinal explícito: "+R$ 1,00", "−R$ 1,00"; zero sem sinal. */
export function signedMoney(v) {
  if (!v) return R$(0);
  return `${v > 0 ? '+' : '−'}${R$(Math.abs(v))}`;
}

/**
 * Frase legível de uma simulação, ex.:
 * "12× R$ 150,00 = R$ 1.800,00 · mar/26 a fev/27 · 6 parcelas dentro do horizonte".
 * `projection` (impacto devolvido pela API) é opcional: sem ele a frase omite
 * a parte que depende do horizonte.
 */
export function describeSimulation(sim, projection) {
  const start = shortMonth(sim.startMonth);

  if (sim.mode === 'Installment') {
    const b = installmentBreakdown(sim);
    if (!b) return '';
    const last = b.per !== b.last ? ` (última ${R$(b.last)})` : '';
    const parts = [`${b.count}× ${R$(b.per)}${last} = ${R$(b.total)}`];
    parts.push(b.count > 1 ? `${start} a ${shortMonth(addMonths(sim.startMonth, b.count - 1))}` : start);
    if (projection) {
      const k = projection.installmentsInHorizon;
      parts.push(k === 0 ? 'nenhuma parcela dentro do horizonte' : `${k} ${k === 1 ? 'parcela' : 'parcelas'} dentro do horizonte`);
    }
    return parts.join(' · ');
  }

  if (sim.mode === 'Monthly') {
    const parts = [`${R$(sim.amount)} por mês`, `a partir de ${start}`];
    if (sim.months) {
      parts.push(`por ${sim.months} ${sim.months === 1 ? 'mês' : 'meses'} (até ${shortMonth(addMonths(sim.startMonth, sim.months - 1))})`);
    } else {
      parts.push('até o fim do horizonte');
    }
    return parts.join(' · ');
  }

  return `${R$(sim.amount)} · ${start}`;
}

/** Prévia ao vivo do formulário (campos já validados como números). */
export function previewText(form) {
  const amount = Number(form.amount);
  if (!(amount > 0) || !/^\d{4}-\d{2}$/.test(form.startMonth || '')) return '';
  if (form.mode === 'Installment') {
    const b = installmentBreakdown({ amount, amountKind: form.amountKind, installments: form.installments });
    if (!b) return '';
    return `${b.count}× ${R$(b.per)} · última parcela ${R$(b.last)} · total ${R$(b.total)}`;
  }
  if (form.mode === 'Monthly') {
    const months = Number(form.months);
    return months > 0
      ? `${R$(amount)} por mês, por ${months} ${months === 1 ? 'mês' : 'meses'}, a partir de ${shortMonth(form.startMonth)}`
      : `${R$(amount)} por mês, a partir de ${shortMonth(form.startMonth)} até o fim do horizonte`;
  }
  return `${R$(amount)} em ${shortMonth(form.startMonth)}`;
}

/* ── Visão mensal: nomes, veredito e situação do mês ─────────────── */

/** Nome do cartão: a descrição, ou "Simulação N" (N = posição na lista, a partir de 1). */
export const simulationName = (sim, index) => (sim.description?.trim() || `Simulação ${index + 1}`);

/** Frase curta da parcela no cartão: "R$ 150,00/mês de mar/26 a fev/27". */
export function simulationSummary(sim) {
  const start = shortMonth(sim.startMonth);
  if (sim.mode === 'Installment') {
    const b = installmentBreakdown(sim);
    if (!b) return '';
    if (b.count === 1) return `${R$(b.per)} em ${start}`;
    return `${R$(b.per)}/mês de ${start} a ${shortMonth(addMonths(sim.startMonth, b.count - 1))}`;
  }
  if (sim.mode === 'Monthly') {
    return sim.months
      ? `${R$(sim.amount)}/mês de ${start} a ${shortMonth(addMonths(sim.startMonth, sim.months - 1))}`
      : `${R$(sim.amount)}/mês a partir de ${start}, até o fim do período`;
  }
  return `${R$(sim.amount)} em ${start}`;
}

/** Segunda linha, só para parcelada: "12× R$ 150,00 = R$ 1.800,00 (última R$ 83,37)". */
export function installmentTotalText(sim) {
  if (sim.mode !== 'Installment') return '';
  const b = installmentBreakdown(sim);
  if (!b) return '';
  const last = b.per !== b.last ? ` (última ${R$(b.last)})` : '';
  return `${b.count}× ${R$(b.per)}${last} = ${R$(b.total)}`;
}

export const VERDICT_STATUS = {
  critical: 'Crítico', warning: 'Atenção', good: 'Tudo certo', unknown: 'Sem dados',
};

/** Situação de cada mês: ícone (via HlStatus) + texto. */
export const MONTH_STATUS = {
  negative: { level: 'critical', label: 'Negativo' },
  tight: { level: 'warning', label: 'Apertado' },
  ok: { level: 'good', label: 'Positivo' },
  nodata: { level: 'unknown', label: 'Sem lançamentos' },
};

const monthsWord = (n) => `${n} ${n === 1 ? 'mês' : 'meses'}`;
const baselineNote = (withSims, baselineValue) => (withSims ? ` (sem simulações: ${R$(baselineValue)})` : '');

/** Veredito de 1 mês. */
export function headlineSingle({ label, result, baselineResult, withSims }) {
  const note = baselineNote(withSims, baselineResult);
  if (result < 0) return `Em ${label} o mês fica negativo em ${R$(-result)}${note}.`;
  if (result === 0) return `Em ${label} o mês fecha zerado${note}.`;
  return `Em ${label} o mês fecha com sobra de ${R$(result)}${note}.`;
}

/** Veredito de N meses (N > 1). */
export function headlineMulti({
  n, total, baselineTotal, withSims, negativeCount, firstNegativeLabel, tightestLabel, tightestResult, scoped = false,
}) {
  const scope = scoped ? `Nos ${monthsWord(n)} com lançamentos` : `Nos próximos ${monthsWord(n)}`;
  const head = `${scope}: ${total < 0 ? 'falta total' : 'sobra total'} de ${R$(Math.abs(total))}`
    + `${baselineNote(withSims, baselineTotal)}.`;
  if (negativeCount > 0) {
    const count = negativeCount === 1 ? '1 mês fica negativo' : `${negativeCount} de ${n} meses ficam negativos`;
    return `${head} ${count}; o primeiro é ${firstNegativeLabel}.`;
  }
  if (tightestResult === 0) {
    return `${head} Nenhum mês fica no vermelho; o mais apertado é ${tightestLabel}, que fecha zerado.`;
  }
  return `${head} Todos os meses seguem positivos; o mais apertado é ${tightestLabel}, com ${R$(tightestResult)} de sobra.`;
}

/**
 * Veredito de N meses (N > 1) quando só ALGUNS meses ficam negativos e o total
 * do período é positivo: o período como um todo sobra, mas há mês no vermelho.
 */
export function headlineMixed({ n, total, baselineTotal, withSims, negativeCount, firstNegativeLabel }) {
  const note = baselineNote(withSims, baselineTotal);
  const head = total > 0
    ? `Em ${monthsWord(n)} sobram ${R$(total)}${note}`
    : `Em ${monthsWord(n)} o total fecha zerado${note}`;
  const but = negativeCount === 1
    ? `${firstNegativeLabel} fecha negativo`
    : `${negativeCount} meses fecham negativos; o primeiro é ${firstNegativeLabel}`;
  return `${head}, mas ${but}.`;
}

export const lineSlack = (amount) => `Você ainda pode assumir até ${R$(amount)} por mês a mais sem ficar no vermelho.`;
export const lineGap = (label, amount) => `Para ${label} fechar sem ficar no vermelho, faltam ${R$(amount)}.`;
export const lineCommitment = (pct, label, withSims) =>
  `${withSims ? 'Com as simulações, ' : ''}${pct}% da receita de ${label} fica comprometida.`;
export const lineTight = (label, pct) =>
  `A sobra de ${label} é menor que ${pct}% da receita do mês: qualquer imprevisto pode deixá-lo negativo.`;
export const LINE_NO_SIMS = 'Nenhuma simulação ligada. Adicione uma compra, renda ou gasto para ver o que muda mês a mês.';

export const HEADLINE_NO_DATA = 'Nenhum mês do período tem lançamentos, então não há base para comparar.';
export const lineExcluded = (n) =>
  `${n} ${n === 1 ? 'mês sem lançamentos não entra' : 'meses sem lançamentos não entram'} na conta.`;
export const HEADLINE_NO_MONTHS = 'Sem meses para projetar.';

/** Texto neutro quando nem o perfil nem a API trazem o nome do dono. */
export const OWNER_FALLBACK = 'Membro da família';

/**
 * Dono de uma simulação para o cartão: avatar e cor do perfil (achado pelo
 * `ownerUserId`) e o nome. Sem perfil em `members`, usa o `ownerName` da API;
 * sem nome, um rótulo neutro. `text` é "você" para quem criou, "de <Nome>" nos demais.
 */
export function ownerInfo(sim, members) {
  const member = findMember(members || [], sim.ownerUserId);
  const name = member?.name || sim.ownerName || OWNER_FALLBACK;
  return {
    name,
    emoji: member?.emoji || null,
    color: member?.color || null,
    text: sim.isOwner ? 'você' : `de ${name}`,
  };
}
