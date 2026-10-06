import { describe, it, expect } from 'vitest';
import {
  rowsFromApi, receivedTitle, receivedHint, receivedInviteToken,
  sentTitle, sentHint, emailError,
} from '../invites';

describe('rowsFromApi', () => {
  it('accepts plain lists and the known envelope keys', () => {
    expect(rowsFromApi([1])).toEqual([1]);
    expect(rowsFromApi({ invites: [1] })).toEqual([1]);
    expect(rowsFromApi({ Items: [2] })).toEqual([2]);
    expect(rowsFromApi({ data: [3] })).toEqual([3]);
  });

  it('returns an empty list for null and unknown shapes', () => {
    expect(rowsFromApi(null)).toEqual([]);
    expect(rowsFromApi({ foo: [1] })).toEqual([]);
  });
});

describe('invite fields', () => {
  it('reads received title, hint and token across casings', () => {
    expect(receivedTitle({ HouseholdName: 'Casa' })).toBe('Casa');
    expect(receivedTitle({})).toBe('Convite');
    expect(receivedHint({ InviterEmail: 'a@example.com' })).toBe('a@example.com');
    expect(receivedHint({})).toBe(null);
    expect(receivedInviteToken({ Token: 't' })).toBe('t');
    expect(receivedInviteToken({ invitationToken: 'x' })).toBe('x');
  });

  it('reads the sent title and formats the date in pt-BR', () => {
    expect(sentTitle({ InviteeEmail: 'b@example.com' })).toBe('b@example.com');
    expect(sentHint({ createdAtUtc: '2026-03-05T12:00:00Z' })).toMatch(/05\/03\/2026/);
    expect(sentHint({})).toBe(null);
    expect(sentHint({ createdAt: 'not a date' })).toBe(null);
  });
});

describe('emailError', () => {
  it('requires and validates the email', () => {
    expect(emailError('  ')).toBe('Informe um e-mail');
    expect(emailError('abc')).toBe('E-mail inválido');
    expect(emailError('a@example.com')).toBe('');
  });
});
