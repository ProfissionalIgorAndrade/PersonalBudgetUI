import { describe, it, expect } from 'vitest';
import { BANKS } from '../../core/constants/banks';
import {
  normalizeAccount, accountLabel, buildAccountPayload, accountEditFields,
} from '../mappers';

const members = [{ id: 'm1', name: 'Igor' }];

describe('normalizeAccount', () => {
  const raw = { id: 'a1', bank: 'Nubank', memberId: 'm1', balance: 10, agency: '0001', accountNumber: '123456' };

  it('exposes no agency or number fields', () => {
    const a = normalizeAccount(raw);
    for (const k of ['agency', 'accountNumber', 'number']) expect(k in a).toBe(false);
  });

  it('falls back to the bank label, with no digits suffix', () => {
    expect(normalizeAccount(raw).name).toBe('Nubank');
    expect(normalizeAccount({ ...raw, bank: 'Itau' }).name).toBe('Itaú');
    expect(normalizeAccount(raw).name.includes('···')).toBe(false);
  });

  it('keeps the nickname when the API sends one', () => {
    expect(normalizeAccount({ ...raw, name: 'Salário' }).name).toBe('Salário');
  });
});

describe('accountLabel', () => {
  const acc = { bank: 'Itau', memberId: 'm1', kind: 'checking' };

  it('uses bank - member without a nickname', () => {
    expect(accountLabel(acc, members)).toBe('Itaú - Igor');
  });

  it('uses nickname - member when present', () => {
    expect(accountLabel({ ...acc, name: 'Salário' }, members)).toBe('Salário - Igor');
  });

  it('is the bank alone for an account without member', () => {
    expect(accountLabel({ bank: 'Itau' }, members)).toBe('Itaú');
    expect(accountLabel({ bank: 'Itau', name: 'Salário' }, [])).toBe('Salário');
  });

  it('ignores a savings box name, keeping the bank', () => {
    expect(accountLabel({ bank: 'Nubank', kind: 'savings', name: 'Reserva', memberId: 'm1' }, members)).toBe('Nubank - Igor');
  });
});

describe('buildAccountPayload', () => {
  it('sends only bank and memberId without a nickname', () => {
    expect(buildAccountPayload({ id: 'a1', bank: 'Nubank', memberId: 'm1', name: '  ', agency: '1' }))
      .toEqual({ bank: 'Nubank', memberId: 'm1' });
  });

  it('includes the trimmed nickname', () => {
    expect(buildAccountPayload({ bank: 'Nubank', memberId: 'm1', name: ' Salário ' }))
      .toEqual({ bank: 'Nubank', name: 'Salário', memberId: 'm1' });
  });
});

describe('accountEditFields', () => {
  it('keeps only editable fields and blanks the bank-label fallback', () => {
    const a = normalizeAccount({ id: 'a1', bank: 'Itau', memberId: 'm1', balance: 5 });
    expect(accountEditFields(a)).toEqual({ id: 'a1', bank: 'Itau', name: '', memberId: 'm1' });
  });

  it('carries a real nickname', () => {
    const a = normalizeAccount({ id: 'a1', bank: 'Itau', memberId: 'm1', name: 'Salário' });
    expect(accountEditFields(a).name).toBe('Salário');
  });
});

describe('new banks', () => {
  const newBanks = Object.keys(BANKS).filter(k => !['Itau', 'Nubank', 'Inter', 'Santander', 'Bradesco', 'Caixa'].includes(k));

  it('has a label and color for each of the 18 new banks', () => {
    expect(newBanks).toHaveLength(18);
    for (const k of newBanks) {
      const a = normalizeAccount({ id: 'a1', bank: k, memberId: 'm1' });
      expect(a.name).toBe(BANKS[k].label);
      expect(a.color).toBe(BANKS[k].color);
      expect(a.color === '#2dd4bf').toBe(false);
    }
  });

  it('normalizes a new bank keeping the raw enum key in bank', () => {
    const a = normalizeAccount({ id: 'a1', bank: 'BancoDoBrasil', memberId: 'm1', balance: 5 });
    expect(a.bank).toBe('BancoDoBrasil');
    expect(a.name).toBe('Banco do Brasil');
    expect(a.color).toBe('#fcd116');
  });

  it('builds the label, edit fields and payload for a new bank', () => {
    const acc = normalizeAccount({ id: 'a1', bank: 'MercadoPago', memberId: 'm1' });
    expect(accountLabel(acc, members)).toBe('Mercado Pago - Igor');
    expect(accountEditFields(acc)).toEqual({ id: 'a1', bank: 'MercadoPago', name: '', memberId: 'm1' });
    expect(buildAccountPayload(accountEditFields(acc))).toEqual({ bank: 'MercadoPago', memberId: 'm1' });
  });

  it('keeps the default color for an unknown bank', () => {
    expect(normalizeAccount({ id: 'a1', bank: 'Foo' }).color).toBe('#2dd4bf');
  });
});
