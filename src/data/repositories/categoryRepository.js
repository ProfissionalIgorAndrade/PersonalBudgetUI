import { http } from '../http/client';

export const listCategories  = ()         => http.get('/api/categories');
export const createCategory  = (body)     => http.post('/api/categories', body);
export const updateCategory  = (id, body) => http.put(`/api/categories/${id}`, body);
export const deleteCategory  = (id)       => http.delete(`/api/categories/${id}`);
