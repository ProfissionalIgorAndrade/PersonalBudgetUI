import React from 'react';
import { R$ } from '../../../core/utils/format';

/**
 * Bloco superior: total guardado à esquerda, resumo à direita.
 *
 * Segue o layout original — duas colunas lado a lado, não uma faixa larga.
 */
export function TotalCard({ total, towardGoal, goalTotal, monthNet }) {
  const pct = goalTotal > 0 ? Math.min((Number(towardGoal || 0) / goalTotal) * 100, 100) : null;

  return (
    <div className="card">
      <div className="flex jcb ais" style={{ marginBottom: 4 }}>
        <div className="txxs tmuted" style={{ textTransform: 'uppercase', letterSpacing: '.5px' }}>
          Total guardado
        </div>
        <span style={{ fontSize: 22, lineHeight: 1 }}>🐷</span>
      </div>

      <div style={{ fontSize: 30, fontWeight: 800, marginBottom: 6 }}>{R$(total)}</div>

      <div className="txxs tmuted" style={{ marginBottom: 10 }}>
        {pct === null
          ? 'Comece definindo uma meta para suas caixinhas.'
          : `${pct.toFixed(0)}% da meta total`}
      </div>

      <div className="progress-bar" style={{ marginBottom: 14 }}>
        <div className="progress-fill" style={{ width: `${pct ?? 0}%`, background: 'var(--primary)' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="card-sm" style={{ padding: '10px 12px' }}>
          <div className="txxs tmuted" style={{ marginBottom: 3 }}>Meta total</div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>
            {goalTotal > 0 ? R$(goalTotal) : <span className="tmuted">{R$(0)}</span>}
          </div>
        </div>
        <div className="card-sm" style={{ padding: '10px 12px' }}>
          <div className="txxs tmuted" style={{ marginBottom: 3 }}>Este mês</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: monthNet > 0 ? 'var(--green)' : monthNet < 0 ? 'var(--red)' : undefined }}>
            {monthNet < 0 ? '− ' : monthNet > 0 ? '+ ' : ''}{R$(Math.abs(monthNet))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Resumo: disponível nas contas de origem, caixinhas ativas e total do ano. */
export function SummaryCard({ availableToSave, boxCount, savedThisYear, hasGoal }) {
  const row = (label, value) => (
    <div className="flex jcb aic" style={{ padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: 12 }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 700 }}>{value}</span>
    </div>
  );

  return (
    <div className="card">
      <h3 style={{ fontSize: 14, fontWeight: 700, margin: '0 0 6px' }}>Resumo</h3>
      {row('Disponível para guardar', R$(availableToSave))}
      {row('Caixinhas ativas', boxCount)}
      {row('Guardado este ano', R$(savedThisYear))}

      <div style={{
        marginTop: 12, padding: '10px 12px', borderRadius: 10, fontSize: 11.5, lineHeight: 1.5,
        background: 'color-mix(in srgb, var(--primary) 10%, transparent)',
        border: '1px solid color-mix(in srgb, var(--primary) 25%, transparent)',
      }}>
        {hasGoal
          ? <>💡 Continue guardando para acompanhar sua meta.</>
          : <>💡 <strong>Próximo passo:</strong> defina uma meta para acompanhar sua evolução ao longo dos meses.</>}
      </div>
    </div>
  );
}
