import { http } from '../http/client';

export const calculateScenario = (scenario, months = 6) =>
  http.post(`/api/simulator/calculate?months=${months}`, scenario);

/**
 * Projeção mês a mês do cenário. O corpo carrega todas as simulações (ligadas
 * ou não): o liga/desliga é composto no cliente, sem nova chamada.
 */
export const projectScenario = (body) => http.post('/api/simulator/projection', body);
