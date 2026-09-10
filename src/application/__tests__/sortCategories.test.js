import { describe, it, expect } from 'vitest';
import { sortCategories } from '../mappers/index';

const names = (cats) => sortCategories(cats).map(c => c.name);

describe('sortCategories', () => {
  it('sorts alphabetically', () => {
    expect(names([{ name: 'Transporte' }, { name: 'Assinaturas' }, { name: 'Moradia' }]))
      .toEqual(['Assinaturas', 'Moradia', 'Transporte']);
  });

  // A plain a > b comparison puts every accented name after 'Z'.
  it('places accented names where a reader expects them', () => {
    expect(names([{ name: 'Educação' }, { name: 'Água' }, { name: 'Dízimo' }, { name: 'Contas' }]))
      .toEqual(['Água', 'Contas', 'Dízimo', 'Educação']);
  });

  it('ignores case', () => {
    expect(names([{ name: 'zebra' }, { name: 'Alface' }, { name: 'Banana' }]))
      .toEqual(['Alface', 'Banana', 'zebra']);
  });

  it('does not mutate the input', () => {
    const input = [{ name: 'B' }, { name: 'A' }];
    sortCategories(input);
    expect(input.map(c => c.name)).toEqual(['B', 'A']);
  });

  it('survives missing names and empty input', () => {
    expect(() => sortCategories([{ name: 'A' }, {}, null])).not.toThrow();
    expect(sortCategories(null)).toEqual([]);
    expect(sortCategories(undefined)).toEqual([]);
  });
});
