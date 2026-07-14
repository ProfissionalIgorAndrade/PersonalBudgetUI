import { COLORS, FLAGS } from '../../core/constants/index';
import { parseMoneyAmount } from '../../core/utils/money';
import { buildCreateTransactionPayload } from '../createTransactionPayload';

/* ─── Member lookup helper ──────────────────────────────────── */
/** Encontra o perfil na lista de membros comparando por id ou userId (cobre variações de campo da API). */
export function findMember(members, memberId) {
  if (!memberId) return null;
  const id = String(memberId);
  return members.find(m => String(m.id) === id || String(m.userId ?? '') === id) ?? null;
}

/** Rótulo de exibição de conta: "Banco - Titular" (ou só "Banco" se sem titular). */
export function accountLabel(account, members) {
  const bank = BANK_LABELS[account.bank] || account.bank || 'Conta';
  const mem  = findMember(members, account.memberId);
  return mem ? `${bank} - ${mem.name}` : bank;
}

/* ─── Enum conversions ──────────────────────────────────────── */
export const TYPE_TO_API    = { income: 'Income', expense: 'Expense' };
export const TYPE_FROM_API  = { Income: 'income', Expense: 'expense' };

export const FREQ_TO_API    = { fixed: 'Fixed', variable: 'Variable', installment: 'Installments' };
export const FREQ_FROM_API  = { Fixed: 'fixed', Variable: 'variable', Installments: 'installment' };

export const STATUS_TO_API   = { paid: 'Completed', pending: 'Pending', cancelled: 'Cancelled' };
export const STATUS_FROM_API = { Completed: 'paid', Pending: 'pending', Cancelled: 'cancelled', Simulated: 'pending' };

/** Maps API numeric/string status (1/2/4, pending/completed/cancelled, PascalCase) to UI keys. */
export function normalizeTransactionStatus(raw) {
  if (raw == null || raw === '') return 'pending';
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    if (raw === 1) return 'pending';
    if (raw === 2) return 'paid';
    if (raw === 4) return 'cancelled';
  }
  const s = String(raw).trim();
  const lower = s.toLowerCase();
  if (lower === 'pending') return 'pending';
  if (lower === 'completed') return 'paid';
  if (lower === 'cancelled' || lower === 'canceled') return 'cancelled';
  return STATUS_FROM_API[raw] ?? STATUS_FROM_API[s] ?? 'pending';
}

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
export const cardVisuals   = { load: () => loadVisuals('pb_card_visuals'),   save: (id, d) => saveVisual('pb_card_visuals', id, d),   remove: (id) => removeVisual('pb_card_visuals', id) };

/* ─── Normalizers ───────────────────────────────────────────── */
function toStr(v) {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return String(v);
  // .NET value object pattern: { value: "..." } or { $value: "..." }
  if (typeof v === 'object') return String(v.value ?? v.Value ?? v.code ?? v.Code ?? '');
  return '';
}

export function normalizeAccount(a) {
  const rawNumber = a.accountNumber ?? a.AccountNumber ?? a.number ?? a.Number;
  return {
    id:            a.id,
    name:          a.name || `${BANK_LABELS[a.bank] || a.bank}${rawNumber ? ` ···${toStr(rawNumber).slice(-4)}` : ''}`,
    bank:          a.bank ?? a.Bank ?? '',
    agency:        toStr(a.agency ?? a.Agency),
    accountNumber: toStr(rawNumber),
    number:        toStr(rawNumber),
    balance:       parseMoneyAmount(a.balance ?? a.Balance),
    color:         BANK_COLORS[a.bank ?? a.Bank] || '#2dd4bf',
    type:          'checking',
    isActive:      a.isActive !== false,
    memberId:      String(a.memberId ?? a.MemberId ?? a.profileId ?? a.ProfileId ?? a.memberProfileId ?? a.attributionProfileId ?? '') || null,
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
  if (!p || typeof p !== 'object') return null;
  const id =
    p.id
    ?? p.profileId
    ?? p.ProfileId
    ?? p.memberId
    ?? p.MemberId
    ?? p.userId
    ?? p.UserId;
  if (id == null || id === '') return null;

  const idKey = String(id);
  const v = memberVisuals.load()[idKey] || memberVisuals.load()[id] || {};
  const uid = p.userId ?? p.UserId ?? null;

  return {
    id:     String(id),
    name:   (p.displayName ?? p.name ?? p.Name ?? '').trim() || 'Membro',
    emoji:  v.emoji || '👤',
    color:  v.color || '#2dd4bf',
    type:   p.kind ?? p.Kind ?? 'other',
    userId: uid,
  };
}

function normalizeCardHex(color) {
  if (color == null || color === '') return COLORS[0];
  let h = String(color).trim();
  if (!h.startsWith('#')) h = `#${h}`;
  if (/^#[0-9a-fA-F]{6}$/.test(h)) return h.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(h)) {
    const r = h[1], g = h[2], b = h[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return COLORS[0];
}

function normalizeCardFlag(c) {
  const direct = c.flag;
  if (direct && FLAGS[direct]) return direct;
  const raw = c.flag ?? c.brand ?? c.Brand ?? c.cardBrand ?? '';
  const s = String(raw).toLowerCase();
  if (s.includes('master')) return 'master';
  if (s.includes('elo')) return 'elo';
  if (s.includes('amex') || s.includes('american')) return 'amex';
  if (s.includes('hiper')) return 'hiper';
  if (s.includes('visa')) return 'visa';
  if (FLAGS[s]) return s;
  return 'visa';
}

export function normalizeCard(c) {
  if (!c || typeof c !== 'object') return null;
  const id = c.id ?? c.Id;
  const idKey = id != null ? String(id) : '';
  const local = idKey ? cardVisuals.load()[idKey] || {} : {};

  const colorRaw =
    c.color ??
    c.Color ??
    c.themeColor ??
    c.accentColor ??
    c.hexColor;
  const colorFromApi = normalizeCardHex(colorRaw);
  const color =
    local.color != null && local.color !== ''
      ? normalizeCardHex(local.color)
      : colorFromApi;

  return {
    id,
    name:       (c.name ?? c.Name ?? '').trim() || 'Cartão',
    limit:      Number(c.limit ?? c.Limit ?? 0),
    closingDay: Number(c.closingDay ?? c.ClosingDay ?? 1),
    dueDay:     Number(c.dueDay ?? c.DueDay ?? 10),
    accountId:  String(c.accountId ?? c.AccountId ?? ''),
    color,
    flag:       normalizeCardFlag(c),
    lastDigits: String(c.lastDigits ?? c.lastFourDigits ?? c.LastFourDigits ?? '').replace(/\D/g, '').slice(-4),
    memberId:   String(c.memberId ?? c.member?.id ?? c.member?.Id ?? c.attributionProfileId ?? c.MemberId ?? c.ProfileId ?? local.memberId ?? ''),
  };
}

export function normalizeTransaction(t) {
  const isTransfer = t.paymentMethod === 'Transfer';
  const dateStr    = t.date
    ? (typeof t.date === 'string' ? t.date.slice(0, 10) : new Date(t.date).toISOString().slice(0, 10))
    : '';
  return {
    id:            t.id,
    description:   t.description,
    amount:        t.amount,
    date:          dateStr,
    type:          isTransfer ? 'transfer' : (TYPE_FROM_API[t.type] || 'expense'),
    status:        normalizeTransactionStatus(t.status),
    recurrence:    FREQ_FROM_API[t.frequency] || 'variable',
    categoryId:    t.categoryId   || '',
    memberId:      t.attributionProfileId || '',
    accountId:     t.accountId    || '',
    cardId:        t.creditCardId || '',
    transferId:    t.transferId   || null,
    paymentMethod: t.paymentMethod,
    recurrenceId:  t.recurrenceId ?? null,
    notes:         '',
  };
}

/* ─── Form → API body ───────────────────────────────────────── */
export function txToApi(f) {
  return buildCreateTransactionPayload(f);
}
