import React, { useState } from 'react';
import { R$, monthLabel } from '../../../core/utils/format';
import TxTable from '../../transactions/components/TxTable';

const NUM = { fontFamily: "'Inter', sans-serif", fontVariantNumeric: 'tabular-nums', fontFeatureSettings: '"tnum" 1' };

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
  activeMonth,
}) {
  const closingDay = Number(card.closingDay) || 1;
  const dueDay     = Number(card.dueDay) || 10;
  const now        = new Date();
  const [paying, setPaying] = useState(false);

  const todayDay = now.getDate();
  const base = todayDay > closingDay
    ? new Date(now.getFullYear(), now.getMonth() + 1, 1)
    : new Date(now.getFullYear(), now.getMonth(), 1);
  const currentFatMonth = base.toISOString().slice(0, 7);

  const cardTx = transactions.filter(t => t.cardId === card.id && t.type === 'expense' && t.status !== 'cancelled');
  const selTx  = cardTx.filter(t => t.date?.startsWith(activeMonth));

  const total   = selTx.reduce((s, t) => s + Number(t.amount), 0);
  const paid    = selTx.filter(t => t.status === 'paid').reduce((s, t) => s + Number(t.amount), 0);
  const pending = selTx.filter(t => t.status !== 'paid').reduce((s, t) => s + Number(t.amount), 0);

  const [fatY, fatM] = (activeMonth || currentFatMonth).split('-').map(Number);
  const dueDate = new Date(fatY, fatM - 1, dueDay);
  const dueFmt  = dueDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

  const allPaid = selTx.length > 0 && selTx.every(t => t.status === 'paid');
  const isPast  = activeMonth < currentFatMonth;

  let faturaStatus;
  if (allPaid) faturaStatus = 'paga';
  else if (isFaturaClosed(activeMonth) || isPast) faturaStatus = 'fechada';
  else faturaStatus = 'aberta';

  const cfg = STATUS_CFG[faturaStatus];

  const payAll = () => {
    setPaying(true);
    selTx.filter(t => t.status !== 'paid').forEach(t => onEditTx({ ...t, status: 'paid' }));
    setTimeout(() => setPaying(false), 800);
  };

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', borderRadius: 12,
        background: cfg.bg, border: `1px solid ${cfg.border}`,
        marginBottom: 18, transition: 'background .4s, border-color .4s',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 9, height: 9, borderRadius: '50%', flexShrink: 0,
            background: cfg.dot,
            boxShadow: faturaStatus === 'aberta' ? `0 0 0 4px ${cfg.dot}28, 0 0 8px ${cfg.dot}55` : 'none',
            transition: 'background .4s, box-shadow .4s',
          }} />
          <span style={{ fontWeight: 800, fontSize: 11, letterSpacing: 1.3, textTransform: 'uppercase', color: cfg.color, transition: 'color .4s' }}>
            {cfg.label}
          </span>
          {faturaStatus === 'paga' && <span style={{ fontSize: 13, color: cfg.color }}>✓</span>}
          <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 2 }}>
            {faturaStatus === 'aberta'  && '· ainda aberta para lançamentos'}
            {faturaStatus === 'fechada' && `· vence ${dueFmt}`}
            {faturaStatus === 'paga'    && '· fatura quitada'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          {faturaStatus === 'aberta' && (
            <button className="btn btn-secondary" style={{ fontSize: 12, padding: '6px 14px' }} onClick={() => onCloseFatura(activeMonth)}>
              🔒 Fechar Fatura
            </button>
          )}
          {faturaStatus !== 'paga' && pending > 0 && (
            <button className="btn btn-primary" style={{ fontSize: 12, padding: '6px 14px' }} onClick={payAll} disabled={paying}>
              {paying ? '⏳ Processando…' : '💳 Pagar Fatura'}
            </button>
          )}
        </div>
      </div>

      <div className="summary-grid" style={{ marginBottom: 18 }}>
        <div className="summary-box">
          <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 4 }}>Total da Fatura</div>
          <div style={{ fontSize: 20, fontWeight: 800, ...NUM }}>{R$(total)}</div>
        </div>
        <div className="summary-box">
          <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 4 }}>Vencimento</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)' }}>{dueFmt}</div>
        </div>
        <div className="summary-box">
          <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 4 }}>Pago</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--green)', ...NUM }}>{R$(paid)}</div>
        </div>
        <div className="summary-box">
          <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 4 }}>Pendente</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: pending > 0 ? 'var(--yellow)' : 'var(--muted)', ...NUM }}>{R$(pending)}</div>
        </div>
      </div>

      <TxTable
        rows={selTx}
        categories={categories}
        members={members}
        accounts={accounts}
        cards={cards}
        onEdit={onEditTx}
        onDelete={onDeleteTx}
        hideCols={['card']}
        emptyMsg="Nenhum lançamento neste mês"
      />
    </div>
  );
}
