/**
 * Formato único do CSV de fatura: o arquivo exportado é o mesmo que a
 * importação lê, e o modelo para download é esse formato com id_sistema vazio.
 */

/** Colunas na ordem em que aparecem no arquivo. */
export const CSV_COLUMNS = [
  'id_sistema',
  'descricao',
  'valor',
  'data',
  'tipo',
  'categoria',
  'membro',
  'observacoes',
];

/** Ponto e vírgula, porque é o que o Excel em português abre em colunas. */
export const CSV_SEPARATOR = ';';

export const TYPE_LABEL = { expense: 'Despesa', income: 'Estorno' };

export function escapeField(v) {
  const s = String(v ?? '');
  return /[";,\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Valor sempre positivo, com vírgula decimal; quem diz o sinal é a coluna tipo. */
export function formatAmount(v) {
  const n = Math.abs(Number(v));
  return (Number.isFinite(n) ? n : 0).toFixed(2).replace('.', ',');
}

/**
 * Monta o arquivo a partir de linhas já na ordem de CSV_COLUMNS. Vai com BOM
 * para o Excel abrir a acentuação corretamente.
 */
export function buildCsv(rows) {
  const lines = [CSV_COLUMNS, ...rows].map(r => r.map(escapeField).join(CSV_SEPARATOR));
  return '﻿' + lines.join('\r\n') + '\r\n';
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
