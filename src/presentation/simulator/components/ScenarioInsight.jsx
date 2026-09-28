import React from 'react';
import { R$ } from '../../../core/utils/format';

export default function ScenarioInsight({ result, months }) {
  if (!result) {
    return (
      <div className="sim-insight neutral">
        <span className="sim-insight-icon">💡</span>
        <span>Adicione impactos para ver como seu cenário afeta suas finanças.</span>
      </div>
    );
  }

  const { summary } = result;

  if (summary.scenarioGoesNegative) {
    const idx   = summary.firstNegativeMonthIndex ?? 0;
    const month = result.months?.[idx];
    const label = month?.label ?? `mês ${idx + 1}`;
    return (
      <div className="sim-insight warning">
        <span className="sim-insight-icon">⚠️</span>
        <span>
          Com esse cenário, seu saldo ficaria negativo em <strong>{label}</strong>. Revise os impactos.
        </span>
      </div>
    );
  }

  const impact = summary.totalSimulatedImpact;

  if (impact < 0) {
    return (
      <div className="sim-insight negative">
        <span className="sim-insight-icon">📊</span>
        <span>
          Esse cenário reduziria seu saldo em <strong>{R$(Math.abs(impact))}</strong> ao longo de {months} {months === 1 ? 'mês' : 'meses'}.
        </span>
      </div>
    );
  }

  if (impact > 0) {
    return (
      <div className="sim-insight positive">
        <span className="sim-insight-icon">✅</span>
        <span>
          Esse cenário aumentaria seu saldo em <strong>{R$(impact)}</strong> ao longo de {months} {months === 1 ? 'mês' : 'meses'}.
        </span>
      </div>
    );
  }

  return (
    <div className="sim-insight neutral">
      <span className="sim-insight-icon">💡</span>
      <span>Adicione impactos para ver como seu cenário afeta suas finanças.</span>
    </div>
  );
}
