/**
 * Leitura das simulações do "E se...?" que ficavam só no navegador, e os limites
 * e o saneador compartilhados com o formulário. A lista agora vive no servidor:
 * nada mais é gravado aqui, a leitura serve só para a importação única.
 *
 * O formato atual é `{ version: 2, simulations: [...] }`. O formato antigo
 * (`{ name, impacts: [{ id, description, amount, type, mode, startDate,
 * installmentCount }] }`, sem versão) é migrado na leitura. Qualquer forma
 * inválida é descartada, item a item, em vez de quebrar a tela.
 */

export const SIM_STORAGE_KEY = 'pb_simulator_scenario';
export const SIM_STORAGE_VERSION = 2;
export const MAX_SIMULATIONS = 50;
export const MAX_DESCRIPTION = 120;
export const MAX_INSTALLMENTS = 120;
export const MAX_MONTHLY_DURATION = 120;

const TYPES = ['Income', 'Expense'];
const MODES = ['Single', 'Installment', 'Monthly'];
const KINDS = ['PerInstallment', 'Total'];
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export const newSimulationId = () =>
  (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : `sim-${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isInt = (v) => typeof v === 'number' && Number.isInteger(v);

/**
 * Normaliza uma simulação no formato atual. Devolve null quando algum campo
 * obrigatório é inválido (o item é descartado).
 */
export function sanitizeSimulation(raw) {
  if (!isObj(raw)) return null;
  if (typeof raw.description !== 'string') return null;
  const description = raw.description.trim();
  if (!description || description.length > MAX_DESCRIPTION) return null;
  if (!TYPES.includes(raw.type) || !MODES.includes(raw.mode)) return null;
  if (typeof raw.startMonth !== 'string' || !MONTH_RE.test(raw.startMonth)) return null;
  if (typeof raw.amount !== 'number' || !Number.isFinite(raw.amount) || raw.amount <= 0) return null;

  let installments = null;
  let months = null;
  if (raw.mode === 'Installment') {
    if (!isInt(raw.installments) || raw.installments < 1 || raw.installments > MAX_INSTALLMENTS) return null;
    installments = raw.installments;
  }
  if (raw.mode === 'Monthly' && raw.months !== null && raw.months !== undefined) {
    if (!isInt(raw.months) || raw.months < 0 || raw.months > MAX_MONTHLY_DURATION) return null;
    months = raw.months === 0 ? null : raw.months;
  }

  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : newSimulationId(),
    enabled: raw.enabled !== false,
    description,
    type: raw.type,
    mode: raw.mode,
    startMonth: raw.startMonth,
    amount: raw.amount,
    amountKind: raw.mode === 'Installment' && KINDS.includes(raw.amountKind) ? raw.amountKind : 'PerInstallment',
    installments,
    months,
  };
}

/** Item do formato antigo: startDate (yyyy-MM-dd) vira startMonth, installmentCount vira installments. */
function migrateLegacyImpact(raw) {
  if (!isObj(raw)) return null;
  if (raw.mode !== 'Single' && raw.mode !== 'Installment') return null;
  if (typeof raw.startDate !== 'string') return null;
  return sanitizeSimulation({
    id: raw.id,
    enabled: true,
    description: raw.description,
    type: raw.type,
    mode: raw.mode,
    startMonth: raw.startDate.slice(0, 7),
    amount: raw.amount,
    amountKind: 'PerInstallment',
    installments: raw.mode === 'Installment' ? Number(raw.installmentCount) : null,
    months: null,
  });
}

function dedupe(list) {
  const seen = new Set();
  const out = [];
  for (const s of list) {
    if (!s) continue;
    const item = seen.has(s.id) ? { ...s, id: newSimulationId() } : s;
    seen.add(item.id);
    out.push(item);
    if (out.length >= MAX_SIMULATIONS) break;
  }
  return out;
}

/** Converte o valor guardado (qualquer formato) em uma lista válida de simulações. */
export function migrateStored(raw) {
  if (!isObj(raw)) return [];
  if (raw.version === SIM_STORAGE_VERSION) {
    return Array.isArray(raw.simulations) ? dedupe(raw.simulations.map(sanitizeSimulation)) : [];
  }
  if (raw.version === undefined && Array.isArray(raw.impacts)) {
    return dedupe(raw.impacts.map(migrateLegacyImpact));
  }
  return [];
}

export function loadSimulations() {
  try {
    const text = localStorage.getItem(SIM_STORAGE_KEY);
    return text ? migrateStored(JSON.parse(text)) : [];
  } catch {
    return [];
  }
}
