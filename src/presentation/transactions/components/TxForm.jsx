import React, { useState } from 'react';
import { uid } from '../../../core/utils/format';
import CurrencyInput from '../../shared/components/CurrencyInput';

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

  const handleCardChange = v => {
    setF(p => ({ ...p, cardId: v, ...(v ? { status: 'pending' } : {}) }));
  };

  const filteredCats = cats.filter(c => f.type === 'income' ? c.type === 'income' : c.type === 'expense');
  const cardLocked   = !!f.cardId;

  return (
    <form onSubmit={e => { e.preventDefault(); onSave({ ...f, id: f.id || uid(), amount: Number(f.amount) }); }}>

      {/* Descrição */}
      <div className="form-group">
        <label className="form-label">Título *</label>
        <input className="form-input" required value={f.description} onChange={e => set('description', e.target.value)} placeholder="Ex: Supermercado, Salário..." />
      </div>

      {/* Tipo | Valor */}
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

      {/* Data | Categoria */}
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

      {/* Transfer: Conta Origem | Conta Destino */}
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

      {/* Recorrência — linha inteira */}
      <div className="form-group">
        <label className="form-label">Recorrência</label>
        <select className="form-select" value={f.recurrence} onChange={e => set('recurrence', e.target.value)}>
          <option value="fixed">🔄 Fixo (todo mês)</option>
          <option value="variable">📊 Variável</option>
          <option value="installment">📦 Parcelado</option>
        </select>
      </div>

      {/* Parcelas (apenas quando parcelado) */}
      {f.recurrence === 'installment' && (
        <div className="grid-2" style={{ marginTop: -6 }}>
          <div className="form-group">
            <label className="form-label">Total de parcelas</label>
            <input className="form-input" type="number" min="1" max="60" placeholder="Ex: 12" value={f.installments} onChange={e => set('installments', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Parcela atual</label>
            <input className="form-input" type="number" min="1" placeholder="Ex: 1" value={f.installmentCurrent} onChange={e => set('installmentCurrent', e.target.value)} />
          </div>
        </div>
      )}

      {/* Conta | Cartão */}
      {f.type !== 'transfer' && (
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Conta</label>
            <select className="form-select" value={f.accountId} onChange={e => set('accountId', e.target.value)}>
              <option value="">— Nenhuma —</option>
              {accounts.map(a => <option key={a.id} value={a.id}>🏦 {a.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Cartão de Crédito</label>
            <select className="form-select" value={f.cardId} onChange={e => handleCardChange(e.target.value)}>
              <option value="">— Nenhum —</option>
              {cards.map(c => <option key={c.id} value={c.id}>💳 {c.name}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Status */}
      <div className="form-group">
        <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          Status
          {cardLocked && (
            <span style={{ fontSize: 10, color: 'var(--muted)', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: '1px 7px', fontWeight: 600 }}>
              🔒 fixo para cartão
            </span>
          )}
        </label>
        <select
          className="form-select"
          value={cardLocked ? 'pending' : f.status}
          onChange={e => !cardLocked && set('status', e.target.value)}
          disabled={cardLocked}
          style={cardLocked ? { opacity: 0.55, cursor: 'not-allowed' } : {}}
        >
          <option value="paid">✅ Pago/Recebido</option>
          <option value="pending">⏳ Pendente</option>
          <option value="cancelled">❌ Cancelado</option>
        </select>
      </div>

      {/* Membro */}
      <div className="form-group">
        <label className="form-label">Membro</label>
        <select className="form-select" value={f.memberId} onChange={e => set('memberId', e.target.value)}>
          {members.map(m => <option key={m.id} value={m.id}>{m.emoji} {m.name}</option>)}
        </select>
      </div>

      {/* Observações */}
      <div className="form-group">
        <label className="form-label">Observações</label>
        <textarea
          className="form-input"
          rows={3}
          value={f.notes}
          onChange={e => set('notes', e.target.value)}
          placeholder="Opcional..."
          style={{ resize: 'none', lineHeight: 1.5 }}
        />
      </div>

      <div className="flex jce gap2" style={{ gap: 8, marginTop: 8 }}>
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
        <button type="submit" className="btn btn-primary">💾 Salvar</button>
      </div>
    </form>
  );
}
