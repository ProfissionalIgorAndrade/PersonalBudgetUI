import { http } from './client';

export const listTransactions  = (month, year) =>
  month && year
    ? http.get(`/api/transactions/month/${month}/year/${year}`)
    : http.get('/api/transactions');

export const createTransaction = (body)        => http.post('/api/transactions', body);
export const updateTransaction = (id, body)    => http.patch(`/api/transactions/${id}`, body);
export const deleteTransaction = (id)          => http.delete(`/api/transactions/${id}`);
export const updateStatus      = (id, status)  => http.patch(`/api/transactions/${id}/status`, { status });
export const batchDelete       = (ids)         => http.delete('/api/transactions/batch', { transactionIds: ids });
