import { describe, it, expect } from 'vitest';
import { normalizeCard, findMember, cardLabel } from '../mappers/index';

// The API returns the CreditCard entity, which carries UserId and no profile
// link at all. Every key normalizeCard looked for was absent, so memberId was
// always '' and no card ever showed an owner.
const apiCard = {
  id: 'cc1', name: 'Nubank Ultravioleta', limit: 15000,
  closingDay: 20, dueDay: 28, accountId: 'a1', userId: 'u-andreza',
};

const members = [
  { id: 'p1', name: 'Andreza Maia', userId: 'u-andreza' },
  { id: 'p2', name: 'Igor Andrade', userId: 'u-igor' },
  { id: 'p3', name: 'Familia', userId: null },
];

describe('normalizeCard owner resolution', () => {
  it('falls back to userId when no profile link is present', () => {
    expect(normalizeCard(apiCard).memberId).toBe('u-andreza');
  });

  it('resolves to the right household profile', () => {
    const card = normalizeCard(apiCard);
    expect(findMember(members, card.memberId).name).toBe('Andreza Maia');
  });

  it('produces the label the tile and selects show', () => {
    const card = normalizeCard(apiCard);
    expect(cardLabel(card, members)).toBe('Nubank Ultravioleta - Andreza Maia');
  });

  it('separates two cards of the same name by owner', () => {
    const a = normalizeCard({ ...apiCard, id: 'cc1', userId: 'u-andreza' });
    const b = normalizeCard({ ...apiCard, id: 'cc2', userId: 'u-igor' });
    expect(cardLabel(a, members)).toBe('Nubank Ultravioleta - Andreza Maia');
    expect(cardLabel(b, members)).toBe('Nubank Ultravioleta - Igor Andrade');
  });

  it('still prefers an explicit profile link when the API gains one', () => {
    expect(normalizeCard({ ...apiCard, memberId: 'p2' }).memberId).toBe('p2');
  });

  it('leaves memberId empty when there is nothing to resolve', () => {
    expect(normalizeCard({ id: 'cc9', name: 'X' }).memberId).toBe('');
  });
});
