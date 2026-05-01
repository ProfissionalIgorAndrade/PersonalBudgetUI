import { http } from '../http/client';

export const listCards      = ()         => http.get('/api/credit-cards');
export const createCard     = (body)     => http.post('/api/credit-cards', body);
export const updateCard     = (id, body) => http.put(`/api/credit-cards/${id}`, body);
export const deleteCard     = (id)       => http.delete(`/api/credit-cards/${id}`);
export const getStatement   = (id, m, y) => http.get(`/api/credit-cards/${id}/statement?month=${m}&year=${y}`);
export const closeStatement = (cid, sid) => http.post(`/api/credit-cards/${cid}/statements/${sid}/close`, {});
export const payStatement   = (cid, sid) => http.post(`/api/credit-cards/${cid}/statements/${sid}/pay`, {});
