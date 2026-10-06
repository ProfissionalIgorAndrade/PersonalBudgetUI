import React from 'react';
import { HlSpark, HlEmpty } from '../../health/widgets/HlParts';
import { R$ } from '../../../core/utils/format';
import {
  MODE_LABEL, TYPE_LABEL, TYPE_ICON, describeSimulation, signedMoney,
} from '../logic/labels';

const WARNING_TITLE = {
  BeforeWindow: 'Termina antes do período',
  Truncated: 'Começa antes do período',
  AfterWindow: 'Continua após o horizonte',
};

function sparkLabel(name, monthly, labels) {
  return `${name}, mês a mês: ${monthly.map((v, i) => `${labels[i]} ${R$(v)}`).join('; ')}`;
}

function SimulationRow({ sim, projection, warnings, labels, onToggle, onEdit, onRemove }) {
  return (
    <li className={`wi-sim${sim.enabled ? '' : ' is-off'}`}>
      <button
        type="button" role="switch" aria-checked={sim.enabled} className="wi-switch"
        aria-label={`${sim.enabled ? 'Desligar' : 'Ligar'} ${sim.description}`} onClick={() => onToggle(sim.id)}
      >
        <span className="wi-switch-knob" aria-hidden="true" />
        <span className="wi-switch-text">{sim.enabled ? 'Ligada' : 'Desligada'}</span>
      </button>

      <div className="wi-sim-main">
        <div className="wi-sim-title">
          <span aria-hidden="true">{TYPE_ICON[sim.type]}</span>
          <strong>{sim.description}</strong>
          <span className="wi-tag">{TYPE_LABEL[sim.type]} · {MODE_LABEL[sim.mode]}</span>
        </div>
        <p className="wi-sim-desc">{describeSimulation(sim, projection)}</p>
        {warnings.map((w, i) => (
          <p key={`${w.code}${i}`} className="wi-warn">
            <span aria-hidden="true">⚠ </span><strong>{WARNING_TITLE[w.code] ?? 'Atenção'}.</strong> {w.message}
          </p>
        ))}
      </div>

      <div className="wi-sim-totals">
        {projection ? (
          <>
            <span>No horizonte: <strong>{signedMoney(projection.totalInHorizon)}</strong></span>
            <span>Total completo: <strong>{signedMoney(projection.totalFull)}</strong></span>
            <HlSpark points={projection.monthly.map((value) => ({ value }))} ariaLabel={sparkLabel(sim.description, projection.monthly, labels)} />
          </>
        ) : <span className="tmuted">Calculando…</span>}
      </div>

      <div className="wi-sim-actions">
        <button type="button" className="btn-icon" aria-label={`Editar ${sim.description}`} title="Editar" onClick={() => onEdit(sim)}>✏️</button>
        <button type="button" className="btn-icon" aria-label={`Remover ${sim.description}`} title="Remover" onClick={() => onRemove(sim.id)}>🗑️</button>
      </div>
    </li>
  );
}

/** Aba "Por simulação": lista com liga/desliga, totais, avisos e a linha "Todas juntas". */
export default function SimulationsTab({
  simulations, impactById, warnings, composed, labels, limitReached, onToggle, onEdit, onRemove, onAdd,
}) {
  if (simulations.length === 0) {
    return (
      <div className="wi-empty">
        <HlEmpty>Nenhuma simulação ainda. Adicione uma compra parcelada, uma renda extra ou um gasto mensal para ver o efeito no seu saldo.</HlEmpty>
        <button type="button" className="btn btn-primary" onClick={onAdd}>+ Nova simulação</button>
      </div>
    );
  }

  const { all } = composed;
  return (
    <div className="wi-sims">
      <ul className="wi-sim-list" aria-label="Simulações">
        {simulations.map((sim) => (
          <SimulationRow
            key={sim.id} sim={sim} projection={impactById.get(sim.id)}
            warnings={warnings.filter((w) => w.impactId === sim.id)} labels={labels}
            onToggle={onToggle} onEdit={onEdit} onRemove={onRemove}
          />
        ))}
      </ul>

      <div className="wi-sim wi-sim-all" role="group" aria-label="Todas juntas">
        <div className="wi-sim-main">
          <div className="wi-sim-title"><strong>Todas juntas</strong>
            <span className="wi-tag">{all.count} {all.count === 1 ? 'ligada' : 'ligadas'}</span>
          </div>
          <p className="wi-sim-desc">Soma das simulações ligadas, mês a mês.</p>
        </div>
        <div className="wi-sim-totals">
          <span>No horizonte: <strong>{signedMoney(all.totalInHorizon)}</strong></span>
          <span>Total completo: <strong>{signedMoney(all.totalFull)}</strong></span>
          <HlSpark points={all.monthly.map((value) => ({ value }))} ariaLabel={sparkLabel('Todas juntas', all.monthly, labels)} />
        </div>
      </div>

      <div className="wi-add-row">
        <button type="button" className="btn btn-secondary" onClick={onAdd} disabled={limitReached}>+ Nova simulação</button>
        {limitReached && <p className="wi-hint" role="status">Limite de 50 simulações atingido.</p>}
      </div>
    </div>
  );
}
