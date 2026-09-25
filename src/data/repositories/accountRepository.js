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

/** Cria uma caixinha vinculada a uma conta corrente. */
export const createSavingsBox = (parentAccountId, name) =>
  http.post('/api/accounts/savings-boxes', { parentAccountId, name });

/** Renomeia uma caixinha. */
export const renameSavingsBox = (accountId, name) =>
  http.patch(`/api/accounts/savings-boxes/${accountId}`, { name });

/** Deposita um valor numa caixinha. */
export const depositToSavingsBox = (accountId, amount) =>
  http.post(`/api/accounts/savings-boxes/${accountId}/deposit`, { amount });

/** Resgata um valor de uma caixinha. */
export const withdrawFromSavingsBox = (accountId, amount) =>
  http.post(`/api/accounts/savings-boxes/${accountId}/withdraw`, { amount });
