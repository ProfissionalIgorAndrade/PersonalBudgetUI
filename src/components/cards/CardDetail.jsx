import React, { useState } from 'react';
import { R$, monthLabel } from '../../utils/format';
import TxTable from '../transactions/TxTable';

const STATUS_CFG = {
  aberta:  { label: 'ABERTA',  color: 'var(--primary)', bg: 'rgba(45,212,191,.08)',  border: 'rgba(45,212,191,.25)', dot: '#2dd4bf' },
  fechada: { label: 'FECHADA', color: 'var(--yellow)',  bg: 'rgba(251,191,36,.08)',  border: 'rgba(251,191,36,.25)', dot: '#fbbf24' },
  paga:    { label: 'PAGA',    color: 'var(--green)',   bg: 'rgba(74,222,128,.08)',  border: 'rgba(74,222,128,.25)', dot: '#4ade80' },
};

export default function CardDetail({
  card, transactions, categories, members, accounts, cards,
  onEditTx, onDeleteTx,
  isFaturaClosed = () => false,
  onCloseFatura  = () => {},
}) {
  const closingDay = Number(card.closingDay) || 1;
  const dueDay     = Number(card.dueDay) || 10;
  const now        = new Date();

  /* ── fatura month for a transaction date ─────────────────── */
  const getFaturaMonth = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr + 'T12:00');
    if (d.getDate() > closingDay) {
      return new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString().slice(0, 7);
    }
    return dateStr.slice(0, 7);
  };

  /* ── 6-month list anchored on current fatura ─────────────── */
  const todayDay = now.getDate();
  const base = todayDay > closingDay
    ? new Date(now.getFullYear(), now.getMonth() + 1, 1)
    : new Date(now.getFullYear(), now.getMonth(), 1);

  const faturaMonths = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
    return d.toISOString().slice(0, 7);
  });

  const currentFatMonth = faturaMonths[0];
  const [selected, setSelected] = useState(faturaMonths[0]);
  const [paying, setPaying]     = useState(false);

  /* ── build fatura map ────────────────────────────────────── */
  const cardTx = transactions.filter(
    t => t.cardId === card.id && t.type === 'expense' && t.status !== 'cancelled'
  );
  const faturaMap = {};
  cardTx.forEach(t => {
    const fm = getFaturaMonth(t.date);
    if (fm) { if (!faturaMap[fm]) faturaMap[fm] = []; faturaMap[fm].push(t); }
  });

  const selTx   = faturaMap[selected] || [];
  const total   = selTx.reduce((s, t) => s + Number(t.amount), 0);
  const paid    = selTx.filter(t => t.status === 'paid').reduce((s, t) => s + Number(t.amount), 0);
  const pending = selTx.filter(t => t.status !== 'paid').reduce((s, t) => s + Number(t.amount), 0);

  const [fatY, fatM] = selected.split('-').map(Number);
  const dueDate = new Date(fatY, fatM - 1, dueDay);
  const dueFmt  = dueDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

  /* ── fatura status ───────────────────────────────────────── */
  const allPaid = selTx.length > 0 && selTx.every(t => t.status === 'paid');
  const isPast  = selected < currentFatMonth;

  let faturaStatus;
  if (allPaid) faturaStatus = 'paga';
  else if (isFaturaClosed(selected) || isPast) faturaStatus = 'fechada';
  else faturaStatus = 'aberta';

  const cfg = STATUS_CFG[faturaStatus];

  const payAll = () => {
    setPaying(true);
    selTx.filter(t => t.status !== 'paid').forEach(t => onEditTx({ ...t, status: 'paid' }));
    setTimeout(() => setPaying(false), 800);
  };

  return (
    <div>
      {/* ── month tabs ──────────────────────────────────────── */}
      <div className="fatura-tabs">
        {faturaMonths.map(m => (
          <div key={m} className={`fatura-tab${selected === m ? ' active' : ''}`} onClick={() => setSelected(m)}>
            {monthLabel(m)}
            {faturaMap[m] && <span style={{ marginLeft: 5, opacity: .7 }}>({faturaMap[m].length})</span>}
          </div>
        ))}
      </div>

      {/* ── fatura status bar ───────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', borderRadius: 12,
        background: cfg.bg, border: `1px solid ${cfg.border}`,
        marginBottom: 18, transition: 'background .4s, border-color .4s',
      }}>
        {/* left: status indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 9, height: 9, borderRadius: '50%', flexShrink: 0,
            background: cfg.dot,
            boxShadow: faturaStatus === 'aberta'
              ? `0 0 0 4px ${cfg.dot}28, 0 0 8px ${cfg.dot}55`
              : 'none',
            transition: 'background .4s, box-shadow .4s',
          }} />
          <span style={{
            fontWeight: 800, fontSize: 11, letterSpacing: 1.3,
            textTransform: 'uppercase', color: cfg.color,
            transition: 'color .4s',
          }}>
            {cfg.label}
          </span>
          {faturaStatus === 'paga' && (
            <span style={{ fontSize: 13, color: cfg.color }}>✓</span>
          )}
          <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 2 }}>
            {faturaStatus === 'aberta'  && '· ainda aberta para lançamentos'}
            {faturaStatus === 'fechada' && `· vence ${dueFmt}`}
            {faturaStatus === 'paga'    && '· fatura quitada'}
          </span>
        </div>

        {/* right: action buttons */}
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          {faturaStatus === 'aberta' && (
            <button
              className="btn btn-secondary"
              style={{ fontSize: 12, padding: '6px 14px' }}
              onClick={() => onCloseFatura(selected)}
            >
              🔒 Fechar Fatura
            </button>
          )}
          {faturaStatus !== 'paga' && pending > 0 && (
            <button
              className="btn btn-primary"
              style={{ fontSize: 12, padding: '6px 14px' }}
              onClick={payAll}
              disabled={paying}
            >
              {paying ? '⏳ Processando…' : '💳 Pagar Fatura'}
            </button>
          )}
        </div>
      </div>

      {/* ── summary boxes ───────────────────────────────────── */}
      <div className="summary-grid" style={{ marginBottom: 18 }}>
        <div className="summary-box">
          <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 4 }}>Total da Fatura</div>
          <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'Syne' }}>{R$(total)}</div>
        </div>
        <div className="summary-box">
          <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 4 }}>Vencimento</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)' }}>{dueFmt}</div>
        </div>
        <div className="summary-box">
          <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 4 }}>Pago</div>
          <div style={{ fontSize: 16, fontWeight: 800, fontFamily: 'Syne', color: 'var(--green)' }}>{R$(paid)}</div>
        </div>
        <div className="summary-box">
          <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 4 }}>Pendente</div>
          <div style={{ fontSize: 16, fontWeight: 800, fontFamily: 'Syne', color: pending > 0 ? 'var(--yellow)' : 'var(--muted)' }}>{R$(pending)}</div>
        </div>
      </div>

      {/* ── transactions table ──────────────────────────────── */}
      <TxTable
        rows={selTx}
        categories={categories}
        members={members}
        accounts={accounts}
        cards={cards}
        onEdit={onEditTx}
        onDelete={onDeleteTx}
        hideCols={['card']}
        emptyMsg="Nenhum lançamento nesta fatura"
      />
    </div>
  );
}
