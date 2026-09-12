import { describe, it, expect } from 'vitest';
import {
  parseAmount, parseDate, splitCsvLine, detectSeparator,
  parseImportCsv, validateImportRow, buildTemplateCsv,
} from '../csvImport';

const categories = [{ id: 'c1', name: 'Mercado', type: 'expense' }, { id: 'c2', name: 'Transporte', type: 'expense' }];
const members = [{ id: 'm1', name: 'Familia' }, { id: 'm2', name: 'Igor Andrade' }];

describe('parseAmount', () => {
  it('reads Brazilian decimals', () => {
    expect(parseAmount('250,90')).toBe(250.9);
    expect(parseAmount('1.234,56')).toBe(1234.56);
  });
  it('reads English decimals', () => {
    expect(parseAmount('1,234.56')).toBe(1234.56);
    expect(parseAmount('1234.56')).toBe(1234.56);
  });
  it('strips currency and whitespace', () => {
    expect(parseAmount('R$ 68,40')).toBe(68.4);
  });
  it('treats a leading minus and parentheses as negative', () => {
    expect(parseAmount('-29,90')).toBe(-29.9);
    expect(parseAmount('(15,00)')).toBe(-15);
  });
  it('returns NaN for junk', () => {
    expect(Number.isNaN(parseAmount('abc'))).toBe(true);
    expect(Number.isNaN(parseAmount(''))).toBe(true);
  });
});

describe('parseDate', () => {
  it('accepts the three formats and normalises them', () => {
    expect(parseDate('2026-07-15')).toBe('2026-07-15');
    expect(parseDate('15/07/2026')).toBe('2026-07-15');
    expect(parseDate('5-7-2026')).toBe('2026-07-05');
  });
  it('returns empty for anything else', () => {
    expect(parseDate('15 de julho')).toBe('');
    expect(parseDate('')).toBe('');
  });
});

describe('splitCsvLine', () => {
  it('respects quoted separators', () => {
    expect(splitCsvLine('a,"b,c",d', ',')).toEqual(['a', 'b,c', 'd']);
  });
  it('unescapes doubled quotes', () => {
    expect(splitCsvLine('a,"diz ""oi""",c', ',')).toEqual(['a', 'diz "oi"', 'c']);
  });
});

describe('detectSeparator', () => {
  // Excel in Portuguese saves with semicolons; reading that with a comma
  // collapses every row into a single column.
  it('picks semicolon when it dominates', () => {
    expect(detectSeparator('descricao;valor;data')).toBe(';');
  });
  it('defaults to comma', () => {
    expect(detectSeparator('descricao,valor,data')).toBe(',');
  });
});

describe('parseImportCsv', () => {
  const csv = [
    'descricao,valor,data,categoria,membro,observacoes',
    'Supermercado,250990,2026-07-15,Mercado,Familia,Compra do mes',
    'Uber,"68,40",15/07/2026,Transporte,Igor Andrade,',
  ].join('\n');

  it('parses rows and resolves category and member by name', () => {
    const { rows, fatal } = parseImportCsv(csv, { categories, members });
    expect(fatal).toBeNull();
    expect(rows).toHaveLength(2);
    expect(rows[1].description).toBe('Uber');
    expect(rows[1].amount).toBe(68.4);
    expect(rows[1].date).toBe('2026-07-15');
    expect(rows[1].categoryId).toBe('c2');
    expect(rows[1].memberId).toBe('m2');
  });

  it('reports missing required columns instead of importing garbage', () => {
    const { fatal } = parseImportCsv('descricao,data\nX,2026-07-15', { categories, members });
    expect(fatal).toMatch(/valor/);
  });

  it('flags an unknown category on that row without discarding the file', () => {
    const bad = 'descricao,valor,data,categoria,membro,observacoes\nX,10,2026-07-15,Inexistente,Familia,';
    const { rows } = parseImportCsv(bad, { categories, members });
    expect(rows).toHaveLength(1);
    expect(rows[0].errors.join(' ')).toMatch(/Inexistente/);
    expect(rows[0].selected).toBe(false);
  });

  it('turns a negative amount into an income row', () => {
    const est = 'descricao,valor,data,categoria,membro,observacoes\nEstorno,"-29,90",2026-07-15,Mercado,Familia,';
    const { rows } = parseImportCsv(est, { categories, members });
    expect(rows[0].type).toBe('income');
    expect(rows[0].amount).toBe(29.9);
  });

  it('handles a semicolon file', () => {
    const semi = 'descricao;valor;data;categoria;membro;observacoes\nX;10,50;2026-07-15;Mercado;Familia;';
    const { rows } = parseImportCsv(semi, { categories, members });
    expect(rows[0].amount).toBe(10.5);
    expect(rows[0].categoryId).toBe('c1');
  });

  it('reports an empty file rather than throwing', () => {
    expect(parseImportCsv('').fatal).toBeTruthy();
    expect(parseImportCsv(null).fatal).toBeTruthy();
  });

  it('strips the BOM Excel writes', () => {
    const { fatal } = parseImportCsv('\uFEFFdescricao,valor,data\nX,10,2026-07-15', { categories, members });
    expect(fatal).toBeNull();
  });
});

describe('validateImportRow', () => {
  const ok = { description: 'X', amount: 10, date: '2026-07-15', categoryId: 'c1', memberId: 'm1' };
  it('accepts a complete row', () => {
    expect(validateImportRow(ok)).toEqual([]);
  });
  it('demands category and member, as the normal form does', () => {
    expect(validateImportRow({ ...ok, categoryId: '' })).toContain('Selecione uma categoria.');
    expect(validateImportRow({ ...ok, memberId: '' })).toContain('Selecione um membro.');
  });
  it('rejects a zero or negative amount', () => {
    expect(validateImportRow({ ...ok, amount: 0 }).length).toBeGreaterThan(0);
  });
});

describe('buildTemplateCsv', () => {
  it('round-trips through the parser it is meant to feed', () => {
    const cats = [{ id: 'x', name: 'Mercado' }, { id: 'y', name: 'Transporte' }, { id: 'z', name: 'Assinaturas' }];
    const mems = [{ id: 'a', name: 'Familia' }, { id: 'b', name: 'Igor Andrade' }];
    const { rows, fatal } = parseImportCsv(buildTemplateCsv(), { categories: cats, members: mems });
    expect(fatal).toBeNull();
    expect(rows).toHaveLength(3);
    expect(rows.every(r => r.errors.length === 0)).toBe(true);
  });
});
