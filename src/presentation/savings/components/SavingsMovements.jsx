import React from 'react';
import { R$ } from '../../../core/utils/format';

const dm = (d) => {
  const s = String(d || '').slice(0, 10);
  const [y, m, day] = s.split('-');
  return day ? `${day}/${m}` : '—';
};

/** Extrato: os últimos depósitos e resgates, em todas as caixinhas. */
export default function SavingsMovements({ movements, boxNameOf, limit = 8 }) {
  const rows = movements.slice(0, limit);

  return (
    <div className="card">
      <div className="flex jcb aic" style={{ marginBottom: 12 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Últimas movimentações</h3>
        {movements.length > limit && (
          <span className="txxs tmuted">{movements.length} no total</span>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="tmuted tsm" style={{ textAlign: 'center', padding: '14px 0', lineHeight: 1.6 }}>
          Nenhuma movimentação ainda.<br />
          O histórico começa no primeiro depósito ou resgate.
        </p>
      ) : (
        rows.map(m => {
          const isIn = m.savingsDirection !== 'out';
          return (
            <div key={m.id} className="flex jcb aic" style={{ padding: '7px 0', borderBottom: '1px solid var(--border)', gap: 10 }}>
              <div className="flex aic" style={{ gap: 9, minWidth: 0 }}>
                <span style={{
                  width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11,
                  background: isIn ? 'color-mix(in srgb, var(--green) 18%, transparent)'
                                   : 'color-mix(in srgb, var(--red) 18%, transparent)',
                }}>{isIn ? '↓' : '↑'}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {isIn ? 'Depósito' : 'Resgate'} · {boxNameOf(m.accountId)}
                  </div>
                  <div className="txxs tmuted">{dm(m.date)}</div>
                </div>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, flexShrink: 0, color: isIn ? 'var(--green)' : 'var(--red)' }}>
                {isIn ? '+' : '−'} {R$(m.amount)}
              </span>
            </div>
          );
        })
      )}
    </div>
  );
}
