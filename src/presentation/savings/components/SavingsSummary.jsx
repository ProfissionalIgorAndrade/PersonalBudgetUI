import React from 'react';
import { R$ } from '../../../core/utils/format';

/**
 * Cabeçalho do cofrinho: quanto há guardado e o quanto isso representa da
 * soma das metas.
 *
 * A meta total é a soma das metas das caixinhas — não existe meta do lar à
 * parte, e inventar uma seria um número que ninguém definiu.
 */
export default function SavingsSummary({ total, towardGoal, goalTotal, monthNet, boxCount }) {
  // Progresso só das caixinhas com meta — ver o comentário em SavingsView.
  const pct = goalTotal > 0 ? Math.min((Number(towardGoal || 0) / goalTotal) * 100, 100) : null;

  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div className="txxs tmuted" style={{ textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>
        Total guardado
      </div>
      <div style={{ fontSize: 30, fontWeight: 800, marginBottom: 4 }}>{R$(total)}</div>

      {pct === null ? (
        <div className="txxs tmuted" style={{ marginBottom: 12 }}>
          {boxCount === 0
            ? 'Nenhuma caixinha ainda'
            : 'Defina uma meta numa caixinha para acompanhar o progresso'}
        </div>
      ) : (
        <>
          <div className="txxs tmuted" style={{ marginBottom: 8 }}>
            {pct.toFixed(0)}% da meta total
          </div>
          <div className="progress-bar" style={{ marginBottom: 12 }}>
            <div className="progress-fill" style={{ width: `${pct}%`, background: 'var(--primary)' }} />
          </div>
        </>
      )}

      <div className="flex" style={{ gap: 28, flexWrap: 'wrap' }}>
        <div>
          <div className="txxs tmuted" style={{ marginBottom: 2 }}>Meta total</div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>
            {goalTotal > 0 ? R$(goalTotal) : <span className="tmuted">—</span>}
          </div>
        </div>
        <div>
          <div className="txxs tmuted" style={{ marginBottom: 2 }}>Este mês</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: monthNet >= 0 ? 'var(--green)' : 'var(--red)' }}>
            {monthNet >= 0 ? '+' : '−'} {R$(Math.abs(monthNet))}
          </div>
        </div>
        <div>
          <div className="txxs tmuted" style={{ marginBottom: 2 }}>Caixinhas</div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{boxCount}</div>
        </div>
      </div>
    </div>
  );
}
