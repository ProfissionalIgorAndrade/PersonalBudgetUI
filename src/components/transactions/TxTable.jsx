import React, { useState, useMemo } from 'react';
import { R$, fdate } from '../../utils/format';
import Modal from '../ui/Modal';
import TxForm from './TxForm';

/* ── badges ─────────────────────────────────────────────────── */
const STATUS = {
  paid:      <span className="badge badge-green">✓ Pago</span>,
  pending:   <span className="badge badge-yellow">⏳ Pendente</span>,
  cancelled: <span className="badge badge-muted">✕ Cancelado</span>,
};

const REC = {
  fixed:       <span className="badge badge-teal">Fixo</span>,
  variable:    <span className="badge badge-blue">Variável</span>,
  installment: <span className="badge badge-blue">Parc.</span>,
  split:       <span className="badge badge-muted">Dividido</span>,
  none:        <span style={{ color: 'var(--muted)', fontSize: 11 }}>—</span>,
};

/* ── sort icon ───────────────────────────────────────────────── */
function SortArrow({ col, sortCol, sortDir }) {
  if (sortCol !== col) return <span className="csv-sort">⇅</span>;
  return <span className="csv-sort active">{sortDir === 'asc' ? '↑' : '↓'}</span>;
}

/* ═══════════════════════════════════════════════════════════════
   TxTable — generic spreadsheet-style transaction table
   Props:
     rows        – array of transaction objects
     categories  – for lookup
     members     – for lookup
     accounts    – for lookup
     cards       – for lookup
     onEdit(tx)  – called with updated tx when user saves
     onDelete(id)– called with id to remove
     hideCols    – array of column keys to hide:
                   'member' | 'account' | 'card' | 'recurrence'
     emptyMsg    – override for empty state text
═══════════════════════════════════════════════════════════════ */
export default function TxTable({
  rows = [],
  categories = [],
  members = [],
  accounts = [],
  cards = [],
  onEdit,
  onDelete,
  hideCols = [],
  emptyMsg = 'Nenhum lançamento encontrado',
}) {
  const [sortCol, setSortCol] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [editingTx, setEditingTx] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  const show = col => !hideCols.includes(col);

  /* ── sorting ─────────────────────────────────────────────── */
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

  /* ── footer totals ───────────────────────────────────────── */
  const totalIn  = rows.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const totalOut = rows.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
  const balance  = totalIn - totalOut;

  /* ── CSV export ──────────────────────────────────────────── */
  function exportCSV() {
    const hdrs = ['#', 'Data', 'Descrição', 'Tipo', 'Categoria', 'Membro',
                  'Conta', 'Cartão', 'Recorrência', 'Status', 'Valor (R$)', 'Observações'];
    const TYPE = { income: 'Receita', expense: 'Despesa', transfer: 'Transferência' };
    const REC_LBL = { fixed: 'Fixo', variable: 'Variável', installment: 'Parcelado', split: 'Dividido', none: 'Avulso' };
    const ST_LBL  = { paid: 'Pago', pending: 'Pendente', cancelled: 'Cancelado' };

    const csvRows = sorted.map((t, i) => [
      i + 1,
      t.date || '',
      `"${(t.description || '').replace(/"/g, '""')}"`,
      TYPE[t.type] || t.type,
      categories.find(c => c.id === t.categoryId)?.name || '',
      members.find(m => m.id === t.memberId)?.name || '',
      accounts.find(a => a.id === t.accountId)?.name || '',
      cards.find(c => c.id === t.cardId)?.name || '',
      REC_LBL[t.recurrence] || '',
      ST_LBL[t.status] || '',
      (t.type === 'income' ? '+' : '-') + Number(t.amount).toFixed(2).replace('.', ','),
      `"${(t.notes || '').replace(/"/g, '""')}"`,
    ].join(';'));

    const csv = '\uFEFF' + [hdrs.join(';'), ...csvRows].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'lancamentos.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  /* ── th helper ───────────────────────────────────────────── */
  const Th = ({ col, children, style }) => (
    <th
      className={`sortable${sortCol === col ? ' sorted' : ''}`}
      onClick={() => handleSort(col)}
      style={style}
    >
      {children} <SortArrow col={col} sortCol={sortCol} sortDir={sortDir} />
    </th>
  );

  /* ══════════════════════════════════════════════════════════ */
  return (
    <>
      {/* toolbar */}
      <div className="csv-toolbar">
        <span className="csv-count">{sorted.length} registro(s)</span>
        <button className="btn-icon" style={{ fontSize: 11 }} onClick={exportCSV}>
          📥 Exportar .CSV
        </button>
      </div>

      {/* table */}
      <div className="csv-wrap">
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
              <th className="csv-col-act"></th>
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
            ) : sorted.map((t, i) => {
              const cat = categories.find(c => c.id === t.categoryId);
              const mem = members.find(m => m.id === t.memberId);
              const acc = accounts.find(a => a.id === t.accountId);
              const crd = cards.find(c => c.id === t.cardId);
              const isIncome = t.type === 'income';
              const isExpense = t.type === 'expense';
              return (
                <tr key={t.id}>
                  <td className="csv-col-n">{i + 1}</td>

                  {/* data */}
                  <td className="csv-col-date">{fdate(t.date)}</td>

                  {/* descrição */}
                  <td className="csv-col-desc">
                    <div style={{ fontWeight: 600, fontSize: 12 }}>{t.description}</div>
                    {t.installments && (
                      <div className="txxs tmuted">{t.installmentCurrent}/{t.installments}x</div>
                    )}
                    {t.notes && <div className="txxs tmuted" style={{ fontStyle: 'italic' }}>{t.notes}</div>}
                  </td>

                  {/* categoria */}
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <span style={{ fontSize: 15, marginRight: 5 }}>{cat?.icon}</span>
                    <span style={{ fontSize: 11 }}>{cat?.name || '—'}</span>
                  </td>

                  {/* membro */}
                  {show('member') && (
                    <td style={{ whiteSpace: 'nowrap', fontSize: 12 }}>
                      {mem ? <>{mem.emoji} {mem.name}</> : <span className="tmuted">—</span>}
                    </td>
                  )}

                  {/* conta */}
                  {show('account') && (
                    <td style={{ fontSize: 11 }}>
                      {acc ? <span style={{ color: 'var(--muted)' }}>🏦 {acc.name}</span> : <span className="tmuted">—</span>}
                    </td>
                  )}

                  {/* cartão */}
                  {show('card') && (
                    <td style={{ fontSize: 11 }}>
                      {crd ? <span style={{ color: 'var(--muted)' }}>💳 {crd.name}</span> : <span className="tmuted">—</span>}
                    </td>
                  )}

                  {/* recorrência */}
                  {show('recurrence') && (
                    <td>{REC[t.recurrence] ?? REC.none}</td>
                  )}

                  {/* status */}
                  <td>{STATUS[t.status] ?? <span className="badge badge-muted">{t.status}</span>}</td>

                  {/* valor */}
                  <td className="csv-col-val" style={{
                    color: isIncome ? 'var(--green)' : isExpense ? 'var(--red)' : 'var(--text)',
                  }}>
                    {isIncome ? '+' : isExpense ? '−' : ''}{R$(t.amount)}
                  </td>

                  {/* ações */}
                  <td className="csv-col-act">
                    <div style={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
                      {onEdit && (
                        <button className="btn-icon" style={{ padding: '3px 7px', fontSize: 12 }}
                          onClick={() => setEditingTx(t)} title="Editar">✏️</button>
                      )}
                      {onDelete && (
                        <button className="btn-icon" style={{ padding: '3px 7px', fontSize: 12 }}
                          onClick={() => setConfirmDel(t)} title="Excluir">🗑️</button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* summary footer bar */}
      {sorted.length > 0 && (
        <div className="csv-footer">
          <span className="tmuted txxs">{sorted.length} linha(s)</span>
          <span className="csv-footer-sep" />
          <span className="txxs">
            Receitas: <strong className="tgreen">+{R$(totalIn)}</strong>
          </span>
          <span className="csv-footer-sep" />
          <span className="txxs">
            Despesas: <strong className="tred">−{R$(totalOut)}</strong>
          </span>
          <span className="csv-footer-sep" />
          <span className="txxs">
            Saldo: <strong style={{ color: balance >= 0 ? 'var(--green)' : 'var(--red)' }}>
              {balance >= 0 ? '+' : '−'}{R$(Math.abs(balance))}
            </strong>
          </span>
        </div>
      )}

      {/* ── edit modal ───────────────────────────────────────── */}
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

      {/* ── delete confirmation modal ─────────────────────────── */}
      {confirmDel && (
        <Modal title="Confirmar Exclusão" onClose={() => setConfirmDel(null)}>
          <p style={{ marginBottom: 8, fontSize: 13, color: 'var(--muted)' }}>
            Deseja excluir este lançamento?
          </p>
          <div style={{
            background: 'var(--surface2)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '12px 16px', marginBottom: 20,
          }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{confirmDel.description}</div>
            <div className="txxs tmuted" style={{ marginTop: 4 }}>
              {fdate(confirmDel.date)} · {R$(confirmDel.amount)}
            </div>
          </div>
          <div className="flex jce gap2" style={{ gap: 8 }}>
            <button className="btn btn-secondary" onClick={() => setConfirmDel(null)}>Cancelar</button>
            <button className="btn btn-danger" onClick={() => { onDelete(confirmDel.id); setConfirmDel(null); }}>
              🗑️ Excluir
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
