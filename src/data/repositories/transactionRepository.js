import { http } from '../http/client';
import { STATUS_TO_API } from '../../application/mappers/index';

export const listTransactions  = (month, year) =>
  month && year
    ? http.get(`/api/transactions/month/${month}/year/${year}`)
    : http.get('/api/transactions');

export const createTransaction = (body)       => http.post('/api/transactions', body);
export const updateTransaction = (id, body)   => http.patch(`/api/transactions/${id}`, body);
export const updateRecurringTransaction = (id, body) => http.patch(`/api/transactions/${id}/recurring`, body);
export const deleteTransaction = (id)         => http.delete(`/api/transactions/${id}`);

/** @param {'pending'|'paid'|'cancelled'} uiStatus */
export async function patchTransactionStatus(id, uiStatus) {
  const status = STATUS_TO_API[uiStatus];
  if (status == null) throw new Error('Status inválido.');
  const { message } = await http.patchEnvelope(`/api/transactions/${id}/status`, { status });
  return message.trim() || 'Status atualizado.';
}

export const batchDelete = (ids) => http.delete('/api/transactions/batch', { transactionIds: ids });
