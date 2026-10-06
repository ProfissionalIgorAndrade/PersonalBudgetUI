/**
 * Matemática pura do simulador, compartilhada entre o hook (pedido à API),
 * a composição no cliente e a prévia do formulário.
 *
 * Dinheiro é somado em centavos inteiros: os valores da API têm no máximo
 * 2 casas, e somar centavos reproduz exatamente os decimais do backend, sem
 * a deriva de ponto flutuante.
 */

// toPrecision(15) absorbs binary noise (1.005 * 100 = 100.49999999999999) before rounding.
export const toCents = (v) => Math.round(Number(((Number(v) || 0) * 100).toPrecision(15)));
export const fromCents = (c) => c / 100;

/** Normaliza para 2 casas (o que o backend e a tela tratam como valor). */
export const round2 = (v) => fromCents(toCents(v));

/**
 * Parcelas de um impacto Parcelado, igual ao backend (ImpactSchedule):
 * - PerInstallment: o valor é de cada parcela.
 * - Total: parcela = Round(total / n, 2) e o resto vai na última. O backend usa
 *   decimal com arredondamento padrão (meio para o par), replicado aqui com
 *   inteiros para ser exato.
 *
 * Devolve null quando valor ou número de parcelas são inválidos.
 */
export function installmentBreakdown({ amount, amountKind, installments }) {
  const n = Number(installments);
  const cents = toCents(amount);
  if (!Number.isInteger(n) || n < 1 || !(cents > 0)) return null;

  if (amountKind !== 'Total') {
    return { count: n, per: fromCents(cents), last: fromCents(cents), total: fromCents(cents * n) };
  }

  const q = Math.floor(cents / n);
  const r = cents - q * n;
  let perC;
  if (2 * r > n) perC = q + 1;
  else if (2 * r < n) perC = q;
  else perC = q % 2 === 0 ? q : q + 1;
  const lastC = cents - perC * (n - 1);
  return { count: n, per: fromCents(perC), last: fromCents(lastC), total: fromCents(cents) };
}

/** Data local do navegador no formato yyyy-MM-dd (não UTC: perto da meia-noite o dia seria outro). */
export function localToday(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * Impactos no formato da API. Não leva `enabled`: o pedido é o mesmo com a
 * simulação ligada ou desligada, então o liga/desliga não refaz a chamada.
 */
export function projectionImpacts(simulations) {
  return simulations.map((s) => {
    const impact = {
      id: s.id,
      description: s.description,
      type: s.type,
      mode: s.mode,
      startMonth: s.startMonth,
      amount: s.amount,
      amountKind: s.mode === 'Installment' ? s.amountKind : 'PerInstallment',
    };
    if (s.mode === 'Installment') impact.installments = s.installments;
    if (s.mode === 'Monthly' && s.months) impact.months = s.months;
    return impact;
  });
}
