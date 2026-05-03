import { http } from '../http/client';

export const listCards      = ()         => http.get('/api/credit-cards');
export const createCard     = (body)     => http.post('/api/credit-cards', body);
export const updateCard     = (id, body) => http.put(`/api/credit-cards/${id}`, body);
export const deleteCard     = (id)       => http.delete(`/api/credit-cards/${id}`);
/** Statement for month/year (+ optional pagination page). Payload may include nested transactions. */
export const getStatement = (creditCardId, month, year, page) => {
  const p = new URLSearchParams({
    month: String(month),
    year: String(year),
  });
  if (page != null && page !== '') p.set('page', String(page));
  return http.get(`/api/credit-cards/${encodeURIComponent(creditCardId)}/statement?${p}`);
};
export const closeStatement = (cid, sid) => http.post(`/api/credit-cards/${cid}/statements/${sid}/close`, {});
export const payStatement   = (cid, sid) => http.post(`/api/credit-cards/${cid}/statements/${sid}/pay`, {});
