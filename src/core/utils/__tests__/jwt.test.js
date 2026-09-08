import { describe, it, expect } from 'vitest';
import { decodeJwt, isTokenExpired } from '../jwt';

const b64url = (obj) =>
  btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const token = (payload) => `header.${b64url(payload)}.signature`;
const now = () => Math.floor(Date.now() / 1000);

describe('decodeJwt', () => {
  it('reads the payload', () => {
    expect(decodeJwt(token({ sub: 'u1', exp: 123 }))).toEqual({ sub: 'u1', exp: 123 });
  });

  it('returns null for anything that is not a three-part token', () => {
    expect(decodeJwt(null)).toBeNull();
    expect(decodeJwt('')).toBeNull();
    expect(decodeJwt('not-a-jwt')).toBeNull();
    expect(decodeJwt('only.two')).toBeNull();
    expect(decodeJwt('a.!!!not-base64!!!.c')).toBeNull();
  });
});

describe('isTokenExpired', () => {
  it('is false for a token with time left', () => {
    expect(isTokenExpired(token({ exp: now() + 3600 }))).toBe(false);
  });

  it('is true once the expiry has passed', () => {
    expect(isTokenExpired(token({ exp: now() - 1 }))).toBe(true);
  });

  it('expires early by the skew, so a request is not fired at the boundary', () => {
    expect(isTokenExpired(token({ exp: now() + 10 }), 30)).toBe(true);
    expect(isTokenExpired(token({ exp: now() + 10 }), 0)).toBe(false);
  });

  it('treats an unreadable or exp-less token as expired', () => {
    expect(isTokenExpired(null)).toBe(true);
    expect(isTokenExpired('garbage')).toBe(true);
    expect(isTokenExpired(token({ sub: 'u1' }))).toBe(true);
    expect(isTokenExpired(token({ sub: 'u1', exp: 'soon' }))).toBe(true);
  });
});
