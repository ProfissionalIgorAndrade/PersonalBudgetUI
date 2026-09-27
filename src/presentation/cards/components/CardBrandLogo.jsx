import React from 'react';

const ISSUER_MAP = {
  nubank:    { label: 'N',   bg: '#8a05be' },
  inter:     { label: 'I',   bg: '#ff7a00' },
  itaú:      { label: 'I',   bg: '#f47321' },
  itau:      { label: 'I',   bg: '#f47321' },
  santander: { label: 'S',   bg: '#cc0000' },
  bradesco:  { label: 'B',   bg: '#cc092f' },
  c6:        { label: 'C6',  bg: '#1a1a1a' },
  xp:        { label: 'XP',  bg: '#1a1a1a' },
  btg:       { label: 'BTG', bg: '#0c2340' },
  caixa:     { label: 'C',   bg: '#006f3d' },
  bb:        { label: 'BB',  bg: '#005faf' },
};

function detectIssuer(cardName) {
  if (!cardName) return null;
  const lower = cardName.toLowerCase();
  for (const [key, val] of Object.entries(ISSUER_MAP)) {
    if (lower.includes(key)) return val;
  }
  return null;
}

const FLAG_TEXT = {
  visa:  'VISA',
  elo:   'ELO',
  amex:  'AMEX',
  hiper: 'HIPER',
};

/**
 * CardBrandLogo
 *
 * Renderiza o mark da bandeira (CSS puro, sem imagens externas) e um badge
 * opcional do emissor detectado automaticamente pelo nome do cartão.
 *
 * Props:
 *   flag      — 'visa'|'master'|'elo'|'amex'|'hiper'|'other'
 *   cardName  — string opcional; usado para detectar o emissor
 *   size      — 'sm' | 'md' (default: 'md')
 */
export default function CardBrandLogo({ flag, cardName, size = 'md' }) {
  const issuer = detectIssuer(cardName);
  const cls = `cbl cbl-${size}`;

  let mark;
  if (flag === 'master') {
    mark = (
      <span className="cbl-master" aria-label="Mastercard" />
    );
  } else if (FLAG_TEXT[flag]) {
    mark = (
      <span className={`cbl-flag-text cbl-${flag}`} aria-label={FLAG_TEXT[flag]}>
        {FLAG_TEXT[flag]}
      </span>
    );
  } else {
    // 'other' ou desconhecido
    mark = (
      <span className="cbl-other" aria-label="Cartão">💳</span>
    );
  }

  return (
    <span className={cls}>
      {mark}
      {issuer && (
        <span
          className="cbl-issuer"
          style={{ background: issuer.bg }}
          aria-label={issuer.label}
        >
          {issuer.label}
        </span>
      )}
    </span>
  );
}
