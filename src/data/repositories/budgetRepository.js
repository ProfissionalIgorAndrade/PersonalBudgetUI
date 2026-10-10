import { http } from '../http/client';

export const listBudgets  = (month, year) => http.get(`/api/budgets?month=${month}&year=${year}`);
export const upsertBudget = (body)        => http.post('/api/budgets', body);
export const deleteBudget = (id)          => http.delete(`/api/budgets/${id}`);
