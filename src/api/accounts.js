import { http } from './client';

export const listAccounts   = ()          => http.get('/api/accounts');
export const createAccount  = (body)      => http.post('/api/accounts', body);
export const updateAccount  = (id, body)  => http.put(`/api/accounts/${id}`, body);
export const deleteAccount  = (id)        => http.delete(`/api/accounts/${id}`);
