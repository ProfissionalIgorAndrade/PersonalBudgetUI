import { describe, it, expect } from 'vitest';
import { normalizeCard, findMember, cardLabel } from '../mappers/index';

const members = [
  { id: 'p-andreza', name: 'Andreza Maia', userId: 'u-andreza' },
  { id: 'p-igor', name: 'Igor Andrade', userId: 'u-igor' },
  { id: 'p-familia', name: 'Familia', userId: null },
];

describe('normalizeCard owner resolution', () => {
  it('uses the member link the API supplies', () => {
    expect(normalizeCard({ id: 'c1', name: 'Inter Black', memberId: 'p-andreza' }).memberId)
      .toBe('p-andreza');
  });

  // An earlier attempt fell back to userId. That is who created the card, not
  // who owns it: a card belonging to Andreza but entered by Igor read "Igor".
  it('does not fall back to userId', () => {
    expect(normalizeCard({ id: 'c1', name: 'Inter Black', userId: 'u-igor' }).memberId).toBe('');
  });

  it('resolves to the right household profile', () => {
    const card = normalizeCard({ id: 'c1', name: 'Nubank Ultravioleta', memberId: 'p-andreza' });
    expect(findMember(members, card.memberId).name).toBe('Andreza Maia');
  });

  it('separates two cards of the same name by owner', () => {
    const a = normalizeCard({ id: 'c1', name: 'Nubank Ultravioleta', memberId: 'p-andreza' });
    const b = normalizeCard({ id: 'c2', name: 'Nubank Ultravioleta', memberId: 'p-igor' });
    expect(cardLabel(a, members)).toBe('Nubank Ultravioleta - Andreza Maia');
    expect(cardLabel(b, members)).toBe('Nubank Ultravioleta - Igor Andrade');
  });

  it('shows the card name alone while a card has no member yet', () => {
    const card = normalizeCard({ id: 'c9', name: 'Itau Latam' });
    expect(card.memberId).toBe('');
    expect(cardLabel(card, members)).toBe('Itau Latam');
  });
});
