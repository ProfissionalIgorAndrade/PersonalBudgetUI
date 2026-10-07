import React, { useMemo, useState } from 'react';
import { useSimulator, HORIZONS } from '../../application/hooks/useSimulator';
import { localToday } from '../../core/utils/simulatorMath';
import Modal from '../shared/components/Modal';
import { HlCard, HlEmpty, HlToggle } from '../health/widgets/HlParts';
import { composeMonthly, buildVerdict, assignSimColors } from './logic/compose';
import { buildMonthlyBaseline } from './logic/baseline';
import { buildSchedules } from './logic/schedule';
import { simulationName } from './logic/labels';
import VerdictBanner from './components/VerdictBanner';
import SimulationStrip from './components/SimulationStrip';
import MonthlyChart from './components/MonthlyChart';
import MonthlyTable from './components/MonthlyTable';
import HowWeCalculate from './components/HowWeCalculate';
import SimulationForm from './components/SimulationForm';

const horizonLabel = (m) => `${m} ${m === 1 ? 'mês' : 'meses'}`;
const NO_TRANSACTIONS = [];
const NO_MEMBERS = [];

/**
 * "E se...?": a base de cada mês é a do Dashboard (lançamentos já carregados,
 * calculados no cliente) e as simulações da família, vindas do servidor, somam
 * por cima. Só as simulações usam a rede; o cálculo é no cliente.
 * O primeiro mês do horizonte é o mês atual (data local).
 */
export default function SimulatorView({ transactions = NO_TRANSACTIONS, members = NO_MEMBERS, authSession = null }) {
  const {
    simulations, months, setMonths, loading, error, retry, saving, actionError, dismissActionError,
    addSimulation, editSimulation, removeSimulation, removeMine, toggleSimulation, limitReached, ownedCount,
    legacyCount, importing, importError, importLegacy, dismissImport,
  } = useSimulator({ userId: authSession?.userId });

  const [mode, setMode] = useState('chart');     // 'chart' | 'table'
  const [form, setForm] = useState(null);           // null | { editing: sim|null }
  const [confirmClear, setConfirmClear] = useState(false);

  const firstMonth = useMemo(() => localToday().slice(0, 7), []);

  // A base só depende dos lançamentos e do horizonte: ligar/desligar não a refaz.
  const baseline = useMemo(
    () => buildMonthlyBaseline(transactions, firstMonth, months),
    [transactions, firstMonth, months],
  );
  const schedules = useMemo(
    () => buildSchedules(simulations, firstMonth, months),
    [simulations, firstMonth, months],
  );
  const scheduleById = useMemo(() => new Map(schedules.map((s) => [s.id, s])), [schedules]);
  const warnings = useMemo(() => schedules.flatMap((s) => s.warnings), [schedules]);

  const enabledIds = useMemo(() => simulations.filter((s) => s.enabled).map((s) => s.id), [simulations]);

  // Nome e cor de cada cartão, pela posição na lista completa (liga/desliga não muda).
  const infos = useMemo(() => {
    const colors = assignSimColors(simulations);
    return simulations.map((sim, i) => ({ sim, name: simulationName(sim, i), slot: colors[sim.id] }));
  }, [simulations]);

  const composed = useMemo(
    () => composeMonthly({ baseline, schedules, enabledIds }),
    [baseline, schedules, enabledIds],
  );
  const verdict = useMemo(() => buildVerdict({ composed }), [composed]);
  const noFlow = composed.countedCount === 0;

  const openForm = (editing) => { dismissActionError(); setForm({ editing }); };
  const openAdd = () => openForm(null);
  // O formulário só fecha quando a gravação deu certo (a promessa resolve com false se falhou).
  const handleSave = (data) => (form?.editing ? editSimulation(form.editing.id, data) : addSimulation(data));
  const doRemoveMine = async () => { setConfirmClear(false); await removeMine(); };

  const blocked = loading || Boolean(error);

  return (
    <div className="wi-root hl-root">
      <div className="page-header">
        <div>
          <h1 className="page-title">E se...?</h1>
          <p className="page-sub">
            Veja, mês a mês, se o caixa fecha no verde ao assumir uma compra, renda ou gasto novo. Nenhum lançamento é alterado.
            {' '}As simulações são compartilhadas com a família.
          </p>
        </div>
        <div className="wi-header-actions">
          <div className="seg" role="group" aria-label="Horizonte da projeção">
            {HORIZONS.map((m) => (
              <button key={m} type="button" aria-pressed={months === m} onClick={() => setMonths(m)}>
                {horizonLabel(m)}
              </button>
            ))}
          </div>
          <button type="button" className="btn btn-primary" onClick={openAdd} disabled={limitReached || blocked || saving}>+ Nova simulação</button>
          <button type="button" className="btn btn-secondary" onClick={() => setConfirmClear(true)} disabled={ownedCount === 0 || saving}>
            Remover minhas simulações
          </button>
        </div>
      </div>

      {loading && <p className="wi-state" role="status">Carregando simulações...</p>}
      {!loading && error && (
        <div className="wi-state wi-state-error" role="alert">
          <p>{error}</p>
          <button type="button" className="btn btn-secondary" onClick={retry}>Tentar de novo</button>
        </div>
      )}

      {!blocked && (
      <div className="wi-body">
        {actionError && !form && (
          <div className="wi-state wi-state-error" role="alert">
            <p>{actionError}</p>
            <button type="button" className="btn btn-secondary" onClick={dismissActionError}>Fechar</button>
          </div>
        )}
        <VerdictBanner verdict={verdict} />

        <HlCard id="wi-sims" title="Simulações" subtitle="Ligue e desligue para ver o efeito em cada mês.">
          <SimulationStrip
            infos={infos} scheduleById={scheduleById} warnings={warnings} limitReached={limitReached}
            members={members} saving={saving}
            onToggle={toggleSimulation} onEdit={openForm}
            onRemove={removeSimulation} onAdd={openAdd}
          />
        </HlCard>

        <HlCard
          id="wi-monthly" title="Mês a mês" subtitle="Cada mês sozinho, sem acumular saldo."
          actions={noFlow ? null : <HlToggle value={mode} onChange={setMode} label="Mês a mês: exibição" />}
        >
          {noFlow ? (
            <HlEmpty>Nenhum mês do período tem lançamentos, não há mês para comparar.</HlEmpty>
          ) : mode === 'chart' ? (
            <MonthlyChart composed={composed} infos={infos} />
          ) : (
            <MonthlyTable composed={composed} infos={infos} />
          )}
        </HlCard>

        <HowWeCalculate />
      </div>
      )}

      {form && (
        <SimulationForm
          initial={form.editing} defaultMonth={firstMonth}
          onSave={handleSave} onClose={() => setForm(null)} error={actionError}
        />
      )}

      {confirmClear && (
        <Modal title="Remover minhas simulações?" onClose={() => setConfirmClear(false)}>
          <p className="wi-confirm-text">
            Isso apaga {ownedCount === 1 ? 'a 1 simulação que você criou' : `as ${ownedCount} simulações que você criou`}.
            As simulações dos outros membros da família continuam como estão. Os seus lançamentos reais não são afetados.
          </p>
          <div className="wi-form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setConfirmClear(false)}>Cancelar</button>
            <button type="button" className="btn btn-danger" onClick={doRemoveMine}>Remover minhas simulações</button>
          </div>
        </Modal>
      )}

      {legacyCount > 0 && !blocked && (
        <Modal title="Enviar simulações salvas?" onClose={importing ? () => {} : dismissImport}>
          <p className="wi-confirm-text">
            Encontramos {legacyCount} {legacyCount === 1 ? 'simulação salva' : 'simulações salvas'} neste navegador.
            Enviar para a família?
          </p>
          {importError && <p className="wi-field-error" role="alert">{importError}</p>}
          <div className="wi-form-actions">
            <button type="button" className="btn btn-secondary" onClick={dismissImport} disabled={importing}>Agora não</button>
            <button type="button" className="btn btn-primary" onClick={importLegacy} disabled={importing}>
              {importing ? 'Enviando...' : 'Enviar'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
