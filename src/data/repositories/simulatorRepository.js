import { http } from '../http/client';

export const calculateScenario = (scenario, months = 6) =>
  http.post(`/api/simulator/calculate?months=${months}`, scenario);
