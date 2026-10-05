/**
 * Metas, pesos e limiares da nota de saúde financeira.
 *
 * Tudo que define "saudável" mora neste arquivo e só aqui. Os valores são
 * premissas baseadas em referências de mercado (regra 50/30/20, reserva de
 * 3 a 6 meses), não foram validadas com os dados reais da família: ajuste
 * aqui, sem tocar na lógica.
 */

/** Taxa de poupança (sobra ÷ receita). >= meta rende 100; 0% ou menos rende 0. */
export const SAVINGS_RATE_TARGET = 0.20;

/** Compromisso da renda (fixos + parcelas ÷ receita). <= ideal rende 100; >= limite rende 0. */
export const COMMITMENT_IDEAL = 0.50;
export const COMMITMENT_LIMIT = 0.80;

/** Reserva de emergência, em meses de despesa média. >= meta rende 100. */
export const RESERVE_MONTHS_TARGET = 6;
/** Mínimo aceitável, usado só para o texto. */
export const RESERVE_MONTHS_MIN = 3;

/** Estabilidade: despesa do mês ÷ média dos meses anteriores. <= 1 rende 100; >= 1 + tolerância rende 0. */
export const STABILITY_TOLERANCE = 0.30;

/** Quantos meses anteriores formam a "média" de despesa e de categoria. */
export const BASELINE_MONTHS = 3;

/** Categoria só entra em "Onde economizar" se passar da média por este percentual. */
export const CATEGORY_EXCESS_THRESHOLD = 0.20;
export const CATEGORY_TOP_N = 5;

/** Horizonte do plano de futuro, em meses. */
export const FUTURE_MONTHS = 6;

/** Peso de cada pilar na nota. A soma é 100. */
export const WEIGHTS = {
  savings: 30,
  commitment: 25,
  reserve: 25,
  stability: 20,
};

/** Nota mínima de cada veredito. Abaixo de ATTENTION_MIN é crítico. */
export const HEALTHY_MIN = 75;
export const ATTENTION_MIN = 50;
