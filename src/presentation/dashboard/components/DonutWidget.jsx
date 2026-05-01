import React from 'react';
import Donut from '../../shared/components/charts/Donut';

export default function DonutWidget({ data, labels, colors }) {
  return (
    <div className="card">
      <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, letterSpacing: '-0.2px' }}>Gráfico de Despesas</h3>
      {data.length
        ? <Donut data={data} labels={labels} colors={colors} />
        : <p className="tmuted tsm" style={{ padding: '20px 0', textAlign: 'center' }}>Sem despesas este mês</p>}
    </div>
  );
}
