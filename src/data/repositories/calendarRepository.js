import { http } from '../http/client';

/**
 * Busca o calendário financeiro para o intervalo [from, to].
 * @param {string} from  Data ISO: "YYYY-MM-DD"
 * @param {string} to    Data ISO: "YYYY-MM-DD"
 */
export const getFinancialCalendar = (from, to) =>
  http.get(`/api/financial-calendar?from=${from}&to=${to}`);
