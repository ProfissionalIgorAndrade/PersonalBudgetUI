import React, { useState, useEffect } from 'react';
import { uid } from '../../../core/utils/format';
import CurrencyInput from '../../shared/components/CurrencyInput';
import DateInput from '../../shared/components/DateInput';
import { validateCreateTransactionDraft, resolveCreatePaymentArm } from '../../../application/createTransactionPayload';

const emptyDraft = (members) => ({
  description: '',
  amount: '',
  date: new Date().toISOString().slice(0, 10),
  type: 'expense',
  categoryId: '',
  memberId: members[0]?.id || '',
  accountId: '', cardId: '',
  originAccountId: '', destinationAccountId: '',
  recurrence: 'variable', status: 'paid',
  installments: '', repeatCount: '',
  expirationDate: '',
  installmentTitle: '',
  totalInstallmentAmount: '',
  notes: '',
});

export default function TxForm({ tx, cats, members, accounts, cards, onSave, onClose }) {
  const isEdit = Boolean(tx?.id);
  const [submitError, setSubmitError] = useState('');
  const [f, setF] = useState(tx || emptyDraft(members));

  useEffect(() => {
    if (isEdit || f.type === 'transfer') return;
    setF(p => {
      const armNow = resolveCreatePaymentArm(p);
      if (armNow === 'creditCard') {
        if (!['variable', 'installment'].includes(p.recurrence))
          return { ...p, recurrence: 'variable' };
        return p;
      }
      const validForAccount = ['variable', 'fixed', ...(p.type === 'expense' ? ['installment'] : [])];
      if (!validForAccount.includes(p.recurrence))
        return { ...p, recurrence: 'variable' };
      return p;
    });
  }, [isEdit, f.type, f.accountId, f.cardId]);

  const set = (k, v) => setF(p => ({ ...p, [k]: v }));

  const onAccountChange = (accountId) => {
    setF(p => ({
      ...p,
      accountId,
      cardId: accountId ? '' : p.cardId,
    }));
  };

  const onCardChange = (cardId) => {
    setF(p => ({
      ...p,
      cardId,
      accountId: cardId ? '' : p.accountId,
      ...(cardId
        ? {
            status: 'pending',
            recurrence: p.recurrence === 'fixed' ? 'variable' : p.recurrence,
          }
        : {}),
    }));
  };

  const filteredCats = cats.filter(c => (f.type === 'income' ? c.type === 'income' : c.type === 'expense'));
  const arm = resolveCreatePaymentArm(f);
  const cardLocked = arm === 'creditCard';

  const recurrenceOpts = () => {
    if (f.type === 'transfer') return [];
    if (arm === 'creditCard')
      return [
        { value: 'variable', label: 'Variável' },
        { value: 'installment', label: 'Parcelada' },
      ];
    const opts = [
      { value: 'variable', label: 'Variável' },
      { value: 'fixed', label: 'Fixa' },
    ];
    if (f.type === 'expense') opts.push({ value: 'installment', label: 'Parcelada' });
    return opts;
  };

  const opts = recurrenceOpts();

  const onSubmit = (e) => {
    e.preventDefault();
    setSubmitError('');
    if (!isEdit) {
      const errs = validateCreateTransactionDraft(f);
      if (errs.length) {
        setSubmitError(errs.join(' · '));
        return;
      }
    }

    let amountNum;
    const parseVal = val => {
      const raw = typeof val === 'number' ? val : Number(String(val ?? '').replace(/\s/g, '').replace(',', '.'));
      return Number.isFinite(raw) ? raw : 0;
    };

    amountNum = parseVal(f.amount);

    onSave({ ...f, id: f.id || uid(), amount: amountNum });
    if (!isEdit) {
      setSubmitError('');
      setF(emptyDraft(members));
    }
  };

  const showCategoryDateRow = f.type !== 'transfer';
  const showAccountCardRow = f.type !== 'transfer';
  const isInstallment = f.recurrence === 'installment' && f.type === 'expense';
  const showFixedExtras = f.recurrence === 'fixed' && f.type !== 'transfer' && !isInstallment;
  const showInstallmentExtras = isInstallment;
  const cardDisabledByFixed = f.recurrence === 'fixed' && f.type !== 'transfer';

  return (
    <form onSubmit={onSubmit}>
      {submitError && (
        <div style={{
          marginBottom: 14,
          padding: '10px 12px',
          borderRadius: 10,
          background: 'color-mix(in srgb, var(--red) 18%, transparent)',
          border: '1px solid color-mix(in srgb, var(--red) 35%, transparent)',
          color: 'var(--text)',
          fontSize: 13,
          lineHeight: 1.45,
        }}>
          {submitError}
        </div>
      )}

      {/* 1. Tipo + Categoria */}
      <div className="grid-2">
        <div className="form-group">
          <label className="form-label">Tipo</label>
          <select
            className="form-select"
            value={f.type}
            onChange={e => {
              const next = e.target.value;
              setF(p => ({
                ...p,
                type: next,
                ...(next === 'transfer'
                  ? { recurrence: 'variable', cardId: '', accountId: '' }
                  : {}),
              }));
            }}
          >
            <option value="expense">💸 Despesa</option>
            <option value="income">💰 Receita</option>
            <option value="transfer">🔄 Transferência</option>
          </select>
        </div>
        {f.type !== 'transfer' && (
          <div className="form-group">
            <label className="form-label">Categoria</label>
            <select className="form-select" value={f.categoryId} onChange={e => set('categoryId', e.target.value)}>
              <option value="">— Nenhuma —</option>
              {filteredCats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* 2. Título */}
      <div className="form-group">
        <label className="form-label">Título *</label>
        <input className="form-input" required value={f.description} onChange={e => set('description', e.target.value)} placeholder="Ex: Supermercado, Salário..." />
      </div>

      {/* 3. Valor + Data */}
      <div className="grid-2">
        <div className="form-group">
          <label className="form-label">
            {isInstallment ? 'Valor da parcela (R$) *' : 'Valor (R$) *'}
          </label>
          <CurrencyInput required value={f.amount} onChange={v => set('amount', v)} />
        </div>
        <div className="form-group">
          <label className="form-label">Data *</label>
          <DateInput required value={f.date} onChange={v => set('date', v)} />
        </div>
      </div>

      {/* Transferência: Conta Origem + Conta Destino */}
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

      {/* 4. Recorrência */}
      {f.type !== 'transfer' && opts.length > 0 && (
        <div className="form-group">
          <label className="form-label">Recorrência</label>
          <select
            className="form-select"
            value={opts.some(o => o.value === f.recurrence) ? f.recurrence : opts[0].value}
            onChange={e => {
              const v = e.target.value;
              setF(p => ({
                ...p,
                recurrence: v,
                ...(v === 'installment' ? { accountId: '' } : {}),
                ...(v === 'fixed' ? { cardId: '' } : {}),
              }));
            }}
          >
            {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      )}

      {/* 5. Número de meses (Fixa) ou Quantidade de parcelas (Parcelada) */}
      {showFixedExtras && (
        <div className="form-group">
          <label className="form-label">Número de meses *</label>
          <input className="form-input" type="number" min="2" max="120" required placeholder="Ex: 12" value={f.repeatCount} onChange={e => set('repeatCount', e.target.value)} />
        </div>
      )}
      {showInstallmentExtras && (
        <div className="form-group">
          <label className="form-label">Quantidade de parcelas *</label>
          <input className="form-input" type="number" min="2" max="60" required placeholder="Ex: 12" value={f.installments} onChange={e => set('installments', e.target.value)} />
        </div>
      )}

      {/* 6. Conta + Cartão */}
      {showAccountCardRow && (
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label" style={isInstallment ? { opacity: 0.45 } : {}}>
              Conta corrente {cardDisabledByFixed ? '*' : ''}
            </label>
            <select
              className="form-select"
              required={cardDisabledByFixed}
              disabled={isInstallment}
              value={f.accountId}
              onChange={e => onAccountChange(e.target.value)}
              style={isInstallment ? { opacity: 0.45, cursor: 'not-allowed' } : {}}
            >
              <option value="">— Nenhuma —</option>
              {accounts.map(a => <option key={a.id} value={a.id}>🏦 {a.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" style={cardDisabledByFixed ? { opacity: 0.45 } : {}}>
              Cartão de crédito {isInstallment ? '*' : ''}
            </label>
            <select
              className="form-select"
              required={isInstallment}
              disabled={cardDisabledByFixed}
              value={f.cardId}
              onChange={e => onCardChange(e.target.value)}
              style={cardDisabledByFixed ? { opacity: 0.45, cursor: 'not-allowed' } : {}}
            >
              <option value="">— Nenhum —</option>
              {cards.map(c => <option key={c.id} value={c.id}>💳 {c.name}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* 7. Status */}
      {f.type !== 'transfer' && (
        <div className="form-group">
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            Status
            {cardLocked && (
              <span style={{ fontSize: 10, color: 'var(--muted)', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: '1px 7px', fontWeight: 600 }}>
                🔒 Pendente para cartão
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
      )}

      {/* 8. Membro */}
      <div className="form-group">
        <label className="form-label">Membro</label>
        <select className="form-select" value={f.memberId} onChange={e => set('memberId', e.target.value)}>
          {members.map(m => <option key={m.id} value={m.id}>{m.emoji} {m.name}</option>)}
        </select>
      </div>

      {/* 9. Observações */}
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
