/**
 * Estimativa client-side do status de um cartão baseado na data de hoje
 * e nos dias de fechamento/vencimento configurados no cartão.
 *
 * Não consulta a API — serve apenas para filtros visuais e badges rápidos.
 * O status real da fatura (com fechamento e pagamento) vem do CardDetail.
 *
 * @param {object} card
 * @returns {'open'|'closed'|'overdue'}
 */
export function getCardStatus(card) {
  const today   = new Date().getDate();
  const closing = Number(card.closingDay) || 1;
  const due     = Number(card.dueDay) || 10;

  if (today <= closing)              return 'open';
  if (today > closing && today <= due) return 'closed';
  return 'overdue';
}

export const STATUS_LABELS = {
  open:    'Aberta',
  closed:  'Fechada',
  overdue: 'Vencida',
};

export const STATUS_COLORS = {
  open:    'var(--primary)',
  closed:  'var(--yellow)',
  overdue: 'var(--red)',
};
