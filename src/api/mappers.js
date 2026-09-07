import { parseMoneyAmount } from '../core/utils/money';
import { buildCreateTransactionPayload } from '../application/createTransactionPayload';

/* ─── Enum conversions ──────────────────────────────────────── */
export const TYPE_TO_API    = { income: 'Income', expense: 'Expense' };
export const TYPE_FROM_API  = { Income: 'income', Expense: 'expense' };

export const FREQ_TO_API    = { fixed: 'Fixed', variable: 'Variable', installment: 'Installments' };
export const FREQ_FROM_API  = { Fixed: 'fixed', Variable: 'variable', Installments: 'installment' };

export const STATUS_TO_API  = { paid: 'Completed', pending: 'Pending', cancelled: 'Cancelled' };
export const STATUS_FROM_API = { Completed: 'paid', Pending: 'pending', Cancelled: 'cancelled', Simulated: 'pending' };

export const CAT_TYPE_TO_API   = { income: 'Income', expense: 'Expense' };
export const CAT_TYPE_FROM_API = { Income: 'income', Expense: 'expense' };

/* ─── Bank metadata ─────────────────────────────────────────── */
export const BANK_LABELS = {
  Itau: 'Itaú', Nubank: 'Nubank', Inter: 'Inter',
  Santander: 'Santander', Bradesco: 'Bradesco', Caixa: 'Caixa',
};

export const BANK_COLORS = {
  Itau: '#f47321', Nubank: '#8a05be', Inter: '#ff7a00',
  Santander: '#cc0000', Bradesco: '#cc092f', Caixa: '#006f3d',
};

/* ─── Normalizers ───────────────────────────────────────────── */
export function normalizeAccount(a) {
  return {
    id:        a.id,
    name:      `${BANK_LABELS[a.bank] || a.bank}${a.number ? ` ···${String(a.number).slice(-4)}` : ''}`,
    bank:      a.bank,
    agency:    a.agency || '',
    number:    a.number || '',
    balance:   parseMoneyAmount(a.balance ?? a.Balance),
    color:     BANK_COLORS[a.bank] || '#2dd4bf',
    type:      'checking',
    isActive:  a.isActive !== false,
  };
}

export function normalizeCategory(c) {
  return {
    id:    c.id,
    name:  c.name,
    type:  CAT_TYPE_FROM_API[c.type] || 'expense',
    icon:  c.icon  || c.Icon  || '📦',
    color: c.color || c.Color || '#2dd4bf',
  };
}

export function normalizeProfile(p) {
  return {
    id:     p.id,
    name:   p.displayName,
    emoji:  p.emoji ?? p.Emoji ?? '👤',
    color:  p.color ?? p.Color ?? '#2dd4bf',
    type:   p.kind  || 'other',
    userId: p.userId || null,
  };
}

export { normalizeCard } from '../application/mappers/index';

export function normalizeTransaction(t) {
  const isTransfer = (t.paymentMethod ?? t.PaymentMethod) === 'Transfer';
  const dateStr    = t.date
    ? (typeof t.date === 'string' ? t.date.slice(0, 10) : new Date(t.date).toISOString().slice(0, 10))
    : '';
  return {
    id:             t.id               ?? t.Id,
    description:    t.description      ?? t.Description      ?? '',
    amount:         t.amount           ?? t.Amount           ?? 0,
    date:           dateStr,
    type:           isTransfer ? 'transfer' : (TYPE_FROM_API[t.type ?? t.Type] || 'expense'),
    status:         STATUS_FROM_API[t.status ?? t.Status] || 'pending',
    recurrence:     FREQ_FROM_API[t.frequency ?? t.Frequency] || 'variable',
    categoryId:     t.categoryId           ?? t.CategoryId           ?? '',
    memberId:       t.attributionProfileId  ?? t.AttributionProfileId ?? '',
    accountId:      t.accountId            ?? t.AccountId            ?? '',
    cardId:         t.creditCardId         ?? t.CreditCardId         ?? '',
    transferId:     t.transferId           ?? t.TransferId           ?? null,
    paymentMethod:  t.paymentMethod        ?? t.PaymentMethod,
    statementMonth: t.statementMonth       ?? t.StatementMonth       ?? null,
    statementYear:  t.statementYear        ?? t.StatementYear        ?? null,
    notes:          '',
  };
}

/* ─── Form → API body ───────────────────────────────────────── */
export function txToApi(f) {
  return buildCreateTransactionPayload(f);
}
