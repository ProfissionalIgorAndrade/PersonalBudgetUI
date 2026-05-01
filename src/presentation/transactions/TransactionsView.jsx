import React, { useState, useMemo } from 'react';
import Modal from '../shared/components/Modal';
import MonthSelector from '../shared/components/MonthSelector';
import TxForm from './components/TxForm';
import TxTable from './components/TxTable';

const EMPTY = { type: 'all', memberId: 'all', recurrence: 'all', status: 'all', cardId: 'all', accountId: 'all', categoryId: 'all', search: '' };

export default function TransactionsView({ data, onAdd, onEdit, onDelete, activeMonth, setActiveMonth }) {
  const { transactions, categories, members, accounts, cards } = data;
  const [newModal, setNewModal] = useState(false);
  const [filter, setFilter]     = useState(EMPTY);

  const set = k => e => setFilter(f => ({ ...f, [k]: e.target.value }));
  const clearFilters = () => setFilter(EMPTY);

  const isFiltered = Object.entries(filter).some(([k, v]) => v !== (k === 'search' ? '' : 'all'));

  const filtered = useMemo(() => transactions.filter(t => {
    if (activeMonth && !t.date?.startsWith(activeMonth)) return false;
    if (filter.type       !== 'all' && t.type       !== filter.type)       return false;
    if (filter.memberId   !== 'all' && t.memberId   !== filter.memberId)   return false;
    if (filter.recurrence !== 'all' && t.recurrence !== filter.recurrence) return false;
    if (filter.status     !== 'all' && t.status     !== filter.status)     return false;
    if (filter.cardId     !== 'all' && t.cardId     !== filter.cardId)     return false;
    if (filter.accountId  !== 'all' && t.accountId  !== filter.accountId)  return false;
    if (filter.categoryId !== 'all' && t.categoryId !== filter.categoryId) return false;
    if (filter.search && !t.description?.toLowerCase().includes(filter.search.toLowerCase())) return false;
    return true;
  }), [transactions, filter, activeMonth]);

  const sel = (style = {}) => ({ ...{ width: 148 }, ...style });

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

      <div className="card mb4" style={{ marginBottom: 14, padding: 14 }}>
        {/* Row 1: search only */}
        <div style={{ marginBottom: 8 }}>
          <input
            className="form-input"
            style={{ width: '100%' }}
            placeholder="🔍 Buscar descrição…"
            value={filter.search}
            onChange={set('search')}
          />
        </div>

        {/* Row 2: all dropdown filters + clear */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <select className="form-select" style={sel()} value={filter.type} onChange={set('type')}>
            <option value="all">Todos os tipos</option>
            <option value="income">💰 Receitas</option>
            <option value="expense">💸 Despesas</option>
            <option value="transfer">🔄 Transferências</option>
          </select>
          <select className="form-select" style={sel()} value={filter.memberId} onChange={set('memberId')}>
            <option value="all">Todos os membros</option>
            {members.map(m => <option key={m.id} value={m.id}>{m.emoji} {m.name}</option>)}
          </select>
          <select className="form-select" style={sel()} value={filter.recurrence} onChange={set('recurrence')}>
            <option value="all">Todas recorrências</option>
            <option value="fixed">🔄 Fixo</option>
            <option value="variable">📊 Variável</option>
            <option value="installment">📦 Parcelado</option>
          </select>
          <select className="form-select" style={sel()} value={filter.status} onChange={set('status')}>
            <option value="all">Todos os status</option>
            <option value="paid">✅ Pago</option>
            <option value="pending">⏳ Pendente</option>
            <option value="cancelled">❌ Cancelado</option>
          </select>
          <select className="form-select" style={sel()} value={filter.accountId} onChange={set('accountId')}>
            <option value="all">Todas as contas</option>
            {accounts.map(a => <option key={a.id} value={a.id}>🏦 {a.name}</option>)}
          </select>
          <select className="form-select" style={sel()} value={filter.cardId} onChange={set('cardId')}>
            <option value="all">Todos os cartões</option>
            {cards.map(c => <option key={c.id} value={c.id}>💳 {c.name}</option>)}
          </select>
          <select className="form-select" style={sel()} value={filter.categoryId} onChange={set('categoryId')}>
            <option value="all">Todas as categorias</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>

          {isFiltered && (
            <button
              className="btn btn-secondary"
              style={{ padding: '7px 14px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--red)', borderColor: 'rgba(255,85,85,0.35)', whiteSpace: 'nowrap' }}
              onClick={clearFilters}
              title="Limpar filtros"
            >
              ✕ Limpar filtros
            </button>
          )}
        </div>
      </div>

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
