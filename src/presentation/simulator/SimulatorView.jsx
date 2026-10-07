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

/**
 * "E se...?": a base de cada mês é a do Dashboard (lançamentos já carregados,
 * calculados no cliente) e as simulações somam por cima. Sem chamada de rede.
 * O primeiro mês do horizonte é o mês atual (data local).
 */
export default function SimulatorView({ transactions = NO_TRANSACTIONS }) {
  const {
    simulations, months, setMonths,
    addSimulation, editSimulation, removeSimulation, toggleSimulation, reset, limitReached,
  } = useSimulator();

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

  const openAdd = () => setForm({ editing: null });
  const handleSave = (data) => {
    if (form?.editing) editSimulation(form.editing.id, data);
    else addSimulation(data);
  };
  const doClear = () => { reset(); setConfirmClear(false); };

  return (
    <div className="wi-root hl-root">
      <div className="page-header">
        <div>
          <h1 className="page-title">E se...?</h1>
          <p className="page-sub">
            Veja, mês a mês, se o caixa fecha no verde ao assumir uma compra, renda ou gasto novo. Nenhum lançamento é alterado.
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
          <button type="button" className="btn btn-primary" onClick={openAdd} disabled={limitReached}>+ Nova simulação</button>
          <button type="button" className="btn btn-secondary" onClick={() => setConfirmClear(true)} disabled={simulations.length === 0}>
            Limpar
          </button>
        </div>
      </div>

      <div className="wi-body">
        <VerdictBanner verdict={verdict} />

        <HlCard id="wi-sims" title="Simulações" subtitle="Ligue e desligue para ver o efeito em cada mês.">
          <SimulationStrip
            infos={infos} scheduleById={scheduleById} warnings={warnings} limitReached={limitReached}
            onToggle={toggleSimulation} onEdit={(sim) => setForm({ editing: sim })}
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

      {form && (
        <SimulationForm
          initial={form.editing} defaultMonth={firstMonth}
          onSave={handleSave} onClose={() => setForm(null)}
        />
      )}

      {confirmClear && (
        <Modal title="Limpar simulações?" onClose={() => setConfirmClear(false)}>
          <p className="wi-confirm-text">
            Isso apaga as {simulations.length} {simulations.length === 1 ? 'simulação salva' : 'simulações salvas'} neste
            navegador. Os seus lançamentos reais não são afetados.
          </p>
          <div className="wi-form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setConfirmClear(false)}>Cancelar</button>
            <button type="button" className="btn btn-danger" onClick={doClear}>Limpar tudo</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
