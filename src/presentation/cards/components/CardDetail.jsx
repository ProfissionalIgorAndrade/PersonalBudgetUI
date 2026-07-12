import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { R$ } from '../../../core/utils/format';
import { normalizeTransaction } from '../../../application/mappers';
import TxTable from '../../transactions/components/TxTable';
import Modal from '../../shared/components/Modal';
import * as cardRepo from '../../../data/repositories/cardRepository';

const NUM = { fontFamily: "'Inter', sans-serif", fontVariantNumeric: 'tabular-nums', fontFeatureSettings: '"tnum" 1' };

const STATUS_CFG = {
  aberta:  { label: 'ABERTA',  color: 'var(--primary)', bg: 'rgba(45,212,191,.08)',  border: 'rgba(45,212,191,.25)', dot: '#2dd4bf' },
  fechada: { label: 'FECHADA', color: 'var(--yellow)',  bg: 'rgba(251,191,36,.08)',  border: 'rgba(251,191,36,.25)', dot: '#fbbf24' },
  paga:    { label: 'PAGA',    color: 'var(--green)',   bg: 'rgba(74,222,128,.08)',  border: 'rgba(74,222,128,.25)', dot: '#4ade80' },
};

const STATUS_OPTIONS = [
  { value: 'Open',   label: 'Aberta'  },
  { value: 'Closed', label: 'Fechada' },
  { value: 'Paid',   label: 'Paga'    },
];

const FATURA_TO_API = { aberta: 'Open', fechada: 'Closed', paga: 'Paid' };

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

/** Transactions embedded in GetStatement response (ASP.NET casing / nesting tolerant). */
function extractStatementTransactions(raw) {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw !== 'object') return [];

  const tryLists = (...cands) => {
    for (const c of cands) if (Array.isArray(c) && c.length) return c;
    return [];
  };

  const direct = tryLists(raw.transactions, raw.Transactions);
  if (direct.length) return direct;

  const flat = unwrapStatementPayload(raw);
  const fromFlat = tryLists(
    flat.transactions, flat.Transactions,
    flat.transactionDtos, flat.TransactionDtos,
    flat.items, flat.Items,
  );
  if (fromFlat.length) return fromFlat;

  for (const k of ['statement', 'Statement', 'creditCardStatement', 'CreditCardStatement']) {
    const inner = raw[k];
    if (inner && typeof inner === 'object') {
      const t = inner.transactions ?? inner.Transactions ?? inner.transactionDtos ?? inner.TransactionDtos;
      if (Array.isArray(t) && t.length) return t;
    }
  }
  return [];
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

function applyPayloadToStatementState(data, setStatement, setStatementTxs) {
  const meta = normalizeStatementData(data);
  const rawList = extractStatementTransactions(data);
  const txs = (rawList || []).map(normalizeTransaction).filter(Boolean);
  setStatement({
    loading: false,
    error: null,
    statementId: meta.statementId,
    isClosed: meta.isClosed,
    isPaid: meta.isPaid,
  });
  setStatementTxs(txs);
}

export default function CardDetail({
  card,
  categories,
  members,
  accounts,
  cards,
  onEditTx,
  onDeleteTx,
  onBatchDeleteTx,
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

  const [statementTxs, setStatementTxs] = useState([]);

  /* Período da fatura ≠ mês-calendário da data da compra (ex.: fecha dia 28 → 29/05 entra na fatura de junho).
     Confiamos na lista retornada pelo statement (month/year); não filtramos por ano-mês do lançamento. */
  const selTx = useMemo(
    () => statementTxs.filter(t => t.type === 'expense' && t.status !== 'cancelled'),
    [statementTxs],
  );

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

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [modalStatus, setModalStatus]         = useState('Open');
  const [modalAccountId, setModalAccountId]   = useState('');
  const [modalError, setModalError]           = useState('');
  const [modalLoading, setModalLoading]       = useState(false);

  const refetchStatement = useCallback(async () => {
    const data = await cardRepo.getStatement(card.id, fatM, fatY);
    applyPayloadToStatementState(data, setStatement, setStatementTxs);
  }, [card.id, fatM, fatY]);

  useEffect(() => {
    if (!card?.id || !monthStr) {
      setStatement(s => ({ ...s, loading: false }));
      setStatementTxs([]);
      return undefined;
    }
    let cancelled = false;
    setStatement(s => ({ ...s, loading: true, error: null }));
    setStatementTxs([]);
    (async () => {
      try {
        const data = await cardRepo.getStatement(card.id, fatM, fatY);
        if (cancelled) return;
        applyPayloadToStatementState(data, setStatement, setStatementTxs);
      } catch (e) {
        if (cancelled) return;
        setStatement({
          loading: false,
          error: e.message,
          statementId: null,
          isClosed: false,
          isPaid: false,
        });
        setStatementTxs([]);
      }
    })();
    return () => { cancelled = true; };
  }, [card.id, monthStr, fatM, fatY]);

  const apiPaid   = statement.isPaid;
  const apiClosed = statement.isClosed;

  let faturaStatus;
  if (statement.statementId) {
    if (apiPaid)   faturaStatus = 'paga';
    else if (apiClosed) faturaStatus = 'fechada';
    else           faturaStatus = 'aberta';
  } else {
    if (allPaid)   faturaStatus = 'paga';
    else if (isPast) faturaStatus = 'fechada';
    else           faturaStatus = 'aberta';
  }

  const cfg = STATUS_CFG[faturaStatus];

  const isOptionDisabled = (value) => {
    if (value === FATURA_TO_API[faturaStatus]) return true;
    if (faturaStatus === 'paga' && value === 'Open') return true;
    return false;
  };

  const openStatusModal = () => {
    const firstAvailable = STATUS_OPTIONS.find(opt => !isOptionDisabled(opt.value));
    setModalStatus(firstAvailable?.value || 'Open');
    setModalAccountId(card.accountId || '');
    setModalError('');
    setShowStatusModal(true);
  };

  const handleStatusChange = async () => {
    if (!statement.statementId) {
      setModalError('Não foi possível identificar a fatura.');
      return;
    }
    setModalLoading(true);
    setModalError('');
    try {
      await cardRepo.updateStatementStatus(
        card.id,
        statement.statementId,
        modalStatus,
        modalAccountId || null,
      );
      notify('Status da fatura atualizado.');
      setShowStatusModal(false);
      await refetchStatement();
      await loadTransactions();
    } catch (e) {
      setModalError(e.message);
    } finally {
      setModalLoading(false);
    }
  };

  const activeAccounts = (accounts || []).filter(a => a.isActive !== false);

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

        {statement.statementId && !statement.loading && (
          <button
            type="button"
            onClick={openStatusModal}
            title="Alterar status da fatura"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: cfg.color, opacity: .7, padding: '4px 6px',
              fontSize: 14, lineHeight: 1, borderRadius: 6,
              transition: 'opacity .15s',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '1'}
            onMouseLeave={e => e.currentTarget.style.opacity = '.7'}
          >
            ✏️
          </button>
        )}
      </div>

      <div className="summary-grid" style={{ marginBottom: 18 }}>
        <div className="summary-box">
          <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 4 }}>Total da Fatura</div>
          <div style={{ fontSize: 20, fontWeight: 800, ...NUM }}>{statement.loading ? '—' : R$(total)}</div>
        </div>
        <div className="summary-box">
          <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 4 }}>Vencimento</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)' }}>{dueFmt}</div>
        </div>
        <div className="summary-box">
          <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 4 }}>Pago</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--green)', ...NUM }}>{statement.loading ? '—' : R$(paid)}</div>
        </div>
        <div className="summary-box">
          <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 4 }}>Pendente</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: pending > 0 ? 'var(--yellow)' : 'var(--muted)', ...NUM }}>{statement.loading ? '—' : R$(pending)}</div>
        </div>
      </div>

      <TxTable
        rows={selTx}
        categories={categories}
        members={members}
        accounts={accounts}
        cards={cards}
        onEdit={faturaStatus === 'paga' ? undefined : onEditTx}
        onDelete={faturaStatus === 'paga' ? undefined : onDeleteTx}
        onBatchDelete={faturaStatus === 'paga' ? undefined : onBatchDeleteTx}
        hideCols={['card']}
        emptyMsg={statement.loading ? 'Carregando…' : statement.error ? 'Não foi possível carregar a fatura' : 'Nenhum lançamento neste mês'}
      />

      {showStatusModal && (
        <Modal title="Alterar status da fatura" onClose={() => !modalLoading && setShowStatusModal(false)}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, color: 'var(--muted)', marginBottom: 8 }}>
              Status
            </label>
            <select
              className="form-select"
              value={modalStatus}
              onChange={e => setModalStatus(e.target.value)}
              disabled={modalLoading}
              style={{ width: '100%' }}
            >
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value} disabled={isOptionDisabled(opt.value)}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {modalStatus === 'Paid' && (
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, color: 'var(--muted)', marginBottom: 8 }}>
                Conta de débito
              </label>
              <select
                className="form-select"
                value={modalAccountId}
                onChange={e => setModalAccountId(e.target.value)}
                disabled={modalLoading}
                style={{ width: '100%' }}
              >
                <option value="">Conta padrão do cartão</option>
                {activeAccounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} — {R$(acc.balance)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {modalError && (
            <div style={{
              padding: '10px 14px', borderRadius: 8, marginBottom: 16,
              background: 'rgba(248,113,113,.10)', border: '1px solid rgba(248,113,113,.3)',
              fontSize: 13, color: 'var(--red, #f87171)', fontWeight: 600,
            }}>
              {modalError}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowStatusModal(false)}
              disabled={modalLoading}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleStatusChange}
              disabled={modalLoading || isOptionDisabled(modalStatus)}
            >
              {modalLoading ? 'Salvando…' : 'Confirmar'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
