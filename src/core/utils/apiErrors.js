/**
 * Traduz mensagens técnicas da API para texto compreensível na UI.
 */
export function formatApiErrorMessage(rawMessage) {
  if (rawMessage == null || rawMessage === '') return 'Erro desconhecido.';
  const msg = String(rawMessage).trim();

  if (/subtrair\s+mais/i.test(msg) || /mais\s+do\s+que\s+o\s+valor\s+dispon/i.test(msg)) {
    return 'A conta vinculada a este cartão não tem saldo disponível para realizar o pagamento.';
  }

  return msg;
}
