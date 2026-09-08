import { useState, useEffect, useCallback } from 'react';
import * as authRepo from '../../data/repositories/authRepository';
import { clearToken, setHouseholdId, getToken, UNAUTHORIZED_EVENT } from '../../data/http/client';
import { isTokenExpired } from '../../core/utils/jwt';

const SESSION_KEY = 'pb_session';

/**
 * The session record and the JWT expire independently: pb_session has no
 * expiry of its own, while the token is good for a fixed window server-side.
 * Reading only pb_session is what let an expired visitor into the app, where
 * every request then failed.
 *
 * A session is only real if its token is still live.
 */
function loadSession() {
  let stored = null;
  try { stored = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch { stored = null; }
  if (!stored) return { session: null, expired: false };

  if (isTokenExpired(getToken())) {
    clearSessionStorage();
    // Distinguishes "came back after the token lapsed" from "never logged
    // in", so the login screen can explain itself.
    return { session: null, expired: true };
  }
  return { session: stored, expired: false };
}

function clearSessionStorage() {
  clearToken();
  setHouseholdId(null);
  try { localStorage.removeItem(SESSION_KEY); } catch { /* nothing to do */ }
}

export function useAuth() {
  const boot = useState(loadSession)[0];
  const [authSession, setAuthSession] = useState(boot.session);
  // Set when a session was dropped rather than never started, so the login
  // screen can say why instead of appearing for no visible reason.
  const [expired,     setExpired]     = useState(boot.expired);

  const login = async ({ email, password }) => {
    const data = await authRepo.login({ email, password });
    const session = { userId: data.userId, displayName: email.split('@')[0], email };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    setAuthSession(session);
    setExpired(false);
    return session;
  };

  const signup = async ({ firstName, email, password }) => {
    const data = await authRepo.signup({ firstName, email, password });
    const session = { userId: data.userId, displayName: firstName, email };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    setAuthSession(session);
    return session;
  };

  const logout = useCallback((onClear) => {
    clearSessionStorage();
    setAuthSession(null);
    onClear?.();
  }, []);

  /**
   * A token can lapse while the tab sits open, so the check at boot is not
   * enough on its own. The API telling us it is done is the authoritative
   * signal, and the only one that also covers a token revoked server-side.
   */
  useEffect(() => {
    const onUnauthorized = () => {
      clearSessionStorage();
      setAuthSession(null);
      setExpired(true);
    };
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  return { authSession, login, signup, logout, expired, clearExpired: () => setExpired(false) };
}
