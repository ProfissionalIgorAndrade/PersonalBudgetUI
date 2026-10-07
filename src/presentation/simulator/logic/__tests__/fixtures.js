/**
 * Cenário de referência, horizonte de 6 meses a partir de out/26, com os
 * números derivados à mão (centavos).
 *
 * Simulações:
 *  - car   : despesa 12x de R$ 150,00 (por parcela) a partir de out/26 -> 6 parcelas no horizonte
 *  - phone : despesa 12x, total R$ 1.000,00 a partir de dez/26 -> 83,33 x 11 + 83,37 (a última fica fora)
 *  - salary: receita mensal de R$ 1.200,00 a partir de dez/26, sem duração (até o fim do horizonte)
 *  - trip  : despesa única de R$ 6.000,00 em jan/27 (deixa o mês negativo)
 */
import { buildSchedules } from '../schedule';

export const FIRST_MONTH = '2026-10';
export const HORIZON = 6;

const B = (ym, label, income, expense, committed) => ({
  ym, label, income, expense, result: Math.round((income - expense) * 100) / 100, hasData: true,
  committed, variable: Math.round((expense - committed) * 100) / 100,
});

export const baseline = [
  B('2026-10', 'out/26', 4000, 3400, 2500),
  B('2026-11', 'nov/26', 4000, 3400.75, 2500.5),
  B('2026-12', 'dez/26', 4000, 3700.75, 2500.5),
  B('2027-01', 'jan/27', 4000, 4700.25, 3800),
  B('2027-02', 'fev/27', 4000, 3400.75, 2500.5),
  B('2027-03', 'mar/27', 4000, 3400.75, 2500.5),
];

const sim = (id, over) => ({
  id, enabled: true, amountKind: 'PerInstallment', installments: null, months: null, startMonth: '2026-10', ...over,
});

export const SIMS = [
  sim('car', { description: 'Carro', type: 'Expense', mode: 'Installment', amount: 150, installments: 12 }),
  sim('phone', { description: 'Celular', type: 'Expense', mode: 'Installment', amount: 1000, amountKind: 'Total', installments: 12, startMonth: '2026-12' }),
  sim('salary', { description: 'Freela', type: 'Income', mode: 'Monthly', amount: 1200, startMonth: '2026-12' }),
  sim('trip', { description: 'Viagem', type: 'Expense', mode: 'Single', amount: 6000, startMonth: '2027-01' }),
];

export const schedules = buildSchedules(SIMS, FIRST_MONTH, HORIZON);

export const ALL_IDS = ['car', 'phone', 'salary', 'trip'];
