/**
 * Atalhos por intenção do "E se...?" novo. Cada um é só um jeito de preencher
 * tipo e modalidade da mesma simulação que o servidor já aceita
 * (Income/Expense × Single/Installment/Monthly, mais CardPayoff, a quitação
 * das parcelas de cartão, que só guarda o mês e os cartões).
 */
export const INTENTS = [
  {
    id: 'buy',
    label: 'Comprar à vista',
    type: 'Expense', mode: 'Single',
    amountLabel: 'Quanto custa',
    monthLabel: 'Mês da compra',
    placeholder: 'Ex.: Geladeira nova',
  },
  {
    id: 'buy-installments',
    label: 'Comprar parcelado',
    type: 'Expense', mode: 'Installment',
    amountLabel: 'Valor',
    monthLabel: 'Primeira parcela',
    placeholder: 'Ex.: Notebook em 10×',
  },
  {
    id: 'sell',
    label: 'Vender algo',
    type: 'Income', mode: 'Single',
    amountLabel: 'Por quanto vai vender',
    monthLabel: 'Mês em que recebe',
    placeholder: 'Ex.: Venda do carro',
  },
  {
    id: 'new-expense',
    label: 'Novo gasto mensal',
    type: 'Expense', mode: 'Monthly',
    amountLabel: 'Quanto por mês',
    monthLabel: 'A partir de',
    placeholder: 'Ex.: Escola de inglês',
  },
  {
    id: 'new-income',
    label: 'Nova renda mensal',
    type: 'Income', mode: 'Monthly',
    amountLabel: 'Quanto por mês',
    monthLabel: 'A partir de',
    placeholder: 'Ex.: Aumento de salário',
  },
  {
    id: 'card-payoff',
    label: 'Quitar parcelas do cartão',
    type: 'Expense', mode: 'CardPayoff',
    amountLabel: 'Total a pagar',
    monthLabel: 'Mês da quitação',
    placeholder: 'Ex.: Zerar os cartões no fim do ano',
  },
];

const BY_ID = new Map(INTENTS.map((i) => [i.id, i]));

export const intentById = (id) => BY_ID.get(id) ?? INTENTS[0];

/**
 * Intenção de uma simulação já salva. Venda parcelada (Income + Installment)
 * não tem atalho próprio: é "Vender algo" com "recebo em parcelas" ligado.
 */
export function intentOf(sim) {
  if (sim.mode === 'CardPayoff') return 'card-payoff';
  if (sim.type === 'Income') return sim.mode === 'Monthly' ? 'new-income' : 'sell';
  if (sim.mode === 'Installment') return 'buy-installments';
  if (sim.mode === 'Monthly') return 'new-expense';
  return 'buy';
}

/** Modalidade efetiva: "Vender algo" vira parcelada quando a pessoa recebe em parcelas. */
export const modeFor = (intentId, splitSale) => {
  const intent = intentById(intentId);
  if (intent.id === 'sell' && splitSale) return 'Installment';
  return intent.mode;
};
