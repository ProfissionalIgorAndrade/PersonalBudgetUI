import React from 'react';
import { R$ } from '../../../core/utils/format';

function Card({ label, value, valueColor }) {
  return (
    <div className="sim-impact-card">
      <div className="sim-impact-label">{label}</div>
      <div className="sim-impact-value" style={{ color: valueColor }}>{value}</div>
    </div>
  );
}

export default function ScenarioImpactCards({ result }) {
  const { summary } = result;
  const { baseEndBalance, scenarioEndBalance, totalSimulatedImpact } = summary;

  const better = totalSimulatedImpact >= 0;

  return (
    <div className="sim-impact-cards">
      <Card
        label="Saldo Final"
        value={R$(baseEndBalance)}
        valueColor="var(--primary)"
      />
      <Card
        label="Saldo com Cenário"
        value={R$(scenarioEndBalance)}
        valueColor={better ? 'var(--green)' : 'var(--red)'}
      />
      <Card
        label="Impacto"
        value={`${totalSimulatedImpact > 0 ? '+' : ''}${R$(totalSimulatedImpact)}`}
        valueColor={better ? 'var(--green)' : 'var(--red)'}
      />
    </div>
  );
}
