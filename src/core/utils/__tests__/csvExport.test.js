import { describe, it, expect } from 'vitest';
import { generateTransactionsCsv } from '../csvExport';
import { parseImportCsv } from '../csvImport';
import { CSV_COLUMNS } from '../csvFormat';

const categories = [
  { id: 'c1', name: 'Mercado', type: 'expense' },
  { id: 'c2', name: 'Reembolso', type: 'income' },
];
const members = [{ id: 'm1', name: 'Familia' }];

const transactions = [
  { id: 'tx-1', description: 'Supermercado; loja "Centro"', amount: 1250.9, date: '2026-07-15',
    type: 'expense', categoryId: 'c1', memberId: 'm1', notes: 'linha 1\nlinha 2' },
  { id: 'tx-2', description: 'Estorno assinatura', amount: 29.9, date: '2026-07-20',
    type: 'income', categoryId: 'c2', memberId: 'm1', notes: '' },
];

describe('generateTransactionsCsv', () => {
  it('writes the shared header, semicolon-separated, after a BOM', () => {
    const csv = generateTransactionsCsv([], categories, members);
    expect(csv).toBe(`﻿${CSV_COLUMNS.join(';')}\r\n`);
  });

  it('writes amounts positive with a decimal comma and the type in its own column', () => {
    const csv = generateTransactionsCsv(transactions, categories, members);
    expect(csv).toContain('"1250,90"');
    expect(csv).toContain(';"29,90";2026-07-20;Estorno;');
  });

  // The point of the unified format: what is exported is what the import reads.
  it('round-trips through the import parser without losing anything', () => {
    const csv = generateTransactionsCsv(transactions, categories, members);
    const { rows, fatal } = parseImportCsv(csv, { categories, members });

    expect(fatal).toBeNull();
    expect(rows).toHaveLength(2);
    expect(rows.map(r => ({
      id: r.externalId, description: r.description, amount: r.amount, date: r.date,
      type: r.type, categoryId: r.categoryId, memberId: r.memberId, notes: r.notes,
    }))).toEqual(transactions.map(t => ({
      id: t.id, description: t.description, amount: t.amount, date: t.date,
      type: t.type, categoryId: t.categoryId, memberId: t.memberId, notes: t.notes,
    })));
    expect(rows.every(r => r.errors.length === 0)).toBe(true);
  });
});
