import React, { useMemo } from 'react';
import { R$ } from '../../../core/utils/format';
import { mergeSavingsHistory } from '../savingsTimeline';

const dm = (d) => {
  const s = String(d || '').slice(0, 10);
  const [y, m, day] = s.split('-');
  return day ? `${day}/${m}` : '—';
};

const ellipsis = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };

/** Ícone neutro: criação e exclusão não são dinheiro entrando nem saindo. */
const EventIcon = ({ children }) => (
  <span style={{
    width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11,
    background: 'var(--surface3)', color: 'var(--muted)',
  }}>{children}</span>
);

function EventRow({ event }) {
  const deleted = event.kind === 'deleted';
  const moved = deleted && Number(event.amount) > 0;
  const detail = [dm(event.date), event.reason].filter(Boolean).join(' · ');
  return (
    <div className="flex jcb aic" style={{ padding: '7px 0', borderBottom: '1px solid var(--border)', gap: 10 }}>
      <div className="flex aic" style={{ gap: 9, minWidth: 0 }}>
        <EventIcon>{deleted ? '×' : '+'}</EventIcon>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, ...ellipsis }}>
            {deleted ? 'Caixinha excluída' : 'Caixinha criada'} · {event.boxName}
          </div>
          <div className="txxs tmuted" style={ellipsis}>{detail}</div>
          {moved && (
            <div className="txxs tmuted" style={ellipsis}>
              {R$(event.amount)} → {event.destinationName}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MovementRow({ movement: m, boxNameOf }) {
  const isIn = m.savingsDirection !== 'out';
  return (
    <div className="flex jcb aic" style={{ padding: '7px 0', borderBottom: '1px solid var(--border)', gap: 10 }}>
      <div className="flex aic" style={{ gap: 9, minWidth: 0 }}>
        <span style={{
          width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11,
          background: isIn ? 'color-mix(in srgb, var(--green) 18%, transparent)'
                           : 'color-mix(in srgb, var(--red) 18%, transparent)',
        }}>{isIn ? '↓' : '↑'}</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, ...ellipsis }}>
            {isIn ? 'Depósito' : 'Resgate'} · {boxNameOf(m.accountId)}
          </div>
          <div className="txxs tmuted" style={ellipsis}>
            {dm(m.date)}
            {m.notes ? <> · {m.notes}</> : null}
          </div>
        </div>
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, flexShrink: 0, color: isIn ? 'var(--green)' : 'var(--red)' }}>
        {isIn ? '+' : '−'} {R$(m.amount)}
      </span>
    </div>
  );
}

/**
 * Histórico: depósitos, resgates e criação/exclusão de caixinhas, do mais
 * recente para o mais antigo. O nome numa exclusão vem gravado no evento,
 * porque a caixinha já não existe entre as contas.
 */
export default function SavingsMovements({ movements = [], events = [], boxNameOf, limit = 8 }) {
  const history = useMemo(() => mergeSavingsHistory(movements, events), [movements, events]);
  const rows = history.slice(0, limit);

  return (
    <div className="card">
      <div className="flex jcb aic" style={{ marginBottom: 12 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Histórico</h3>
        {history.length > limit && (
          <span className="txxs tmuted">{history.length} no total</span>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="tmuted tsm" style={{ textAlign: 'center', padding: '14px 0', lineHeight: 1.6 }}>
          Nenhum registro ainda. O histórico começa na criação de uma caixinha ou no primeiro depósito ou resgate.
        </p>
      ) : (
        rows.map(r => r.source === 'event'
          ? <EventRow key={r.key} event={r.item} />
          : <MovementRow key={r.key} movement={r.item} boxNameOf={boxNameOf} />)
      )}
    </div>
  );
}
