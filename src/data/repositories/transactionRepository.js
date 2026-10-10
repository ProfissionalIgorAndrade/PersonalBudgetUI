import { http } from '../http/client';

export const listTransactions  = (month, year) =>
  month && year
    ? http.get(`/api/transactions/month/${month}/year/${year}`)
    : http.get('/api/transactions');

export const createTransaction = (body)       => http.post('/api/transactions', body);
export const updateTransaction = (id, body)   => http.patch(`/api/transactions/${id}`, body);
export const updateRecurringTransaction = (id, body) => http.patch(`/api/transactions/${id}/recurring`, body);
export const updateInstallmentStatement = (id, body) => http.patch(`/api/transactions/${id}/installment-statement`, body);
export const setReviewed       = (id, reviewed) => http.patch(`/api/transactions/${id}/reviewed`, { reviewed });
export const deleteTransaction = (id)         => http.delete(`/api/transactions/${id}`);

/** @param {1|2|3} recurrenceDeleteMode */
export async function deleteRecurringTransaction(id, recurrenceDeleteMode) {
  const { data, message } = await http.deleteEnvelope(`/api/transactions/${id}/recurring`, { recurrenceDeleteMode });
  return { ...data, message };
}

export const batchDelete = (ids) => http.delete('/api/transactions/batch', { transactionIds: ids });

export const importTransactions = (body) => http.post('/api/transactions/import', body);
