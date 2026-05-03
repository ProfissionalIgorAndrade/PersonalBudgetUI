import React, { useState, useMemo, useEffect } from 'react';
import { R$, fdate } from '../../../core/utils/format';
import Modal from '../../shared/components/Modal';
import TxForm from './TxForm';

const NUM = { fontFamily: "'Inter', sans-serif", fontVariantNumeric: 'tabular-nums', fontFeatureSettings: '"tnum" 1' };

const STATUS = {
  paid:      <span className="badge badge-green">✓ Completo</span>,
  pending:   <span className="badge badge-yellow">⏳ Pendente</span>,
  cancelled: <span className="badge badge-muted">✕ Cancelado</span>,
};

function isCreditCardTx(t) {
  return !!(t?.paymentMethod === 'CreditCard' || (t?.cardId && String(t.cardId).trim()));
}

/** Editar/excluir apenas para Pendente — Completo ou Cancelado não exibe ações na coluna. */
function allowsEditDeleteActions(t) {
  return t?.status === 'pending';
}

const REC = {
  fixed:       <span className="badge badge-teal">Fixo</span>,
  variable:    <span className="badge badge-blue">Variável</span>,
  installment: <span className="badge badge-blue">Parc.</span>,
  split:       <span className="badge badge-muted">Dividido</span>,
  none:        <span style={{ color: 'var(--muted)', fontSize: 11 }}>—</span>,
};

function SortArrow({ col, sortCol, sortDir }) {
  if (sortCol !== col) return <span className="csv-sort">⇅</span>;
  return <span className="csv-sort active">{sortDir === 'asc' ? '↑' : '↓'}</span>;
}

export default function TxTable({
  rows = [],
  categories = [],
  members = [],
  accounts = [],
  cards = [],
  onEdit,
  onDelete,
  onUpdateStatus,
  hideCols = [],
  emptyMsg = 'Nenhum lançamento encontrado',
}) {
  const PAGE_SIZE = 15;
  const [sortCol,    setSortCol]    = useState('date');
  const [sortDir,    setSortDir]    = useState('desc');
  const [page,       setPage]       = useState(1);
  const [editingTx,  setEditingTx]  = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [busyStatusId, setBusyStatusId] = useState(null);

  /** Stable across refetches (same txn set → same key); changes when filters/CRUD alter which rows belong in the table. */
  const paginationIdentityKey = useMemo(() => rows.map(r => String(r.id)).sort().join('|'), [rows]);

  useEffect(() => { setPage(1); }, [paginationIdentityKey]);

  const show = col => !hideCols.includes(col);

  const handleSort = col => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
  };

  const sorted = useMemo(() => {
    const resolve = t => {
      if (sortCol === 'date')       return t.date || '';
      if (sortCol === 'desc')       return (t.description || '').toLowerCase();
      if (sortCol === 'amount')     return Number(t.amount);
      if (sortCol === 'cat')        return categories.find(c => c.id === t.categoryId)?.name?.toLowerCase() || '';
      if (sortCol === 'member')     return members.find(m => m.id === t.memberId)?.name?.toLowerCase() || '';
      if (sortCol === 'status')     return t.status || '';
      if (sortCol === 'recurrence') return t.recurrence || '';
      return '';
    };
    return [...rows].sort((a, b) => {
      const av = resolve(a), bv = resolve(b);
      const cmp = typeof av === 'string' ? av.localeCompare(bv, 'pt-BR') : av - bv;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [rows, sortCol, sortDir, categories, members]);

  const totalIn    = rows.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const totalOut   = rows.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  const balance    = totalIn - totalOut;
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated  = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(p => Math.min(p, totalPages));
  }, [totalPages]);

  const runStatusChange = (t, next) => {
    if (!onUpdateStatus || next === t.status) return;
    setBusyStatusId(t.id);
    Promise.resolve(onUpdateStatus(t.id, next)).finally(() => setBusyStatusId(null));
  };

  const Th = ({ col, children, style }) => (
    <th
      className={`sortable${sortCol === col ? ' sorted' : ''}`}
      onClick={() => handleSort(col)}
      style={style}
    >
      {children} <SortArrow col={col} sortCol={sortCol} sortDir={sortDir} />
    </th>
  );

  return (
    <>
      {/* ── Summary bar ──────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '8px 12px', background: 'var(--surface2)', borderRadius: '10px 10px 0 0', border: '1px solid var(--border)', borderBottom: 'none', flexWrap: 'wrap' }}>
        <span className="txxs tmuted" style={{ marginRight: 'auto' }}>{sorted.length} registro(s)</span>
        <span style={{ fontSize: 12 }}>
          Receitas: <strong style={{ color: 'var(--green)', ...NUM }}>+{R$(totalIn)}</strong>
        </span>
        <span style={{ color: 'var(--border)' }}>|</span>
        <span style={{ fontSize: 12 }}>
          Despesas: <strong style={{ color: 'var(--red)', ...NUM }}>−{R$(totalOut)}</strong>
        </span>
        <span style={{ color: 'var(--border)' }}>|</span>
        <span style={{ fontSize: 12 }}>
          Saldo: <strong style={{ color: balance >= 0 ? 'var(--green)' : 'var(--red)', ...NUM }}>
            {balance >= 0 ? '+' : '−'}{R$(Math.abs(balance))}
          </strong>
        </span>
      </div>

      <div className="csv-wrap" style={{ borderRadius: '0 0 10px 10px', borderTop: 'none' }}>
        <table className="csv-table">
          <thead>
            <tr>
              <th className="csv-col-n">#</th>
              <Th col="date">Data</Th>
              <Th col="desc">Descrição</Th>
              <Th col="cat">Categoria</Th>
              {show('member')     && <Th col="member">Membro</Th>}
              {show('account')    && <th>Conta</th>}
              {show('card')       && <th>Cartão</th>}
              {show('recurrence') && <Th col="recurrence">Recorrência</Th>}
              <Th col="status">Status</Th>
              <Th col="amount" style={{ textAlign: 'right' }}>Valor</Th>
              <th className="csv-col-act" scope="col">Ações</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={99} style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--muted)' }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>💸</div>
                  <div style={{ fontSize: 13 }}>{emptyMsg}</div>
                </td>
              </tr>
            ) : paginated.map((t, i) => {
              const rowNum    = (page - 1) * PAGE_SIZE + i + 1;
              const cat       = categories.find(c => c.id === t.categoryId);
              const mem       = members.find(m => m.id === t.memberId);
              const acc       = accounts.find(a => a.id === t.accountId);
              const crd       = cards.find(c => c.id === t.cardId);
              const isIncome  = t.type === 'income';
              const isExpense = t.type === 'expense';
              return (
                <tr key={t.id}>
                  <td className="csv-col-n">{rowNum}</td>
                  <td className="csv-col-date">{fdate(t.date)}</td>
                  <td className="csv-col-desc">
                    <div style={{ fontWeight: 600, fontSize: 12 }}>{t.description}</div>
                    {t.installments && <div className="txxs tmuted">{t.installmentCurrent}/{t.installments}x</div>}
                    {t.notes && <div className="txxs tmuted" style={{ fontStyle: 'italic' }}>{t.notes}</div>}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <span style={{ fontSize: 15, marginRight: 5 }}>{cat?.icon}</span>
                    <span style={{ fontSize: 11 }}>{cat?.name || '—'}</span>
                  </td>
                  {show('member') && (
                    <td style={{ whiteSpace: 'nowrap', fontSize: 12 }}>
                      {mem ? <>{mem.emoji} {mem.name}</> : <span className="tmuted">—</span>}
                    </td>
                  )}
                  {show('account') && (
                    <td style={{ fontSize: 11 }}>
                      {acc ? <span style={{ color: 'var(--muted)' }}>🏦 {acc.name}</span> : <span className="tmuted">—</span>}
                    </td>
                  )}
                  {show('card') && (
                    <td style={{ fontSize: 11 }}>
                      {crd ? <span style={{ color: 'var(--muted)' }}>💳 {crd.name}</span> : <span className="tmuted">—</span>}
                    </td>
                  )}
                  {show('recurrence') && <td>{REC[t.recurrence] ?? REC.none}</td>}
                  <td style={{ verticalAlign: 'middle' }}>
                    {onUpdateStatus && !isCreditCardTx(t) ? (
                      <select
                        className="form-select"
                        aria-label={`Status — ${t.description || 'lançamento'}`}
                        style={{ minWidth: 122, padding: '5px 8px', fontSize: 11 }}
                        value={t.status === 'paid' || t.status === 'pending' || t.status === 'cancelled' ? t.status : 'pending'}
                        disabled={busyStatusId === t.id}
                        onChange={e => runStatusChange(t, e.target.value)}
                      >
                        <option value="pending">Pendente</option>
                        <option value="paid">Completo</option>
                        <option value="cancelled">Cancelado</option>
                      </select>
                    ) : (
                      STATUS[t.status] ?? <span className="badge badge-muted">{t.status}</span>
                    )}
                  </td>
                  <td className="csv-col-val" style={{ color: isIncome ? 'var(--green)' : isExpense ? 'var(--red)' : 'var(--text)', ...NUM }}>
                    {isIncome ? '+' : isExpense ? '−' : ''}{R$(t.amount)}
                  </td>
                  <td className="csv-col-act">
                    <div style={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
                      {onEdit && allowsEditDeleteActions(t) && (
                        <button type="button" className="btn-icon" style={{ padding: '3px 7px', fontSize: 12 }} onClick={() => setEditingTx(t)} title="Editar">✏️</button>
                      )}
                      {onDelete && allowsEditDeleteActions(t) && (
                        <button type="button" className="btn-icon" style={{ padding: '3px 7px', fontSize: 12 }} onClick={() => setConfirmDel(t)} title="Excluir">🗑️</button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 0', borderTop: '1px solid var(--border)' }}>
          <button
            className="btn btn-secondary"
            style={{ padding: '4px 12px', fontSize: 12 }}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >← Anterior</button>
          <span style={{ fontSize: 12, color: 'var(--muted)', minWidth: 100, textAlign: 'center' }}>
            Página {page} de {totalPages}
          </span>
          <button
            className="btn btn-secondary"
            style={{ padding: '4px 12px', fontSize: 12 }}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >Próxima →</button>
        </div>
      )}

      {editingTx && (
        <Modal title="Editar Lançamento" onClose={() => setEditingTx(null)} wide>
          <TxForm
            tx={editingTx}
            cats={categories}
            members={members}
            accounts={accounts}
            cards={cards}
            onSave={tx => { onEdit(tx); setEditingTx(null); }}
            onClose={() => setEditingTx(null)}
          />
        </Modal>
      )}

      {confirmDel && (
        <Modal title="Confirmar Exclusão" onClose={() => setConfirmDel(null)}>
          <p style={{ marginBottom: 8, fontSize: 13, color: 'var(--muted)' }}>Deseja excluir este lançamento?</p>
          <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{confirmDel.description}</div>
            <div className="txxs tmuted" style={{ marginTop: 4 }}>{fdate(confirmDel.date)} · {R$(confirmDel.amount)}</div>
          </div>
          <div className="flex jce gap2" style={{ gap: 8 }}>
            <button className="btn btn-secondary" onClick={() => setConfirmDel(null)}>Cancelar</button>
            <button className="btn btn-danger" onClick={() => { onDelete(confirmDel.id); setConfirmDel(null); }}>🗑️ Excluir</button>
          </div>
        </Modal>
      )}
    </>
  );
}
