/**
 * Apoio do "E se...?" compartilhado: o que continua só no navegador de cada
 * usuário (liga/desliga e a decisão da importação) e funções puras.
 *
 * O liga/desliga é pessoal: `{ [simulationId]: boolean }` em chave própria por
 * usuário, padrão ligado, e nunca vai para o servidor.
 */
import { SIM_STORAGE_KEY } from './simulatorStorage';

export const enabledKey  = (userId) => `pb_simulator_enabled:${userId}`;
export const importedKey = (userId) => `pb_simulator_imported:${userId}`;

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** Lê o mapa de ligadas do usuário; qualquer valor inválido vira mapa vazio. */
export function loadEnabledMap(userId) {
  if (!userId) return {};
  try {
    const parsed = JSON.parse(localStorage.getItem(enabledKey(userId)) || 'null');
    if (!isObj(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter(([, v]) => typeof v === 'boolean'));
  } catch {
    return {};
  }
}

export function saveEnabledMap(userId, map) {
  if (!userId) return;
  try { localStorage.setItem(enabledKey(userId), JSON.stringify(map)); }
  catch { /* quota ou modo privado: vale só nesta sessão */ }
}

/** Padrão ligado: só `false` explícito desliga. */
export const isEnabled = (map, id) => map[id] !== false;

/** Junta o liga/desliga local à lista do servidor (inclusive as de outras pessoas). */
export const mergeEnabled = (list, map) => list.map((s) => ({ ...s, enabled: isEnabled(map, s.id) }));

/** Remove do mapa os ids que não existem mais. Devolve o mesmo objeto se nada mudou. */
export function pruneEnabled(map, list) {
  const ids = new Set(list.map((s) => s.id));
  const keys = Object.keys(map);
  if (keys.every((k) => ids.has(k))) return map;
  return Object.fromEntries(keys.filter((k) => ids.has(k)).map((k) => [k, map[k]]));
}

export const toggleEnabled = (map, id) => ({ ...map, [id]: !isEnabled(map, id) });

/** Corpo do POST /import: simulações saneadas, sem `id` nem `enabled`. */
export const buildImportPayload = (sims) => sims.map(({
  description, type, mode, startMonth, amount, amountKind, installments, months,
}) => ({ description, type, mode, startMonth, amount, amountKind, installments, months }));

/** A pessoa já decidiu (enviou) a importação das simulações antigas deste navegador? */
export function isImportDecided(userId) {
  if (!userId) return true;
  try { return localStorage.getItem(importedKey(userId)) === '1'; }
  catch { return true; }
}

export function markImported(userId) {
  try { localStorage.setItem(importedKey(userId), '1'); } catch { /* sem armazenamento */ }
}

/** Apaga a cópia antiga (chave global do navegador). Chamar só depois de enviar com sucesso. */
export function clearLegacySimulations() {
  try { localStorage.removeItem(SIM_STORAGE_KEY); } catch { /* sem armazenamento */ }
}

/** Mensagem da tela para um erro da API. 403 = não é o dono; 400 traz a mensagem do servidor. */
export function simulationErrorMessage(e, fallback = 'Não foi possível concluir. Tente novamente.') {
  if (e?.status === 403) return 'Só quem criou a simulação pode alterá-la ou removê-la.';
  if (e?.status === 400) return e.message || e.apiMessage || fallback;
  return e?.message || fallback;
}
