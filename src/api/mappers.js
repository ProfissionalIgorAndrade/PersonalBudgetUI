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

/* ─── Visual side-table helpers (localStorage) ──────────────── */
function loadVisuals(key) {
  try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch { return {}; }
}
function saveVisual(key, id, data) {
  const v = loadVisuals(key);
  localStorage.setItem(key, JSON.stringify({ ...v, [id]: data }));
}
function removeVisual(key, id) {
  const v = loadVisuals(key);
  delete v[id];
  localStorage.setItem(key, JSON.stringify(v));
}

export const catVisuals    = { load: () => loadVisuals('pb_cat_visuals'),    save: (id, d) => saveVisual('pb_cat_visuals', id, d),    remove: (id) => removeVisual('pb_cat_visuals', id) };
export const memberVisuals = { load: () => loadVisuals('pb_member_visuals'), save: (id, d) => saveVisual('pb_member_visuals', id, d), remove: (id) => removeVisual('pb_member_visuals', id) };

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
  const v = catVisuals.load()[c.id] || {};
  return {
    id:    c.id,
    name:  c.name,
    type:  CAT_TYPE_FROM_API[c.type] || 'expense',
    icon:  v.icon  || '📦',
    color: v.color || '#2dd4bf',
  };
}

export function normalizeProfile(p) {
  const v = memberVisuals.load()[p.id] || {};
  return {
    id:     p.id,
    name:   p.displayName,
    emoji:  v.emoji || '👤',
    color:  v.color || '#2dd4bf',
    type:   p.kind  || 'other',
    userId: p.userId || null,
  };
}

export { normalizeCard } from '../application/mappers/index';

export function normalizeTransaction(t) {
  const isTransfer = t.paymentMethod === 'Transfer';
  const dateStr    = t.date
    ? (typeof t.date === 'string' ? t.date.slice(0, 10) : new Date(t.date).toISOString().slice(0, 10))
    : '';
  return {
    id:          t.id,
    description: t.description,
    amount:      t.amount,
    date:        dateStr,
    type:        isTransfer ? 'transfer' : (TYPE_FROM_API[t.type] || 'expense'),
    status:      STATUS_FROM_API[t.status] || 'pending',
    recurrence:  FREQ_FROM_API[t.frequency] || 'variable',
    categoryId:  t.categoryId   || '',
    memberId:    t.attributionProfileId || '',
    accountId:   t.accountId    || '',
    cardId:      t.creditCardId || '',
    transferId:  t.transferId   || null,
    paymentMethod: t.paymentMethod,
    notes:       '',
  };
}

/* ─── Form → API body ───────────────────────────────────────── */
export function txToApi(f) {
  return buildCreateTransactionPayload(f);
}
