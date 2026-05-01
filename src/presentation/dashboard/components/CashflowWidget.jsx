import React from 'react';
import BarLine from '../../shared/components/charts/BarLine';

export default function CashflowWidget({ labels, income, expenses }) {
  return (
    <div className="card">
      <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, letterSpacing: '-0.2px' }}>Fluxo de Caixa — Últimos 6 Meses</h3>
      <BarLine labels={labels} income={income} expenses={expenses} />
    </div>
  );
}
