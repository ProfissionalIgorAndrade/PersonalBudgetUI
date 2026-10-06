import { http } from '../http/client';

/**
 * Projeção mês a mês do cenário. O corpo carrega todas as simulações (ligadas
 * ou não): o liga/desliga é composto no cliente, sem nova chamada.
 */
export const projectScenario = (body) => http.post('/api/simulator/projection', body);
