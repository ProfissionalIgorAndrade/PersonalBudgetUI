import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  listSimulations, createSimulation, updateSimulation, deleteSimulation,
  deleteMySimulations, importSimulations,
} from '../../data/repositories/simulationRepository';
import { getHouseholdId } from '../../data/http/client';
import {
  loadSimulations, sanitizeSimulation, MAX_SIMULATIONS,
} from '../../core/utils/simulatorStorage';
import {
  loadEnabledMap, saveEnabledMap, mergeEnabled, pruneEnabled, toggleEnabled,
  buildImportPayload, isImportDecided, markImported, clearLegacySimulations,
  simulationErrorMessage,
} from '../../core/utils/simulatorShared';
import { round2 } from '../../core/utils/simulatorMath';

export const HORIZONS = [1, 3, 6, 12, 24];
export const DEFAULT_HORIZON = 6;

const INVALID_MESSAGE = 'Confira os dados da simulação.';

/** Formato do corpo da API a partir dos campos do formulário. */
const normalize = (data) => ({
  description: data.description.trim(),
  type: data.type,
  mode: data.mode,
  startMonth: data.startMonth,
  amount: round2(data.amount),
  amountKind: data.mode === 'Installment' ? data.amountKind : 'PerInstallment',
  installments: data.mode === 'Installment' ? Number(data.installments) : null,
  months: data.mode === 'Monthly' && data.months ? Number(data.months) : null,
});

/** Mesmos limites do servidor, checados antes de enviar. */
const isValidBody = (body) => sanitizeSimulation({ ...body, id: 'x' }) !== null;

/**
 * Estado do "E se...?" compartilhado pela família.
 *
 * A lista vem do servidor (todas as simulações do lar). Só sai a primeira
 * requisição quando já há sessão (`userId`) e lar ativo (`pb_household_id`),
 * senão iria sem `X-Household-Id`. Até lá `loading` fica ligado, para a tela
 * não mostrar um falso "Nenhuma simulação". Toda escrita é seguida de uma nova
 * leitura, e a lista também recarrega quando a aba volta a ficar visível.
 *
 * O liga/desliga é local e por usuário (nunca vai ao servidor) e é mesclado
 * em `simulations[].enabled`, então compose/schedule/cartões seguem lendo `sim.enabled`.
 *
 * Importação única: simulações antigas do navegador (`pb_simulator_scenario`)
 * são oferecidas a quem ainda não decidiu. Limitação: essa chave é global ao
 * navegador, então antes de alguém enviá-las qualquer usuário que ainda não
 * decidiu recebe a oferta; depois de um envio bem-sucedido a cópia é apagada.
 */
export function useSimulator({ userId } = {}) {
  const householdId = getHouseholdId();   // relido a cada render: App grava o lar depois de montar a tela
  const ready = Boolean(userId && householdId);

  const [raw, setRaw] = useState(null);                 // null = ainda não carregou
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState('');
  const [months, setMonths] = useState(DEFAULT_HORIZON);
  const [enabledMap, setEnabledMap] = useState(() => loadEnabledMap(userId));
  const [legacy, setLegacy] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');

  const seq = useRef(0);
  const rawRef = useRef(null);
  rawRef.current = raw;

  /** Lê a lista. `silent` não liga `loading` nem derruba a lista atual em caso de falha. */
  const fetchList = useCallback(async ({ silent = false } = {}) => {
    const mine = ++seq.current;
    if (!silent) { setLoading(true); setError(''); }
    try {
      const list = await listSimulations();
      if (mine !== seq.current) return true;
      setRaw(Array.isArray(list) ? list : []);
      setError('');
      return true;
    } catch (e) {
      if (mine !== seq.current) return false;
      if (!silent || rawRef.current === null) setError(simulationErrorMessage(e, 'Não foi possível carregar as simulações.'));
      return false;
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  }, []);

  // Troca de usuário ou de lar: zera e recarrega só quando os dois existem.
  useEffect(() => {
    seq.current += 1;
    setRaw(null);
    setError('');
    setActionError('');
    setLoading(true);
    if (!ready) return;
    fetchList();
  }, [ready, userId, householdId, fetchList]);

  // Voltar para a aba traz o que as outras pessoas mudaram.
  useEffect(() => {
    if (!ready) return undefined;
    const onVisible = () => { if (document.visibilityState === 'visible') fetchList({ silent: true }); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [ready, fetchList]);

  // Mapa de ligadas do usuário e oferta de importação, por usuário.
  useEffect(() => {
    setEnabledMap(loadEnabledMap(userId));
    setImportError('');
    setLegacy(userId && !isImportDecided(userId) ? loadSimulations() : []);
  }, [userId]);

  // Ids que sumiram do servidor saem do mapa.
  useEffect(() => {
    if (raw === null) return;
    setEnabledMap((map) => {
      const next = pruneEnabled(map, raw);
      if (next !== map) saveEnabledMap(userId, next);
      return next;
    });
  }, [raw, userId]);

  const simulations = useMemo(() => mergeEnabled(raw ?? [], enabledMap), [raw, enabledMap]);
  const ownedCount = useMemo(() => simulations.filter((s) => s.isOwner).length, [simulations]);
  const limitReached = ownedCount >= MAX_SIMULATIONS;

  /** Escreve e recarrega. Devolve true no sucesso; o erro vai para `actionError`. */
  const write = useCallback(async (fn) => {
    setSaving(true);
    setActionError('');
    try {
      await fn();
    } catch (e) {
      setActionError(simulationErrorMessage(e));
      if (e?.status === 403) await fetchList({ silent: true });   // as permissões mudaram: atualiza os cartões
      setSaving(false);
      return false;
    }
    const refreshed = await fetchList({ silent: true });
    if (!refreshed) setActionError('Salvo, mas não foi possível atualizar a lista. Tente recarregar.');
    setSaving(false);
    return true;
  }, [fetchList]);

  const addSimulation = useCallback(async (data) => {
    if (limitReached) return false;
    const body = normalize(data);
    if (!isValidBody(body)) { setActionError(INVALID_MESSAGE); return false; }
    return write(() => createSimulation(body));
  }, [limitReached, write]);

  const editSimulation = useCallback(async (id, data) => {
    const body = normalize(data);
    if (!isValidBody(body)) { setActionError(INVALID_MESSAGE); return false; }
    return write(() => updateSimulation(id, body));
  }, [write]);

  const removeSimulation = useCallback((id) => write(() => deleteSimulation(id)), [write]);
  const removeMine = useCallback(() => write(() => deleteMySimulations()), [write]);

  /** Só local: não faz requisição. */
  const toggleSimulation = useCallback((id) => {
    setEnabledMap((map) => {
      const next = toggleEnabled(map, id);
      saveEnabledMap(userId, next);
      return next;
    });
  }, [userId]);

  const retry = useCallback(() => { if (ready) fetchList(); }, [ready, fetchList]);
  const dismissActionError = useCallback(() => setActionError(''), []);

  /** "Agora não": some até a próxima visita. Nada é gravado. */
  const dismissImport = useCallback(() => { setLegacy([]); setImportError(''); }, []);

  const importLegacy = useCallback(async () => {
    if (legacy.length === 0) return false;
    if (ownedCount + legacy.length > MAX_SIMULATIONS) {
      setImportError(`Você pode ter no máximo ${MAX_SIMULATIONS} simulações. Remova algumas antes de enviar estas.`);
      return false;
    }
    setImporting(true);
    setImportError('');
    try {
      await importSimulations(buildImportPayload(legacy));
    } catch (e) {
      setImportError(simulationErrorMessage(e));
      setImporting(false);
      return false;
    }
    markImported(userId);
    clearLegacySimulations();
    setLegacy([]);
    const refreshed = await fetchList({ silent: true });
    if (!refreshed) setActionError('Enviadas, mas não foi possível atualizar a lista. Tente recarregar.');
    setImporting(false);
    return true;
  }, [legacy, ownedCount, userId, fetchList]);

  return {
    simulations,
    months,
    setMonths,
    loading,
    error,
    retry,
    saving,
    actionError,
    dismissActionError,
    addSimulation,
    editSimulation,
    removeSimulation,
    removeMine,
    toggleSimulation,
    limitReached,
    ownedCount,
    legacyCount: legacy.length,
    importing,
    importError,
    importLegacy,
    dismissImport,
  };
}
