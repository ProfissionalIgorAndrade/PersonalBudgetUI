import React, { useState, useEffect, useCallback } from 'react';
import { R$ } from '../../../core/utils/format';
import TxTable from '../../transactions/components/TxTable';
import * as cardRepo from '../../../data/repositories/cardRepository';

const NUM = { fontFamily: "'Inter', sans-serif", fontVariantNumeric: 'tabular-nums', fontFeatureSettings: '"tnum" 1' };

const STATUS_CFG = {
  aberta:  { label: 'ABERTA',  color: 'var(--primary)', bg: 'rgba(45,212,191,.08)',  border: 'rgba(45,212,191,.25)', dot: '#2dd4bf' },
  fechada: { label: 'FECHADA', color: 'var(--yellow)',  bg: 'rgba(251,191,36,.08)',  border: 'rgba(251,191,36,.25)', dot: '#fbbf24' },
  paga:    { label: 'PAGA',    color: 'var(--green)',   bg: 'rgba(74,222,128,.08)',  border: 'rgba(74,222,128,.25)', dot: '#4ade80' },
};

function hasMeaningfulTimestamp(v) {
  if (v == null || v === '') return false;
  const s = String(v);
  if (/^0001-01-01/i.test(s)) return false;
  return true;
}

/** Merge nested DTOs common in ASP.NET responses (statement + root envelope). */
function unwrapStatementPayload(raw) {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return raw || {};
  const nestKeys = ['statement', 'Statement', 'creditCardStatement', 'CreditCardStatement', 'detail', 'Detail'];
  for (const k of nestKeys) {
    const inner = raw[k];
    if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
      return { ...raw, ...inner };
    }
  }
  return raw;
}

function normalizeStatementData(data) {
  if (data == null) {
    return { statementId: null, isClosed: false, isPaid: false };
  }
  if (Array.isArray(data) && data.length) {
    return normalizeStatementData(data[0]);
  }
  if (typeof data !== 'object') {
    return { statementId: null, isClosed: false, isPaid: false };
  }
  const d = unwrapStatementPayload(data);

  const statementId =
    d.statementId ??
    d.StatementId ??
    d.creditCardStatementId ??
    d.CreditCardStatementId ??
    d.id ??
    d.Id;

  const closedAt =
    d.closedAt ?? d.ClosedAt ?? d.closureDate ?? d.ClosureDate ?? d.closedOn ?? d.ClosedOn ?? d.closingDate ?? d.ClosingDate;
  const paidAt = d.paidAt ?? d.PaidAt ?? d.paidOn ?? d.PaidOn;

  const statusRaw =
    d.status ??
    d.Status ??
    d.statementStatus ??
    d.StatementStatus ??
    d.state ??
    d.State ??
    d.phase ??
    d.Phase;

  let isClosed = false;
  let isPaid = false;

  const bClosed = d.isClosed ?? d.IsClosed ?? d.closed ?? d.Closed;
  const bPaid = d.isPaid ?? d.IsPaid ?? d.paid ?? d.Paid;
  const bOpen = d.isOpen ?? d.IsOpen;

  if (bPaid === true || bPaid === 'True' || bPaid === 'true' || bPaid === 1) isPaid = true;
  if (bClosed === true || bClosed === 'True' || bClosed === 'true' || bClosed === 1) isClosed = true;
  if (bOpen === false || bOpen === 'False' || bOpen === 'false' || bOpen === 0) isClosed = true;

  if (hasMeaningfulTimestamp(paidAt)) isPaid = true;
  if (hasMeaningfulTimestamp(closedAt)) isClosed = true;

  if (statusRaw != null && statusRaw !== '') {
    if (typeof statusRaw === 'number' && Number.isFinite(statusRaw)) {
      if (statusRaw === 0) { /* open */ }
      else if (statusRaw === 1) { isClosed = true; }
      else if (statusRaw >= 2) { isClosed = true; isPaid = true; }
    } else {
      const s = String(statusRaw).trim().toLowerCase();
      if (s.includes('paid') || s.includes('paga') || s.includes('pago') || s.includes('quitad') || s === '2') {
        isPaid = true;
        isClosed = true;
      } else if (s.includes('clos') || s.includes('fechad') || s === 'closed' || s === 'fechada' || s === '1') {
        isClosed = true;
      } else if (s.includes('open') || s.includes('abert') || s === '0') {
        isClosed = false;
        isPaid = false;
      }
    }
  }

  if (isPaid) isClosed = true;

  return { statementId: statementId ?? null, isClosed, isPaid };
}

export default function CardDetail({
  card, transactions, categories, members, accounts, cards,
  onEditTx, onDeleteTx,
  activeMonth,
  notify = () => {},
  loadTransactions = async () => {},
}) {
  const closingDay = Number(card.closingDay) || 1;
  const dueDay     = Number(card.dueDay) || 10;
  const now        = new Date();

  const todayDay = now.getDate();
  const base = todayDay > closingDay
    ? new Date(now.getFullYear(), now.getMonth() + 1, 1)
    : new Date(now.getFullYear(), now.getMonth(), 1);
  const currentFatMonth = base.toISOString().slice(0, 7);

  const monthStr = activeMonth || currentFatMonth;
  const [fatY, fatM] = monthStr.split('-').map(Number);

  const cardTx = transactions.filter(t => t.cardId === card.id && t.type === 'expense' && t.status !== 'cancelled');
  const selTx  = cardTx.filter(t => t.date?.startsWith(monthStr));

  const total   = selTx.reduce((s, t) => s + Number(t.amount), 0);
  const paid    = selTx.filter(t => t.status === 'paid').reduce((s, t) => s + Number(t.amount), 0);
  const pending = selTx.filter(t => t.status !== 'paid').reduce((s, t) => s + Number(t.amount), 0);

  const dueDate = new Date(fatY, fatM - 1, dueDay);
  const dueFmt  = dueDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

  const allPaid = selTx.length > 0 && selTx.every(t => t.status === 'paid');
  const isPast  = monthStr < currentFatMonth;

  const [statement, setStatement] = useState({
    loading: true,
    error: null,
    statementId: null,
    isClosed: false,
    isPaid: false,
  });
  const [closing, setClosing] = useState(false);
  const [paying, setPaying]   = useState(false);

  const refetchStatement = useCallback(async () => {
    const data = await cardRepo.getStatement(card.id, fatM, fatY);
    setStatement(prev => ({
      ...prev,
      loading: false,
      error: null,
      ...normalizeStatementData(data),
    }));
  }, [card.id, fatM, fatY]);

  useEffect(() => {
    if (!card?.id || !monthStr) {
      setStatement(s => ({ ...s, loading: false }));
      return;
    }
    let cancelled = false;
    setStatement(s => ({ ...s, loading: true, error: null }));
    (async () => {
      try {
        const data = await cardRepo.getStatement(card.id, fatM, fatY);
        if (cancelled) return;
        setStatement({
          loading: false,
          error: null,
          ...normalizeStatementData(data),
        });
      } catch (e) {
        if (cancelled) return;
        setStatement({
          loading: false,
          error: e.message,
          statementId: null,
          isClosed: false,
          isPaid: false,
        });
      }
    })();
    return () => { cancelled = true; };
  }, [card.id, monthStr]);

  const apiPaid = statement.isPaid;
  const apiClosed = statement.isClosed;

  let faturaStatus;
  if (apiPaid || allPaid) faturaStatus = 'paga';
  else if (apiClosed || isPast) faturaStatus = 'fechada';
  else faturaStatus = 'aberta';

  const cfg = STATUS_CFG[faturaStatus];

  const showClose =
    faturaStatus === 'aberta'
    && statement.statementId
    && !statement.loading
    && !closing;

  const showPay =
    apiClosed
    && !apiPaid
    && !allPaid
    && pending > 0
    && statement.statementId
    && !statement.loading
    && !paying;

  const handleClose = async () => {
    if (!statement.statementId) {
      notify('Não foi possível identificar a fatura.', 'error');
      return;
    }
    setClosing(true);
    try {
      await cardRepo.closeStatement(card.id, statement.statementId);
      notify('Fatura marcada como fechada.');
      await refetchStatement();
      await loadTransactions();
    } catch (e) {
      notify(e.message, 'error');
    } finally {
      setClosing(false);
    }
  };

  const handlePay = async () => {
    if (!statement.statementId) return;
    setPaying(true);
    try {
      await cardRepo.payStatement(card.id, statement.statementId);
      notify('Fatura paga com sucesso.');
      await refetchStatement();
      await loadTransactions();
    } catch (e) {
      notify(e.message, 'error');
    } finally {
      setPaying(false);
    }
  };

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', borderRadius: 12,
        background: cfg.bg, border: `1px solid ${cfg.border}`,
        marginBottom: 18, transition: 'background .4s, border-color .4s',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
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
          {statement.error && (
            <span style={{ fontSize: 11, color: 'var(--yellow)' }} title={statement.error}>
              · não foi possível carregar o status da fatura
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          {showClose && (
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: 12, padding: '6px 14px' }}
              onClick={handleClose}
              disabled={closing}
            >
              {closing ? '⏳ Fechando…' : '🔒 Fechar Fatura'}
            </button>
          )}
          {showPay && (
            <button
              type="button"
              className="btn btn-primary"
              style={{ fontSize: 12, padding: '6px 14px' }}
              onClick={handlePay}
              disabled={paying}
            >
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
