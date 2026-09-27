import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuth } from '../useAuth';
import { UNAUTHORIZED_EVENT } from '../../../data/http/client';

const b64url = (obj) =>
  btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const token = (secondsFromNow) =>
  `h.${b64url({ sub: 'u1', exp: Math.floor(Date.now() / 1000) + secondsFromNow })}.s`;

const seed = (jwt) => {
  localStorage.setItem('pb_session', JSON.stringify({ userId: 'u1', email: 'a@b.c' }));
  if (jwt) localStorage.setItem('pb_jwt', jwt);
};

beforeEach(() => localStorage.clear());

describe('useAuth session expiry', () => {
  it('keeps a session whose token is still live', () => {
    seed(token(3600));
    const { result } = renderHook(() => useAuth());
    expect(result.current.authSession).not.toBeNull();
    expect(result.current.expired).toBe(false);
  });

  it('drops a session whose token has expired, and says so', () => {
    seed(token(-60));
    const { result } = renderHook(() => useAuth());
    expect(result.current.authSession).toBeNull();
    expect(result.current.expired).toBe(true);
  });

  it('clears the stored session and token when it drops one', () => {
    seed(token(-60));
    renderHook(() => useAuth());
    expect(localStorage.getItem('pb_session')).toBeNull();
    expect(localStorage.getItem('pb_jwt')).toBeNull();
  });

  it('drops a session whose token is missing entirely', () => {
    seed(null);
    const { result } = renderHook(() => useAuth());
    expect(result.current.authSession).toBeNull();
  });

  it('does not claim expiry when there was never a session', () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.authSession).toBeNull();
    expect(result.current.expired).toBe(false);
  });

  it('logs out when the API reports 401 while the tab is open', () => {
    seed(token(3600));
    const { result } = renderHook(() => useAuth());
    expect(result.current.authSession).not.toBeNull();

    act(() => { window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT)); });

    expect(result.current.authSession).toBeNull();
    expect(result.current.expired).toBe(true);
    expect(localStorage.getItem('pb_jwt')).toBeNull();
  });
});
