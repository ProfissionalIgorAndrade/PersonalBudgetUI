import { http } from '../http/client';

export const listAccounts  = ()         => http.get('/api/accounts');
export const createAccount = (body)     => http.post('/api/accounts', body);
export const updateAccount = (id, body) => http.put(`/api/accounts/${id}`, body);
export const deleteAccount = (id)       => http.delete(`/api/accounts/${id}`);

/**
 * Bank/account movements for a month (excludes credit-card payment method).
 * GET /api/accounts/{accountId}/transactions?month=&year=&page=&frequency=
 */
export function listAccountTransactions(accountId, { month, year, page, frequency } = {}) {
  const params = new URLSearchParams();
  params.set('month', String(month));
  params.set('year', String(year));
  if (page != null && page !== '') params.set('page', String(page));
  if (frequency != null && frequency !== '') params.set('frequency', String(frequency));
  const q = params.toString();
  return http.get(`/api/accounts/${encodeURIComponent(accountId)}/transactions?${q}`);
}
