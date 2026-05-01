import React, { useState } from 'react';
import { uid } from '../../utils/format';
import CurrencyInput from '../ui/CurrencyInput';

export default function TxForm({ tx, cats, members, accounts, cards, onSave, onClose }) {
  const [f, setF] = useState(tx || {
    description: '', amount: '',
    date: new Date().toISOString().slice(0, 10),
    type: 'expense',
    categoryId: cats.find(c => c.type === 'expense')?.id || '',
    memberId: members[0]?.id || '',
    accountId: '', cardId: '',
    originAccountId: '', destinationAccountId: '',
    recurrence: 'variable', status: 'paid',
    installments: '', installmentCurrent: '1', notes: '',
  });

  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const filteredCats = cats.filter(c => f.type === 'income' ? c.type === 'income' : c.type === 'expense');

  return (
    <form onSubmit={e => { e.preventDefault(); onSave({ ...f, id: f.id || uid(), amount: Number(f.amount) }); }}>
      <div className="grid-2">
        <div className="form-group" style={{ gridColumn: '1/-1' }}>
          <label className="form-label">Descrição *</label>
          <input className="form-input" required value={f.description} onChange={e => set('description', e.target.value)} placeholder="Ex: Supermercado, Salário..." />
        </div>
      </div>

      <div className="grid-2">
        <div className="form-group">
          <label className="form-label">Tipo</label>
          <select className="form-select" value={f.type} onChange={e => set('type', e.target.value)}>
            <option value="expense">💸 Despesa</option>
            <option value="income">💰 Receita</option>
            <option value="transfer">🔄 Transferência</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Valor (R$) *</label>
          <CurrencyInput required value={f.amount} onChange={v => set('amount', v)} />
        </div>
      </div>

      {/* Date + Category (non-transfer) OR Date alone (transfer) */}
      {f.type !== 'transfer' ? (
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Data *</label>
            <input className="form-input" type="date" required value={f.date} onChange={e => set('date', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Categoria</label>
            <select className="form-select" value={f.categoryId} onChange={e => set('categoryId', e.target.value)}>
              {filteredCats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </div>
        </div>
      ) : (
        <div className="form-group">
          <label className="form-label">Data *</label>
          <input className="form-input" type="date" required value={f.date} onChange={e => set('date', e.target.value)} />
        </div>
      )}

      {/* Origin / Destination — transfer only */}
      {f.type === 'transfer' && (
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Conta Origem *</label>
            <select className="form-select" required value={f.originAccountId} onChange={e => set('originAccountId', e.target.value)}>
              <option value="">— Selecione —</option>
              {accounts.map(a => <option key={a.id} value={a.id}>🏦 {a.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Conta Destino *</label>
            <select className="form-select" required value={f.destinationAccountId} onChange={e => set('destinationAccountId', e.target.value)}>
              <option value="">— Selecione —</option>
              {accounts.filter(a => a.id !== f.originAccountId).map(a => <option key={a.id} value={a.id}>🏦 {a.name}</option>)}
            </select>
          </div>
        </div>
      )}

      <div className="grid-2">
        <div className="form-group">
          <label className="form-label">Membro</label>
          <select className="form-select" value={f.memberId} onChange={e => set('memberId', e.target.value)}>
            {members.map(m => <option key={m.id} value={m.id}>{m.emoji} {m.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Status</label>
          <select className="form-select" value={f.status} onChange={e => set('status', e.target.value)}>
            <option value="paid">✅ Pago/Recebido</option>
            <option value="pending">⏳ Pendente</option>
            <option value="cancelled">❌ Cancelado</option>
          </select>
        </div>
      </div>

      <div className="grid-2">
        <div className="form-group">
          <label className="form-label">Recorrência</label>
          <select className="form-select" value={f.recurrence} onChange={e => set('recurrence', e.target.value)}>
            <option value="fixed">🔄 Fixo (todo mês)</option>
            <option value="variable">📊 Variável</option>
            <option value="installment">📦 Parcelado</option>
          </select>
        </div>
        {f.recurrence === 'installment' && (
          <div className="form-group">
            <label className="form-label">Parcelas</label>
            <div className="flex gap2" style={{ gap: 6 }}>
              <input className="form-input" type="number" min="1" max="60" placeholder="Total" value={f.installments} onChange={e => set('installments', e.target.value)} />
              <input className="form-input" type="number" min="1" placeholder="Atual" value={f.installmentCurrent} onChange={e => set('installmentCurrent', e.target.value)} />
            </div>
          </div>
        )}
      </div>

      {f.type === 'expense' && (
        <div className="form-group">
          <label className="form-label">Cartão de Crédito</label>
          <select className="form-select" value={f.cardId} onChange={e => set('cardId', e.target.value)}>
            <option value="">— Nenhum —</option>
            {cards.map(c => <option key={c.id} value={c.id}>💳 {c.name}</option>)}
          </select>
        </div>
      )}

      {f.type !== 'transfer' && (
        <div className="form-group">
          <label className="form-label">Conta</label>
          <select className="form-select" value={f.accountId} onChange={e => set('accountId', e.target.value)}>
            <option value="">— Nenhuma —</option>
            {accounts.map(a => <option key={a.id} value={a.id}>🏦 {a.name}</option>)}
          </select>
        </div>
      )}

      <div className="form-group">
        <label className="form-label">Observações</label>
        <input className="form-input" value={f.notes} onChange={e => set('notes', e.target.value)} placeholder="Opcional..." />
      </div>

      <div className="flex jce gap2" style={{ gap: 8, marginTop: 8 }}>
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button type="submit" className="btn btn-primary">💾 Salvar</button>
      </div>
    </form>
  );
}
