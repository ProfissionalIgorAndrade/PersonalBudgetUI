import React from 'react';
import { R$ } from '../../../core/utils/format';
import { goalProgress } from '../savingsHistory';

/** Um card de caixinha: nome, quanto tem guardado e as duas ações. */
export default function SavingsBoxCard({ box, onMove, onRename }) {
  const pct = goalProgress(box);
  return (
    <div className="card-sm" style={{ padding: 14 }}>
      <div className="flex jcb aic" style={{ marginBottom: 8, gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          🐷 {box.name}
        </span>
        {onRename && (
          <button type="button" className="btn-icon" title="Renomear caixinha"
            style={{ padding: '3px 6px', fontSize: 11 }} onClick={onRename}>✏️</button>
        )}
      </div>

      <div style={{ fontSize: 19, fontWeight: 800, marginBottom: pct === null ? 12 : 6 }}>{R$(box.balance)}</div>

      {/* Só aparece quando há meta: barra vazia sem alvo não diz nada. */}
      {pct !== null && (
        <div style={{ marginBottom: 12 }}>
          <div className="flex jcb aic" style={{ marginBottom: 4 }}>
            <span className="txxs tmuted">Meta {R$(box.savingsGoal)}</span>
            <span className="txxs" style={{ fontWeight: 700, color: pct >= 100 ? 'var(--green)' : 'var(--muted)' }}>
              {pct.toFixed(0)}%
            </span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{
              width: `${pct}%`,
              background: pct >= 100 ? 'var(--green)' : 'var(--primary)',
            }} />
          </div>
        </div>
      )}

      {onMove && (
        <div className="flex" style={{ gap: 6 }}>
          <button type="button" className="btn btn-secondary" style={{ flex: 1, padding: '6px 8px', fontSize: 11 }}
            onClick={() => onMove('in')}>
            ↓ Guardar
          </button>
          <button type="button" className="btn btn-secondary" style={{ flex: 1, padding: '6px 8px', fontSize: 11 }}
            onClick={() => onMove('out')}>
            ↑ Resgatar
          </button>
        </div>
      )}
    </div>
  );
}
