import React, { useMemo, useState } from 'react';
import { useSimulator, HORIZONS } from '../../application/hooks/useSimulator';
import { localToday } from '../../core/utils/simulatorMath';
import Modal from '../shared/components/Modal';
import { HlCard, HlEmpty, HlToggle } from '../health/widgets/HlParts';
import { composeMonthly, buildVerdict, assignSimColors } from './logic/compose';
import { simulationName } from './logic/labels';
import VerdictBanner from './components/VerdictBanner';
import SimulationStrip from './components/SimulationStrip';
import MonthlyChart from './components/MonthlyChart';
import MonthlyTable from './components/MonthlyTable';
import HowWeCalculate from './components/HowWeCalculate';
import SimulationForm from './components/SimulationForm';

const horizonLabel = (m) => `${m} ${m === 1 ? 'mês' : 'meses'}`;

export default function SimulatorView() {
  const {
    simulations, months, setMonths, result, loading, refetching, error, retry,
    addSimulation, editSimulation, removeSimulation, toggleSimulation, reset, limitReached,
  } = useSimulator();

  const [mode, setMode] = useState('chart');     // 'chart' | 'table'
  const [form, setForm] = useState(null);           // null | { editing: sim|null }
  const [confirmClear, setConfirmClear] = useState(false);

  const enabledIds = useMemo(() => simulations.filter((s) => s.enabled).map((s) => s.id), [simulations]);
  const impactById = useMemo(() => new Map((result?.impacts ?? []).map((i) => [i.id, i])), [result]);

  // Nome e cor de cada cartão, pela posição na lista completa (liga/desliga não muda).
  const infos = useMemo(() => {
    const colors = assignSimColors(simulations);
    return simulations.map((sim, i) => ({ sim, name: simulationName(sim, i), slot: colors[sim.id] }));
  }, [simulations]);

  // Liga/desliga recompõe aqui, sem nova chamada à API.
  const composed = useMemo(() => (result ? composeMonthly({
    baseline: result.baseline,
    impacts: result.impacts,
    enabledIds,
  }) : null), [result, enabledIds]);

  const hasHistory = (result?.assumptions.monthsWithData ?? 0) > 0;
  const verdict = useMemo(() => (composed ? buildVerdict({
    composed, hasHistory, lookbackMonths: result.assumptions.lookbackMonths,
  }) : null), [composed, hasHistory, result]);
  const noFlow = composed && !hasHistory && composed.months.every((m) => !m.income && !m.expense);

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

      {result && composed && verdict && (
        <div className={`wi-body${refetching ? ' is-refetching' : ''}`} aria-busy={refetching}>
          {refetching && <p className="wi-updating" aria-hidden="true">Atualizando…</p>}

          <VerdictBanner verdict={verdict} />

          <HlCard id="wi-sims" title="Simulações" subtitle="Ligue e desligue para ver o efeito em cada mês, sem refazer a conta no servidor.">
            <SimulationStrip
              infos={infos} impactById={impactById} warnings={result.warnings ?? []} limitReached={limitReached}
              onToggle={toggleSimulation} onEdit={(sim) => setForm({ editing: sim })}
              onRemove={removeSimulation} onAdd={openAdd}
            />
          </HlCard>

          <HlCard
            id="wi-monthly" title="Mês a mês" subtitle="Cada mês sozinho, sem acumular saldo."
            actions={noFlow ? null : <HlToggle value={mode} onChange={setMode} label="Mês a mês: exibição" />}
          >
            {noFlow ? (
              <HlEmpty>Sem histórico para estimar receita e despesa, não há mês para comparar.</HlEmpty>
            ) : mode === 'chart' ? (
              <MonthlyChart composed={composed} infos={infos} />
            ) : (
              <MonthlyTable composed={composed} infos={infos} lookbackMonths={result.assumptions.lookbackMonths} />
            )}
          </HlCard>

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
