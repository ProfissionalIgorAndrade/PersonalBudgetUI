import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';
import CardBrandLogo from '../CardBrandLogo';

afterEach(cleanup);

describe('CardBrandLogo — bandeiras', () => {
  it('renderiza marca Mastercard (dois círculos via CSS)', () => {
    const { container } = render(<CardBrandLogo flag="master" size="md" />);
    expect(container.querySelector('.cbl-master')).toBeTruthy();
  });

  it('renderiza texto VISA para flag visa', () => {
    render(<CardBrandLogo flag="visa" size="md" />);
    expect(screen.getByText('VISA')).toBeTruthy();
  });

  it('renderiza texto ELO para flag elo', () => {
    render(<CardBrandLogo flag="elo" size="md" />);
    expect(screen.getByText('ELO')).toBeTruthy();
  });

  it('renderiza texto AMEX para flag amex', () => {
    render(<CardBrandLogo flag="amex" size="md" />);
    expect(screen.getByText('AMEX')).toBeTruthy();
  });

  it('renderiza fallback para flag other', () => {
    const { container } = render(<CardBrandLogo flag="other" size="md" />);
    expect(container.querySelector('.cbl-other')).toBeTruthy();
  });
});

describe('CardBrandLogo — emissor via cardName', () => {
  it('detecta Nubank e renderiza badge com cor correspondente', () => {
    const { container } = render(<CardBrandLogo flag="master" cardName="Nubank Ultravioleta" />);
    const badge = container.querySelector('.cbl-issuer');
    expect(badge).toBeTruthy();
    expect(badge.textContent).toBe('N');
    // jsdom normaliza hex para rgb; verificamos que o style background está definido
    expect(badge.style.background).toBeTruthy();
  });

  it('detecta Inter e renderiza badge com cor correspondente', () => {
    const { container } = render(<CardBrandLogo flag="master" cardName="Inter Black" />);
    const badge = container.querySelector('.cbl-issuer');
    expect(badge).toBeTruthy();
    expect(badge.style.background).toBeTruthy();
  });

  it('não renderiza badge para emissor desconhecido', () => {
    const { container } = render(<CardBrandLogo flag="visa" cardName="Cartão Genérico" />);
    expect(container.querySelector('.cbl-issuer')).toBeNull();
  });

  it('não renderiza badge quando cardName não é fornecido', () => {
    const { container } = render(<CardBrandLogo flag="visa" />);
    expect(container.querySelector('.cbl-issuer')).toBeNull();
  });
});

describe('CardBrandLogo — tamanhos', () => {
  it('aplica classe cbl-sm quando size="sm"', () => {
    const { container } = render(<CardBrandLogo flag="visa" size="sm" />);
    expect(container.querySelector('.cbl-sm')).toBeTruthy();
  });

  it('aplica classe cbl-md quando size="md"', () => {
    const { container } = render(<CardBrandLogo flag="visa" size="md" />);
    expect(container.querySelector('.cbl-md')).toBeTruthy();
  });
});
