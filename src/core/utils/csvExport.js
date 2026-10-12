import { buildCsv, formatAmount, TYPE_LABEL } from './csvFormat';

export function generateTransactionsCsv(transactions, categories, members) {
  const rows = (transactions || []).map(tx => {
    const cat = (categories || []).find(c => c.id === tx.categoryId);
    const mem = (members   || []).find(m => m.id === tx.memberId || m.id === tx.attributionProfileId);
    return [
      tx.id ?? '',
      tx.description ?? '',
      formatAmount(tx.amount),
      tx.date ?? '',
      tx.type === 'income' ? TYPE_LABEL.income : TYPE_LABEL.expense,
      cat?.name ?? '',
      mem?.name ?? mem?.displayName ?? '',
      tx.observations ?? tx.notes ?? '',
    ];
  });

  return buildCsv(rows);
}
