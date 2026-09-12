import { describe, it, expect } from 'vitest';
import { cardLabel, sortByName } from '../mappers/index';

const members = [{ id: 'm1', name: 'Igor Andrade' }, { id: 'm2', name: 'Andreza Maia' }];

describe('cardLabel', () => {
  it('names the owner, like accountLabel does', () => {
    expect(cardLabel({ name: 'Inter Black', memberId: 'm1' }, members)).toBe('Inter Black - Igor Andrade');
  });

  it('falls back to the card name when the owner is unknown', () => {
    expect(cardLabel({ name: 'Inter Black', memberId: 'zzz' }, members)).toBe('Inter Black');
    expect(cardLabel({ name: 'Inter Black' }, members)).toBe('Inter Black');
  });

  it('survives a missing card', () => {
    expect(cardLabel(null, members)).toBe('Cartão');
  });
});

describe('sortByName', () => {
  it('orders accounts, cards and members alphabetically', () => {
    const out = sortByName([{ name: 'Nubank' }, { name: 'Inter' }, { name: 'Itaú' }]);
    expect(out.map(x => x.name)).toEqual(['Inter', 'Itaú', 'Nubank']);
  });

  it('places accented names where a reader expects them', () => {
    const out = sortByName([{ name: 'Zebra' }, { name: 'Ávila' }, { name: 'Bravo' }]);
    expect(out.map(x => x.name)).toEqual(['Ávila', 'Bravo', 'Zebra']);
  });

  it('does not mutate the input', () => {
    const input = [{ name: 'B' }, { name: 'A' }];
    sortByName(input);
    expect(input.map(x => x.name)).toEqual(['B', 'A']);
  });

  it('survives null and missing names', () => {
    expect(() => sortByName([{ name: 'A' }, {}, null])).not.toThrow();
    expect(sortByName(null)).toEqual([]);
  });
});
