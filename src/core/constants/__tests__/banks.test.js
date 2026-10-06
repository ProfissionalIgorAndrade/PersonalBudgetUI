import { describe, it, expect } from 'vitest';
import { BANKS, BANK_LABELS as MODULE_LABELS, BANK_COLORS as MODULE_COLORS } from '../banks';
import { BANK_LABELS, BANK_COLORS } from '../../../application/mappers';

// Nomes do enum Bank do backend (contrato da API). Fixado de propósito:
// renomear ou remover uma chave quebra dados existentes.
const BACKEND_BANKS = [
  'Itau', 'Nubank', 'Inter', 'Santander', 'Bradesco', 'Caixa',
  'BancoDoBrasil', 'Btg', 'C6Bank', 'Safra', 'Sicoob', 'Sicredi',
  'Original', 'Pan', 'Neon', 'PicPay', 'MercadoPago', 'Banrisul',
  'Next', 'Bmg', 'Xp', 'PagBank', 'Bv', 'Outro',
];

describe('banks module', () => {
  it('has exactly the backend enum keys', () => {
    expect(Object.keys(BANKS).sort()).toEqual([...BACKEND_BANKS].sort());
  });

  it('gives every bank a label, a #rrggbb color and a complete logo', () => {
    for (const [key, b] of Object.entries(BANKS)) {
      expect(typeof b.label === 'string' && b.label.trim().length > 0).toBe(true);
      expect(/^#[0-9a-f]{6}$/i.test(b.color)).toBe(true);
      expect(b.logo && typeof b.logo.abbr === 'string' && b.logo.abbr.length > 0).toBe(true);
      expect(b.logo.abbr.length <= 3).toBe(true);
      expect(/^#[0-9a-f]{6}$/i.test(b.logo.bg)).toBe(true);
      expect(/^#[0-9a-f]{6}$/i.test(b.logo.fg)).toBe(true);
      expect(b.logo.fg.toLowerCase() !== b.logo.bg.toLowerCase()).toBe(true);
      expect(key.length > 0).toBe(true);
    }
  });

  it('uses the agreed display labels', () => {
    expect(BANK_LABELS).toEqual({
      Itau: 'Itaú', Nubank: 'Nubank', Inter: 'Inter', Santander: 'Santander',
      Bradesco: 'Bradesco', Caixa: 'Caixa', BancoDoBrasil: 'Banco do Brasil',
      Btg: 'BTG Pactual', C6Bank: 'C6 Bank', Safra: 'Safra', Sicoob: 'Sicoob',
      Sicredi: 'Sicredi', Original: 'Banco Original', Pan: 'Banco Pan', Neon: 'Neon',
      PicPay: 'PicPay', MercadoPago: 'Mercado Pago', Banrisul: 'Banrisul',
      Next: 'Next', Bmg: 'Banco BMG', Xp: 'XP', PagBank: 'PagBank', Bv: 'Banco BV',
      Outro: 'Outro',
    });
  });

  it('keeps the pre-existing bank colors unchanged', () => {
    expect(BANK_COLORS.Itau).toBe('#f47321');
    expect(BANK_COLORS.Nubank).toBe('#8a05be');
    expect(BANK_COLORS.Inter).toBe('#ff7a00');
    expect(BANK_COLORS.Santander).toBe('#cc0000');
    expect(BANK_COLORS.Bradesco).toBe('#cc092f');
    expect(BANK_COLORS.Caixa).toBe('#006f3d');
  });

  it('derives BANK_LABELS and BANK_COLORS from the module', () => {
    expect(BANK_LABELS).toBe(MODULE_LABELS);
    expect(BANK_COLORS).toBe(MODULE_COLORS);
    for (const [k, b] of Object.entries(BANKS)) {
      expect(BANK_LABELS[k]).toBe(b.label);
      expect(BANK_COLORS[k]).toBe(b.color);
    }
    expect(Object.keys(BANK_LABELS)).toEqual(Object.keys(BANKS));
    expect(Object.keys(BANK_COLORS)).toEqual(Object.keys(BANKS));
  });
});
