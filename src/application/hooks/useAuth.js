import { useState } from 'react';
import * as authRepo from '../../data/repositories/authRepository';
import { clearToken, setHouseholdId } from '../../data/http/client';

const SESSION_KEY = 'pb_session';

function loadSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch { return null; }
}

export function useAuth() {
  const [authSession, setAuthSession] = useState(loadSession);

  const login = async ({ email, password }) => {
    const data = await authRepo.login({ email, password });
    const session = { userId: data.userId, displayName: email.split('@')[0], email };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    setAuthSession(session);
    return session;
  };

  const signup = async ({ firstName, email, password }) => {
    const data = await authRepo.signup({ firstName, email, password });
    const session = { userId: data.userId, displayName: firstName, email };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    setAuthSession(session);
    return session;
  };

  const logout = (onClear) => {
    clearToken();
    setHouseholdId(null);
    localStorage.removeItem(SESSION_KEY);
    setAuthSession(null);
    onClear?.();
  };

  return { authSession, login, signup, logout };
}
