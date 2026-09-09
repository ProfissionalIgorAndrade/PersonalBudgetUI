import React, { useState, useEffect } from 'react';
import { uid } from '../../../core/utils/format';
import { accountLabel } from '../../../application/mappers/index';
import CurrencyInput from '../../shared/components/CurrencyInput';
import DateInput from '../../shared/components/DateInput';
import { validateCreateTransactionDraft, resolveCreatePaymentArm } from '../../../application/createTransactionPayload';
import { useLocalStorage } from '../../../core/hooks/useLocalStorage';

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

// Campos que persistem entre lançamentos (excluídos: description, amount, categoryId, notes, status, installmentTitle, totalInstallmentAmount)
const STICKY_KEYS = [
  'type', 'memberId', 'accountId', 'cardId',
  'originAccountId', 'destinationAccountId',
  'recurrence', 'date',
  'installments', 'repeatCount', 'expirationDate',
  'statementMonth', 'statementYear',
];

const emptyDraft = (members) => {
  const now = new Date();
  return {
    description: '',
    amount: '',
    date: now.toISOString().slice(0, 10),
    type: 'expense',
    categoryId: '',
    memberId: members[0]?.id || '',
    accountId: '', cardId: '',
    originAccountId: '', destinationAccountId: '',
    // Um lançamento novo nasce pendente. 'paid' presumia que a pessoa já
    // pagou no momento do cadastro, o que raramente é verdade e fazia o
    // registro entrar como concluído sem ninguém escolher isso.
    recurrence: 'variable', status: 'pending',
    installments: '', repeatCount: '',
    expirationDate: '',
    installmentTitle: '',
    totalInstallmentAmount: '',
    statementMonth: now.getMonth() + 1,
    statementYear: now.getFullYear(),
    notes: '',
  };
};

const buildDraft = (members, sticky) => {
  const base = emptyDraft(members);
  if (!sticky) return base;
  const overrides = {};
  STICKY_KEYS.forEach(k => { if (sticky[k] !== undefined) overrides[k] = sticky[k]; });
  return { ...base, ...overrides };
};

const PAYMENT_LABELS = {
  CreditCard: 'Cartão de crédito',
  Transfer: 'Transferência',
  Debit: 'Débito',
  Cash: 'Dinheiro',
  Pix: 'Pix',
};

export default function TxForm({ tx, cats, members, accounts, cards, onSave, onClose, readOnly = false }) {
  const isEdit = Boolean(tx?.id);
  const [submitError, setSubmitError] = useState('');
  const [stickyConfig, setStickyConfig] = useLocalStorage('pb_tx_last_config', null);
  const [f, setF] = useState(() => tx ? { recurrenceEditMode: 1, ...tx } : buildDraft(members, stickyConfig));

  useEffect(() => {
    if (readOnly || isEdit || f.type === 'transfer') return;
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
    if (readOnly) { e.preventDefault(); return; }
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
      const nextSticky = Object.fromEntries(STICKY_KEYS.map(k => [k, f[k]]));
      setStickyConfig(nextSticky);
      setSubmitError('');
      setF(buildDraft(members, nextSticky));
    }
  };

  const thisYear = new Date().getFullYear();
  const statementYearOpts = [thisYear - 1, thisYear, thisYear + 1, thisYear + 2];

  const showCategoryDateRow = f.type !== 'transfer';
  const showAccountCardRow = f.type !== 'transfer';
  const isInstallment = f.recurrence === 'installment' && f.type === 'expense';
  const showFixedExtras = !isEdit && f.recurrence === 'fixed' && f.type !== 'transfer' && !isInstallment;
  const showInstallmentExtras = !isEdit && isInstallment;
  const cardDisabledByFixed = f.recurrence === 'fixed' && f.type !== 'transfer';
  const showRecurrenceScope = isEdit && (f.recurrence === 'fixed' || f.recurrence === 'installment');

  return (
    <form onSubmit={onSubmit}>
      {/* A disabled fieldset neutralises every descendant control at once, so a
          field added later is read-only by default rather than by omission. */}
      <fieldset disabled={readOnly} style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}>
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

      {readOnly && (
        <div style={{
          marginBottom: 14, padding: '10px 12px', borderRadius: 10,
          background: 'var(--surface2)', border: '1px solid var(--border)',
          fontSize: 12, lineHeight: 1.6, color: 'var(--muted)',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '2px 16px',
        }}>
          <span><strong>Pagamento:</strong> {PAYMENT_LABELS[f.paymentMethod] ?? f.paymentMethod ?? '—'}</span>
          {f.statementMonth && f.statementYear && (
            <span><strong>Fatura:</strong> {String(f.statementMonth).padStart(2, '0')}/{f.statementYear}</span>
          )}
          {f.recurrenceId && (
            <span><strong>Grupo de recorrência:</strong> {String(f.recurrenceId).slice(0, 8)}</span>
          )}
          <span><strong>ID:</strong> {String(f.id ?? '').slice(0, 8)}</span>
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
              {accounts.map(a => <option key={a.id} value={a.id}>{accountLabel(a, members)}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Conta Destino *</label>
            <select className="form-select" required value={f.destinationAccountId} onChange={e => set('destinationAccountId', e.target.value)}>
              <option value="">— Selecione —</option>
              {accounts.filter(a => a.id !== f.originAccountId).map(a => <option key={a.id} value={a.id}>{accountLabel(a, members)}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* 4. Recorrência */}
      {!isEdit && f.type !== 'transfer' && opts.length > 0 && (
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
            <label className="form-label" style={(isInstallment || (isEdit && cardLocked)) ? { opacity: 0.45 } : {}}>
              Conta corrente {cardDisabledByFixed ? '*' : ''}
            </label>
            <select
              className="form-select"
              required={cardDisabledByFixed}
              disabled={isInstallment || (isEdit && cardLocked)}
              value={f.accountId}
              onChange={e => onAccountChange(e.target.value)}
              style={(isInstallment || (isEdit && cardLocked)) ? { opacity: 0.45, cursor: 'not-allowed' } : {}}
            >
              <option value="">— Nenhuma —</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{accountLabel(a, members)}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" style={(cardDisabledByFixed || (isEdit && cardLocked)) ? { opacity: 0.45 } : {}}>
              Cartão de crédito {isInstallment ? '*' : ''}
              {isEdit && cardLocked && (
                <span style={{ fontSize: 10, color: 'var(--muted)', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: '1px 7px', fontWeight: 600, marginLeft: 6 }}>
                  🔒
                </span>
              )}
            </label>
            <select
              className="form-select"
              required={isInstallment}
              disabled={cardDisabledByFixed || (isEdit && cardLocked)}
              value={f.cardId}
              onChange={e => onCardChange(e.target.value)}
              style={(cardDisabledByFixed || (isEdit && cardLocked)) ? { opacity: 0.55, cursor: 'not-allowed' } : {}}
            >
              <option value="">— Nenhum —</option>
              {cards.map(c => <option key={c.id} value={c.id}>💳 {c.name}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* 7. Fatura (somente cartão de crédito) */}
      {cardLocked && (
        <div className="form-group">
          <label className="form-label">
            Fatura *
            {isEdit && (
              <span style={{ fontSize: 10, color: 'var(--muted)', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: '1px 7px', fontWeight: 600, marginLeft: 6 }}>
                altere para mover de fatura
              </span>
            )}
          </label>
          <div className="grid-2">
            <select
              className="form-select"
              value={f.statementMonth || ''}
              onChange={e => set('statementMonth', Number(e.target.value))}
            >
              <option value="">— Mês —</option>
              {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
            </select>
            <select
              className="form-select"
              value={f.statementYear || ''}
              onChange={e => set('statementYear', Number(e.target.value))}
            >
              <option value="">— Ano —</option>
              {statementYearOpts.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* 8. Status */}
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

      {/* Escopo da edição — para fixas e parceladas em modo edição */}
      {showRecurrenceScope && (
        <div className="form-group" style={{ marginTop: 8 }}>
          <label className="form-label">Aplicar alteração em</label>
          <select
            className="form-select"
            value={f.recurrenceEditMode ?? 1}
            onChange={e => set('recurrenceEditMode', Number(e.target.value))}
          >
            <option value={1}>Este lançamento</option>
            <option value={2}>Este lançamento e futuros</option>
            <option value={3}>Todos os lançamentos</option>
          </select>
        </div>
      )}

      </fieldset>

      <div className="flex jce gap2" style={{ gap: 8, marginTop: 8 }}>
        {readOnly ? (
          <button type="button" className="btn btn-primary" onClick={onClose}>Fechar</button>
        ) : (
          <>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary">💾 Salvar</button>
          </>
        )}
      </div>
    </form>
  );
}
