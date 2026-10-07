import { http } from '../http/client';

/** Simulações do "E se...?" compartilhadas pelo lar (o lar vai no X-Household-Id). */
export const listSimulations  = ()         => http.get('/api/simulations');
export const createSimulation = (body)     => http.post('/api/simulations', body);
export const updateSimulation = (id, body) => http.put(`/api/simulations/${id}`, body);
export const deleteSimulation = (id)       => http.delete(`/api/simulations/${id}`);
export const deleteMySimulations = ()      => http.delete('/api/simulations/mine');
export const importSimulations   = (simulations) => http.post('/api/simulations/import', { simulations });
