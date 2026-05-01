const API_BASE = import.meta.env.VITE_API_BASE || '';

export const getToken        = () => localStorage.getItem('pb_jwt');
export const setToken        = (t) => localStorage.setItem('pb_jwt', t);
export const clearToken      = () => localStorage.removeItem('pb_jwt');
export const getHouseholdId  = () => localStorage.getItem('pb_household_id');
export const setHouseholdId  = (id) => id
  ? localStorage.setItem('pb_household_id', id)
  : localStorage.removeItem('pb_household_id');

async function request(path, opts = {}) {
  const token = getToken();
  const hid   = getHouseholdId();

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(hid   ? { 'X-Household-Id': hid }           : {}),
    ...opts.headers,
  };

  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });

  let body;
  try { body = await res.json(); }
  catch { body = { success: false, message: `HTTP ${res.status}`, data: null }; }

  if (!body.success) {
    const err = new Error(body.message || `Erro ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return body.data;
}

export const http = {
  get:    (path, h)       => request(path, { method: 'GET', headers: h }),
  post:   (path, body, h) => request(path, { method: 'POST',   body: JSON.stringify(body), headers: h }),
  put:    (path, body, h) => request(path, { method: 'PUT',    body: JSON.stringify(body), headers: h }),
  patch:  (path, body, h) => request(path, { method: 'PATCH',  body: JSON.stringify(body), headers: h }),
  delete: (path, body, h) => request(path, { method: 'DELETE', body: body ? JSON.stringify(body) : undefined, headers: h }),
};
