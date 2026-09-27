import React from 'react';
import GroupedBars from '../../shared/components/charts/GroupedBars';
import { R$ } from '../../../core/utils/format';

/**
 * Comparativo de despesas por categoria nos últimos meses.
 *
 * mode='chart' → gráfico de barras agrupadas (preenche o container)
 * mode='table' → tabela com variação percentual
 *
 * Cada modo é um widget independente no dashboard customizer.
 */
export default function CategoryTrendWidget({ months, rows, monthsCount, onChangeMonths, theme, mode = 'chart' }) {
  const series = months.map(m => ({ label: m.label, color: m.color, data: rows.map(r => r.values[m.key] ?? 0) }));
  const labels = rows.map(r => r.name);

  const title = mode === 'chart'
    ? `Despesas por Categoria — ${monthsCount} meses`
    : `Comparativo por Categoria — ${monthsCount} meses`;

  return (
    <div className="card">
      <div className="flex jcb aic" style={{ marginBottom: 6, gap: 8, flexWrap: 'wrap' }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.2px', margin: 0 }}>
          {title}
        </h3>
        <select
          className="form-select"
          value={monthsCount}
          onChange={e => onChangeMonths(Number(e.target.value))}
          style={{ padding: '4px 8px', fontSize: 11, width: 'auto' }}
          aria-label="Meses comparados"
        >
          {[3, 6, 12].map(n => <option key={n} value={n}>{n} meses</option>)}
        </select>
      </div>

      {rows.length === 0 ? (
        <p className="tmuted tsm" style={{ textAlign: 'center', padding: '12px 0' }}>
          Sem despesas no período
        </p>
      ) : mode === 'chart' ? (
        <GroupedBars labels={labels} series={series} theme={theme} />
      ) : (
        <div style={{ maxHeight: 420, overflow: 'auto' }}>
          <table className="csv-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Categoria</th>
                {months.map(m => <th key={m.key} style={{ textAlign: 'right' }}>{m.label}</th>)}
                <th style={{ textAlign: 'right' }}>Variação</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const first = r.values[months[0].key] ?? 0;
                const last  = r.values[months[months.length - 1].key] ?? 0;
                const delta = first > 0 ? ((last - first) / first) * 100 : null;
                return (
                  <tr key={r.id}>
                    <td style={{ fontSize: 12 }}>{r.icon} {r.name}</td>
                    {months.map(m => (
                      <td key={m.key} style={{ textAlign: 'right', fontSize: 12 }}>
                        {r.values[m.key] ? R$(r.values[m.key]) : <span className="tmuted">—</span>}
                      </td>
                    ))}
                    <td style={{
                      textAlign: 'right', fontSize: 12, fontWeight: 700,
                      color: delta == null ? 'var(--muted)' : delta > 0 ? 'var(--red)' : 'var(--green)',
                    }}>
                      {delta == null ? '—' : `${delta > 0 ? '+' : ''}${delta.toFixed(0)}%`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
