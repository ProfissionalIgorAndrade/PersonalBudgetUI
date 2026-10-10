const HEADER = ['id_sistema', 'descricao', 'valor', 'data', 'tipo', 'categoria', 'membro', 'observacoes'];

function escapeField(v) {
  const s = String(v ?? '');
  return /[";,\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function generateTransactionsCsv(transactions, categories, members) {
  const rows = (transactions || []).map(tx => {
    const cat = (categories || []).find(c => c.id === tx.categoryId);
    const mem = (members   || []).find(m => m.id === tx.memberId || m.id === tx.attributionProfileId);
    return [
      tx.id ?? '',
      tx.description ?? '',
      tx.amount ?? 0,
      tx.date ?? '',
      tx.type === 'income' ? 'Receita' : 'Despesa',
      cat?.name ?? '',
      mem?.name ?? mem?.displayName ?? '',
      tx.observations ?? tx.notes ?? '',
    ].map(escapeField).join(';');
  });

  return '﻿' + [HEADER.join(';'), ...rows].join('\r\n') + '\r\n';
}

export function downloadCsv(filename, csv) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
