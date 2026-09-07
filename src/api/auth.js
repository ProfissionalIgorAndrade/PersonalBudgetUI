import { http, setToken } from './client';

export async function signup({ firstName, email, password }) {
  const data = await http.post('/api/authentication/signin', { name: firstName, email, password });
  if (data?.token) setToken(data.token);
  return data;
}

export async function login({ email, password }) {
  const data = await http.post('/api/authentication/login', { email, password });
  if (data?.token) setToken(data.token);
  return data;
}
