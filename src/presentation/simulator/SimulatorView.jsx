import React, { useMemo, useState } from 'react';
import { useSimulator, HORIZONS } from '../../application/hooks/useSimulator';
import { localToday } from '../../core/utils/simulatorMath';
import Modal from '../shared/components/Modal';
import { HlEmpty } from '../health/widgets/HlParts';
import { composeScenario } from './logic/compose';
import WiTabs, { panelId, tabId } from './components/WiTabs';
import SummaryTiles from './components/SummaryTiles';
import MonthTab from './components/MonthTab';
import FlowTab from './components/FlowTab';
import SimulationsTab from './components/SimulationsTab';
import HowWeCalculate from './components/HowWeCalculate';
import SimulationForm from './components/SimulationForm';

const ID_BASE = 'wi';
const TABS = [
  { id: 'month', label: 'No mês' },
  { id: 'flow', label: 'Mês a mês' },
  { id: 'sims', label: 'Por simulação' },
];

const horizonLabel = (m) => `${m} ${m === 1 ? 'mês' : 'meses'}`;

const hasNoData = (result) =>
  result.assumptions.monthsWithData === 0
  && result.baseline.every((b) => !b.income && !b.committed && !b.variable);

export default function SimulatorView() {
  const {
    simulations, months, setMonths, result, loading, refetching, error, retry,
    addSimulation, editSimulation, removeSimulation, toggleSimulation, reset, limitReached,
  } = useSimulator();

  const [tab, setTab] = useState('month');
  const [form, setForm] = useState(null);           // null | { editing: sim|null }
  const [confirmClear, setConfirmClear] = useState(false);

  const enabledSims = useMemo(() => simulations.filter((s) => s.enabled), [simulations]);
  const impactById = useMemo(() => new Map((result?.impacts ?? []).map((i) => [i.id, i])), [result]);

  // Liga/desliga recompõe aqui, sem nova chamada à API.
  const composed = useMemo(() => (result ? composeScenario({
    baseline: result.baseline,
    impacts: result.impacts,
    openingBalance: result.openingBalance.amount,
    enabledIds: enabledSims.map((s) => s.id),
  }) : null), [result, enabledSims]);

  const monthLabels = result ? result.baseline.map((b) => b.label) : [];
  const defaultMonth = result?.referenceMonth ?? localToday().slice(0, 7);

  const openAdd = () => setForm({ editing: null });
  const handleSave = (data) => {
    if (form?.editing) editSimulation(form.editing.id, data);
    else addSimulation(data);
  };
  const doClear = () => { reset(); setConfirmClear(false); };

  const statusText = loading
    ? 'Calculando projeção…'
    : result ? 'Projeção atualizada.' : '';

  return (
    <div className="wi-root hl-root">
      <div className="page-header">
        <div>
          <h1 className="page-title">E se...?</h1>
          <p className="page-sub">
            Simule compras, rendas e gastos futuros sobre o seu saldo real, sem alterar nenhum lançamento.
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

      <p className="wi-sr" role="status" aria-live="polite">{statusText}</p>

      {error && (
        <div className="wi-error" role="alert">
          <span><span aria-hidden="true">✕ </span>{error}</span>
          <button type="button" className="btn btn-secondary" onClick={retry}>Tentar de novo</button>
        </div>
      )}

      {!result && !error && (
        <div className="hl-card"><HlEmpty>{loading ? 'Calculando projeção…' : 'Sem projeção para mostrar.'}</HlEmpty></div>
      )}
      {!result && error && (
        <div className="hl-card"><HlEmpty>Não foi possível carregar a projeção. Tente de novo.</HlEmpty></div>
      )}

      {result && composed && (
        <div className={`wi-body${refetching ? ' is-refetching' : ''}`} aria-busy={refetching}>
          {refetching && <p className="wi-updating" aria-hidden="true">Atualizando…</p>}

          <SummaryTiles opening={result.openingBalance} composed={composed} baselineMonths={result.baseline} />

          {hasNoData(result) && (
            <p className="wi-callout" role="status">
              <span aria-hidden="true">ℹ </span>
              Não há lançamentos nos últimos 3 meses nem no período: a base é zero e só as simulações movem o saldo.
            </p>
          )}

          <section className="hl-card wi-card">
            <WiTabs idBase={ID_BASE} tabs={TABS} value={tab} onChange={setTab} label="Visões da projeção" />
            <div role="tabpanel" id={panelId(ID_BASE, tab)} aria-labelledby={tabId(ID_BASE, tab)} className="wi-panel">
              {tab === 'month' && (
                <MonthTab baseline={result.baseline} composed={composed} enabledSims={enabledSims} impactById={impactById} />
              )}
              {tab === 'flow' && <FlowTab baseline={result.baseline} composed={composed} />}
              {tab === 'sims' && (
                <SimulationsTab
                  simulations={simulations} impactById={impactById} warnings={result.warnings} composed={composed}
                  labels={monthLabels} limitReached={limitReached}
                  onToggle={toggleSimulation} onEdit={(sim) => setForm({ editing: sim })}
                  onRemove={removeSimulation} onAdd={openAdd}
                />
              )}
            </div>
          </section>

          <HowWeCalculate opening={result.openingBalance} assumptions={result.assumptions} />
        </div>
      )}

      {form && (
        <SimulationForm
          initial={form.editing} defaultMonth={defaultMonth}
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
