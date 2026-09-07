import React, { useState, useMemo } from 'react';
import Modal from '../ui/Modal';
import MonthSelector from '../ui/MonthSelector';
import TxForm from './TxForm';
import TxTable from './TxTable';

export default function Transactions({ data, onAdd, onEdit, onDelete, activeMonth, setActiveMonth }) {
  const { transactions, categories, members, accounts, cards } = data;
  const [newModal, setNewModal] = useState(false);
  const [filter, setFilter] = useState({
    type: 'all', memberId: 'all', recurrence: 'all', search: '',
  });

  const set = k => e => setFilter(f => ({ ...f, [k]: e.target.value }));

  const filtered = useMemo(() => transactions.filter(t => {
    if (activeMonth && !t.date?.startsWith(activeMonth)) return false;
    if (filter.type !== 'all' && t.type !== filter.type) return false;
    if (filter.memberId !== 'all' && t.memberId !== filter.memberId) return false;
    if (filter.recurrence !== 'all' && t.recurrence !== filter.recurrence) return false;
    if (filter.search && !t.description?.toLowerCase().includes(filter.search.toLowerCase())) return false;
    return true;
  }), [transactions, filter, activeMonth]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Lançamentos</h1>
          <p className="page-sub">{filtered.length} de {transactions.length} lançamentos</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <MonthSelector month={activeMonth} onChange={setActiveMonth} />
          <button className="btn btn-primary" onClick={() => setNewModal(true)}>+ Novo Lançamento</button>
        </div>
      </div>

      {/* filter bar */}
      <div className="card mb4" style={{ marginBottom: 14, padding: 14 }}>
        <div className="flex gap3 fw" style={{ gap: 10, flexWrap: 'wrap' }}>
          <input
            className="form-input f1" style={{ minWidth: 160 }}
            placeholder="🔍 Buscar descrição…"
            value={filter.search} onChange={set('search')}
          />
          <select className="form-select" style={{ width: 145 }} value={filter.type} onChange={set('type')}>
            <option value="all">Todos os tipos</option>
            <option value="income">Receitas</option>
            <option value="expense">Despesas</option>
            <option value="transfer">Transferências</option>
          </select>
          <select className="form-select" style={{ width: 150 }} value={filter.memberId} onChange={set('memberId')}>
            <option value="all">Todos os membros</option>
            {members.map(m => <option key={m.id} value={m.id}>{m.emoji} {m.name}</option>)}
          </select>
          <select className="form-select" style={{ width: 150 }} value={filter.recurrence} onChange={set('recurrence')}>
            <option value="all">Todas recorrências</option>
            <option value="fixed">Fixo</option>
            <option value="variable">Variável</option>
            <option value="installment">Parcelado</option>
          </select>
        </div>
      </div>

      {/* table */}
      <div className="card">
        <TxTable
          rows={filtered}
          categories={categories}
          members={members}
          accounts={accounts}
          cards={cards}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </div>

      {/* new transaction modal */}
      {newModal && (
        <Modal title="Novo Lançamento" onClose={() => setNewModal(false)} wide>
          <TxForm
            tx={null}
            cats={categories}
            members={members}
            accounts={accounts}
            cards={cards}
            onSave={tx => { onAdd(tx); setNewModal(false); }}
            onClose={() => setNewModal(false)}
          />
        </Modal>
      )}
    </div>
  );
}
