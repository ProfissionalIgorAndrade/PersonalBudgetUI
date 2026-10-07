/**
 * Resposta de referência no formato de POST /api/simulator/projection, com os
 * números derivados à mão (centavos), horizonte de 6 meses a partir de out/26.
 *
 * Simulações:
 *  - car   : despesa 12x de R$ 150,00 (por parcela) a partir de out/26 -> 6 parcelas no horizonte
 *  - phone : despesa 12x, total R$ 1.000,00 a partir de dez/26 -> 83,33 x 11 + 83,37 (a última fica fora)
 *  - salary: receita mensal de R$ 1.200,00 a partir de dez/26, sem duração (até o fim do horizonte)
 *  - trip  : despesa única de R$ 6.000,00 em jan/27 (deixa o saldo negativo)
 */

const M = (year, month, label, income, committed, variable, result, balance) =>
  ({ year, month, label, income, committed, variable, result, balance });

export const baseline = [
  M(2026, 10, 'out/26', 500, 1800, 300, -1600, 3400),
  M(2026, 11, 'nov/26', 4000, 2500.5, 900.25, 599.25, 3999.25),
  M(2026, 12, 'dez/26', 4000, 2500.5, 1200.25, 299.25, 4298.5),
  M(2027, 1, 'jan/27', 4000, 3800, 900.25, -700.25, 3598.25),
  M(2027, 2, 'fev/27', 4000, 2500.5, 900.25, 599.25, 4197.5),
  M(2027, 3, 'mar/27', 4000, 2500.5, 900.25, 599.25, 4796.75),
];

export const impacts = [
  {
    id: 'car', description: 'Carro', type: 'Expense', mode: 'Installment',
    monthly: [-150, -150, -150, -150, -150, -150],
    totalInHorizon: -900, totalFull: -1800,
    installmentAmount: 150, lastInstallmentAmount: 150, installmentsInHorizon: 6, installmentsTotal: 12,
  },
  {
    id: 'phone', description: 'Celular', type: 'Expense', mode: 'Installment',
    monthly: [0, 0, -83.33, -83.33, -83.33, -83.33],
    totalInHorizon: -333.32, totalFull: -1000,
    installmentAmount: 83.33, lastInstallmentAmount: 83.37, installmentsInHorizon: 4, installmentsTotal: 12,
  },
  {
    id: 'salary', description: 'Freela', type: 'Income', mode: 'Monthly',
    monthly: [0, 0, 1200, 1200, 1200, 1200],
    totalInHorizon: 4800, totalFull: 4800,
    installmentAmount: null, lastInstallmentAmount: null, installmentsInHorizon: 4, installmentsTotal: null,
  },
  {
    id: 'trip', description: 'Viagem', type: 'Expense', mode: 'Single',
    monthly: [0, 0, 0, -6000, 0, 0],
    totalInHorizon: -6000, totalFull: -6000,
    installmentAmount: null, lastInstallmentAmount: null, installmentsInHorizon: 1, installmentsTotal: 1,
  },
];

export const opening = { amount: 5000, asOf: '2026-10-06', excludesSavings: true,
  accounts: [{ id: 'c1', name: 'Conta corrente', balance: 5000 }] };

export const ALL_IDS = ['car', 'phone', 'salary', 'trip'];

/**
 * Mesma resposta com `fullMonth` (receita e despesa do MÊS INTEIRO). Nos meses
 * futuros é igual a income / committed + variable. No mês atual (out/26) o
 * `baseline` acima traz só o restante (500 / 1800 + 300); o mês inteiro é
 * receita 4000,00, despesa 3400,00, sobra 600,00.
 */
const FM = (income, expense) => ({ income, expense, result: Math.round((income - expense) * 100) / 100 });
const FULL = [FM(4000, 3400), FM(4000, 3400.75), FM(4000, 3700.75), FM(4000, 4700.25), FM(4000, 3400.75), FM(4000, 3400.75)];
export const baselineFull = baseline.map((b, i) => ({ ...b, fullMonth: FULL[i] }));
