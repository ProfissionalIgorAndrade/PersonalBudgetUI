/**
 * Traduz mensagens técnicas da API para texto compreensível na UI.
 */
export function formatApiErrorMessage(rawMessage) {
  if (rawMessage == null || rawMessage === '') return 'Erro desconhecido.';
  const msg = String(rawMessage).trim();
  const lower = msg.toLowerCase();

  if (/subtrair\s+mais/i.test(msg) || /mais\s+do\s+que\s+o\s+valor\s+dispon/i.test(msg)) {
    return 'A conta vinculada a este cartão não tem saldo disponível para realizar o pagamento.';
  }

  if (/\bcash\b/i.test(lower) && (lower.includes('não') || lower.includes('unsupported') || lower.includes('suport')))
    return 'Pagamento em dinheiro não é suportado na criação; use conta, cartão ou transferência.';

  if (lower.includes('installment') && (lower.includes('frequency') || lower.includes('parcela')))
    return 'Combine parcelamento apenas com Frequência “Installments” e cartão no formulário.';
  if (lower.includes('transfer') && (lower.includes('variable') || lower.includes('variável')))
    return 'Transferências devem ser pontuais (frequência variável / única).';
  if (lower.includes('credit') && lower.includes('variable') && lower.includes('must'))
    return 'Compra à vista no cartão exige frequência variável.';

  if (lower.includes('repeat') && lower.includes('fixed'))
    return 'Recorrência em vários meses exige frequência fixa e conta selecionada.';
  if (lower.includes('repeat') && lower.includes('account'))
    return 'Recorrência mensal só é permitida com lançamento em conta.';

  if (lower.includes('from') && lower.includes('to') && (lower.includes('different') || lower.includes('distint')))
    return 'Origem e destino da transferência precisam ser contas diferentes.';

  if (lower.includes('negative') || lower.includes('negativ') || lower.includes('menor que zero'))
    return 'O valor informado não pode ser negativo.';

  return msg;
}
