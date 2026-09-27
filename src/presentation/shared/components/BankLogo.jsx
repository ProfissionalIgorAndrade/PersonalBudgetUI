import React from 'react';

/**
 * Mapa de bancos/instituições conhecidos.
 *
 * A chave é a versão lowercase do campo `account.bank` (e.g. 'nubank',
 * 'itau'). Inclui variações com e sem acento para cobrir possíveis variações
 * de entrada, mesmo que o formulário normalmente use as chaves canônicas de
 * BANK_LABELS.
 */
const BANK_MAP = {
  nubank:           { abbr: 'NU',  bg: '#8a05be' },
  inter:            { abbr: 'IN',  bg: '#ff7a00' },
  itaú:             { abbr: 'IT',  bg: '#f47321' },
  itau:             { abbr: 'IT',  bg: '#f47321' },
  santander:        { abbr: 'S',   bg: '#cc0000' },
  bradesco:         { abbr: 'BRA', bg: '#cc092f' },
  caixa:            { abbr: 'CEF', bg: '#006f3d' },
  bb:               { abbr: 'BB',  bg: '#005faf' },
  'banco do brasil':{ abbr: 'BB',  bg: '#005faf' },
  c6:               { abbr: 'C6',  bg: '#1a1a1a' },
  xp:               { abbr: 'XP',  bg: '#1a1a1a' },
  btg:              { abbr: 'BTG', bg: '#0c2340' },
};

/**
 * Resolve `bank` (string livre) para a entrada do BANK_MAP, ou null se não
 * reconhecido.
 *
 * A normalização é intencional: trim + lowercase. Não usamos remoção de
 * acentos porque as chaves já cobrem as variações mais comuns (itau/itaú).
 */
function resolveBank(bank) {
  if (!bank) return null;
  const key = String(bank).trim().toLowerCase();
  return BANK_MAP[key] ?? null;
}

/**
 * BankLogo
 *
 * Badge visual identificando o banco/instituição de uma conta.
 * CSS-only, sem imagens externas — segue a mesma filosofia de CardBrandLogo.
 *
 * Decorativo: `aria-hidden` em todos os elementos visuais, pois o nome do
 * banco está sempre visível ao lado no contexto de uso.
 *
 * Props:
 *   bank  — string; valor de `account.bank` (e.g. 'Nubank', 'Itau')
 *   size  — 'sm' | 'md' | 'lg'  (default: 'md')
 */
export default function BankLogo({ bank, size = 'md' }) {
  const entry = resolveBank(bank);

  return (
    <span className={`bkl bkl-${size}`} aria-hidden="true">
      {entry ? (
        <span className="bkl-badge" style={{ background: entry.bg }}>
          {entry.abbr}
        </span>
      ) : (
        <span className="bkl-fallback">🏦</span>
      )}
    </span>
  );
}
