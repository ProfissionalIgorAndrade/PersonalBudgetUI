import React from 'react';

const OPTIONS = [1, 3, 6, 12];

export default function ScenarioPeriodSelector({ value, onChange }) {
  return (
    <div className="sim-period-selector" role="group" aria-label="Horizonte de projeção">
      {OPTIONS.map(n => (
        <button
          key={n}
          type="button"
          className={`sim-period-btn${value === n ? ' active' : ''}`}
          onClick={() => onChange(n)}
          aria-pressed={value === n}
        >
          {n === 1 ? '1 mês' : `${n} meses`}
        </button>
      ))}
    </div>
  );
}
