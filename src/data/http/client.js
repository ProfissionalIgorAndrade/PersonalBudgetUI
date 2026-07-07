import { formatApiErrorMessage } from '../../core/utils/apiErrors';

const API_BASE = import.meta.env.VITE_API_BASE || '';

export const getToken        = () => localStorage.getItem('pb_jwt');
export const setToken        = (t) => localStorage.setItem('pb_jwt', t);
export const clearToken      = () => localStorage.removeItem('pb_jwt');
export const getHouseholdId  = () => localStorage.getItem('pb_household_id');
export const setHouseholdId  = (id) => id
  ? localStorage.setItem('pb_household_id', id)
  : localStorage.removeItem('pb_household_id');

function apiAuthHeaders(extra = {}) {
  const token = getToken();
  const hid   = getHouseholdId();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(hid   ? { 'X-Household-Id': hid }            : {}),
    ...extra,
  };
}

async function request(path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers: apiAuthHeaders(opts.headers) });

  let body;
  try { body = await res.json(); }
  catch { body = { success: false, message: `HTTP ${res.status}`, data: null }; }

  if (!body.success) {
    const raw = body.message || `Erro ${res.status}`;
    const err = new Error(formatApiErrorMessage(raw));
    err.status = res.status;
    err.apiMessage = raw;
    throw err;
  }
  return body.data;
}

/**
 * PATCH and return `{ data, message }` so callers can toast the ApiResponse message.
 */
export async function deleteEnvelope(path, payload) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'DELETE',
    body: JSON.stringify(payload),
    headers: apiAuthHeaders(),
  });
  let body;
  try { body = await res.json(); }
  catch { body = { success: false, message: `HTTP ${res.status}`, data: null }; }

  if (!body.success) {
    const raw = body.message || `Erro ${res.status}`;
    const err = new Error(formatApiErrorMessage(raw));
    err.status = res.status;
    err.apiMessage = raw;
    throw err;
  }

  const msg = body.message != null ? String(body.message) : '';
  return { data: body.data ?? null, message: msg };
}

export async function patchEnvelope(path, payload) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
    headers: apiAuthHeaders(),
  });
  let body;
  try { body = await res.json(); }
  catch { body = { success: false, message: `HTTP ${res.status}`, data: null }; }

  if (!body.success) {
    const raw = body.message || `Erro ${res.status}`;
    const err = new Error(formatApiErrorMessage(raw));
    err.status = res.status;
    err.apiMessage = raw;
    throw err;
  }

  const msg = body.message != null ? String(body.message) : '';
  return { data: body.data ?? null, message: msg };
}

export const http = {
  get:    (path, h)       => request(path, { method: 'GET', headers: h }),
  post:   (path, body, h) => request(path, { method: 'POST',   body: JSON.stringify(body), headers: h }),
  put:    (path, body, h) => request(path, { method: 'PUT',    body: JSON.stringify(body), headers: h }),
  patch:  (path, body, h) => request(path, { method: 'PATCH',  body: JSON.stringify(body), headers: h }),
  delete: (path, body, h) => request(path, { method: 'DELETE', body: body ? JSON.stringify(body) : undefined, headers: h }),
  patchEnvelope,
  deleteEnvelope,
};
