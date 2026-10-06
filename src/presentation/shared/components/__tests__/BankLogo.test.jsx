import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';
import BankLogo from '../BankLogo';
import { BANKS } from '../../../../core/constants/banks';

afterEach(cleanup);

// ── Bancos conhecidos ────────────────────────────────────────────────────────

describe('BankLogo — bancos conhecidos', () => {
  it('renderiza badge NU para Nubank', () => {
    const { container } = render(<BankLogo bank="Nubank" />);
    const badge = container.querySelector('.bkl-badge');
    expect(badge).toBeTruthy();
    expect(badge.textContent).toBe('NU');
  });

  it('renderiza badge IT para Itau (sem acento)', () => {
    const { container } = render(<BankLogo bank="Itau" />);
    const badge = container.querySelector('.bkl-badge');
    expect(badge).toBeTruthy();
    expect(badge.textContent).toBe('IT');
  });

  it('renderiza badge IT para Itaú (com acento)', () => {
    const { container } = render(<BankLogo bank="Itaú" />);
    const badge = container.querySelector('.bkl-badge');
    expect(badge).toBeTruthy();
    expect(badge.textContent).toBe('IT');
  });

  it('renderiza badge IN para Inter', () => {
    const { container } = render(<BankLogo bank="Inter" />);
    expect(container.querySelector('.bkl-badge').textContent).toBe('IN');
  });

  it('renderiza badge S para Santander', () => {
    const { container } = render(<BankLogo bank="Santander" />);
    expect(container.querySelector('.bkl-badge').textContent).toBe('S');
  });

  it('renderiza badge BRA para Bradesco', () => {
    const { container } = render(<BankLogo bank="Bradesco" />);
    expect(container.querySelector('.bkl-badge').textContent).toBe('BRA');
  });

  it('renderiza badge CEF para Caixa', () => {
    const { container } = render(<BankLogo bank="Caixa" />);
    expect(container.querySelector('.bkl-badge').textContent).toBe('CEF');
  });

  it('renderiza badge BB para Banco do Brasil', () => {
    const { container } = render(<BankLogo bank="banco do brasil" />);
    expect(container.querySelector('.bkl-badge').textContent).toBe('BB');
  });

  it('aplica a cor de fundo do banco via style inline', () => {
    const { container } = render(<BankLogo bank="Nubank" />);
    const badge = container.querySelector('.bkl-badge');
    // jsdom normaliza hex para rgb; basta confirmar que background está definido
    expect(badge.style.background).toBeTruthy();
  });
});

// ── Normalização de entrada ──────────────────────────────────────────────────

describe('BankLogo — normalização', () => {
  it('é case-insensitive (NUBANK → NU)', () => {
    const { container } = render(<BankLogo bank="NUBANK" />);
    expect(container.querySelector('.bkl-badge').textContent).toBe('NU');
  });

  it('é case-insensitive (nubank → NU)', () => {
    const { container } = render(<BankLogo bank="nubank" />);
    expect(container.querySelector('.bkl-badge').textContent).toBe('NU');
  });

  it('ignora espaços extras ao redor do nome', () => {
    const { container } = render(<BankLogo bank="  Inter  " />);
    expect(container.querySelector('.bkl-badge').textContent).toBe('IN');
  });

  it('cobre variação com acento: Itaú', () => {
    const { container } = render(<BankLogo bank="Itaú" />);
    expect(container.querySelector('.bkl-badge').textContent).toBe('IT');
  });

  it('cobre variação sem acento: Itau', () => {
    const { container } = render(<BankLogo bank="Itau" />);
    expect(container.querySelector('.bkl-badge').textContent).toBe('IT');
  });
});

// ── Fallback ─────────────────────────────────────────────────────────────────

describe('BankLogo — fallback', () => {
  it('mostra fallback 🏦 para banco desconhecido', () => {
    const { container } = render(<BankLogo bank="BancoXYZ" />);
    expect(container.querySelector('.bkl-fallback')).toBeTruthy();
    expect(container.querySelector('.bkl-badge')).toBeNull();
  });

  it('mostra fallback para string vazia', () => {
    const { container } = render(<BankLogo bank="" />);
    expect(container.querySelector('.bkl-fallback')).toBeTruthy();
  });

  it('mostra fallback quando bank é undefined', () => {
    const { container } = render(<BankLogo />);
    expect(container.querySelector('.bkl-fallback')).toBeTruthy();
  });

  it('mostra fallback quando bank é null', () => {
    const { container } = render(<BankLogo bank={null} />);
    expect(container.querySelector('.bkl-fallback')).toBeTruthy();
  });

  it('nunca renderiza imagem quebrada ou caixa vazia', () => {
    const { container } = render(<BankLogo bank="BancoInexistente" />);
    // Confirma que algum elemento visual sempre está presente
    const visual = container.querySelector('.bkl-badge, .bkl-fallback');
    expect(visual).toBeTruthy();
  });
});

// ── Tamanhos ─────────────────────────────────────────────────────────────────

describe('BankLogo — tamanhos', () => {
  it('aplica classe bkl-sm quando size="sm"', () => {
    const { container } = render(<BankLogo bank="Nubank" size="sm" />);
    expect(container.querySelector('.bkl-sm')).toBeTruthy();
  });

  it('aplica classe bkl-md quando size="md" (padrão)', () => {
    const { container } = render(<BankLogo bank="Nubank" />);
    expect(container.querySelector('.bkl-md')).toBeTruthy();
  });

  it('aplica classe bkl-lg quando size="lg"', () => {
    const { container } = render(<BankLogo bank="Nubank" size="lg" />);
    expect(container.querySelector('.bkl-lg')).toBeTruthy();
  });

  it('fallback também respeita o tamanho sm', () => {
    const { container } = render(<BankLogo bank="Desconhecido" size="sm" />);
    expect(container.querySelector('.bkl-sm .bkl-fallback')).toBeTruthy();
  });
});

// ── Acessibilidade ────────────────────────────────────────────────────────────

describe('BankLogo — acessibilidade', () => {
  it('o elemento raiz é decorativo (aria-hidden)', () => {
    const { container } = render(<BankLogo bank="Nubank" />);
    expect(container.querySelector('[aria-hidden="true"]')).toBeTruthy();
  });

  it('o fallback também é decorativo (aria-hidden no elemento raiz)', () => {
    const { container } = render(<BankLogo bank="Desconhecido" />);
    expect(container.querySelector('.bkl[aria-hidden="true"]')).toBeTruthy();
  });
});

// ── Multiempresarial ──────────────────────────────────────────────────────────

describe('BankLogo — contexto multi-titular', () => {
  it('mesmo banco para titulares diferentes renderiza o mesmo badge', () => {
    const { container: c1 } = render(<BankLogo bank="Nubank" />);
    const { container: c2 } = render(<BankLogo bank="Nubank" />);
    expect(c1.querySelector('.bkl-badge').textContent)
      .toBe(c2.querySelector('.bkl-badge').textContent);
  });

  it('bancos diferentes renderizam badges distintos', () => {
    const { container: cNu } = render(<BankLogo bank="Nubank" />);
    const { container: cIn } = render(<BankLogo bank="Inter" />);
    expect(cNu.querySelector('.bkl-badge').textContent)
      .not.toBe(cIn.querySelector('.bkl-badge').textContent);
  });
});

// ── Todos os bancos do módulo ─────────────────────────────────────────────────

describe('BankLogo — módulo de bancos', () => {
  it('renderiza sigla do módulo para cada chave do enum', () => {
    for (const [key, b] of Object.entries(BANKS)) {
      const { container, unmount } = render(<BankLogo bank={key} />);
      const badge = container.querySelector('.bkl-badge');
      expect(badge).toBeTruthy();
      expect(badge.textContent).toBe(b.logo.abbr);
      unmount();
    }
  });

  it('renderiza o badge também pelo rótulo de exibição', () => {
    for (const [, b] of Object.entries(BANKS)) {
      const { container, unmount } = render(<BankLogo bank={b.label} />);
      expect(container.querySelector('.bkl-badge').textContent).toBe(b.logo.abbr);
      unmount();
    }
  });

  it('aplica fundo e cor do texto do banco', () => {
    const { container } = render(<BankLogo bank="BancoDoBrasil" />);
    const badge = container.querySelector('.bkl-badge');
    expect(badge.style.background).toBeTruthy();
    expect(badge.style.color).toBeTruthy();
    expect(badge.style.color === badge.style.backgroundColor).toBe(false);
  });

  it.each([
    ['itaú', 'IT'], ['bb', 'BB'], ['banco do brasil', 'BB'],
    ['c6', 'C6'], ['xp', 'XP'], ['btg', 'BTG'],
    ['  BancoDoBrasil ', 'BB'], ['C6BANK', 'C6'], ['mercado pago', 'MP'],
  ])('mantém o apelido/normalização %s -> %s', (bank, abbr) => {
    const { container } = render(<BankLogo bank={bank} />);
    expect(container.querySelector('.bkl-badge').textContent).toBe(abbr);
  });

  it('não confunde nomes do protótipo de objeto com bancos', () => {
    const { container } = render(<BankLogo bank="constructor" />);
    expect(container.querySelector('.bkl-fallback')).toBeTruthy();
  });
});
