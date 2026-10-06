import { R$, monthLabel } from '../../../core/utils/format';
import { installmentBreakdown } from '../../../core/utils/simulatorMath';

/** Único rótulo de modalidade da tela (formulário, lista e tabelas). */
export const MODE_LABEL = { Single: 'Única', Installment: 'Parcelada', Monthly: 'Mensal' };
export const TYPE_LABEL = { Income: 'Receita', Expense: 'Despesa' };
export const TYPE_ICON = { Income: '📥', Expense: '📤' };

const MONTH_NAMES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

export const monthName = (month) => MONTH_NAMES[month - 1] ?? '';

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
 * Rótulo de um mês da projeção. O primeiro mês (índice 0) só traz o que ainda
 * falta acontecer: o que já aconteceu está dentro do saldo de hoje.
 */
export function projectionMonthLabel(entry, index, { long = false } = {}) {
  if (index === 0) return long ? `restante de ${monthName(entry.month)}` : `${entry.label}*`;
  return entry.label;
}

export const FIRST_MONTH_NOTE =
  '* Primeiro mês: só o que falta acontecer. O que já aconteceu no mês está dentro do saldo de hoje.';

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
