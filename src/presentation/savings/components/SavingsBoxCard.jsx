import React from 'react';
import { R$ } from '../../../core/utils/format';

/** Um card de caixinha: nome, quanto tem guardado e as duas ações. */
export default function SavingsBoxCard({ box, onMove, onRename }) {
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

      <div style={{ fontSize: 19, fontWeight: 800, marginBottom: 12 }}>{R$(box.balance)}</div>

      {onMove && (
        <div className="flex" style={{ gap: 6 }}>
          <button type="button" className="btn btn-secondary" style={{ flex: 1, padding: '6px 8px', fontSize: 11 }}
            onClick={() => onMove('in')}>
            ↓ Guardar
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ flex: 1, padding: '6px 8px', fontSize: 11 }}
            disabled={Number(box.balance || 0) <= 0}
            title={Number(box.balance || 0) <= 0 ? 'Não há nada guardado nesta caixinha' : undefined}
            onClick={() => onMove('out')}
          >
            ↑ Resgatar
          </button>
        </div>
      )}
    </div>
  );
}
