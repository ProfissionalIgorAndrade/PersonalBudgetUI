import React from 'react';
import { BANKS } from '../../../core/constants/banks';

/**
 * Índice de busca dos bancos conhecidos, derivado de core/constants/banks.js.
 *
 * A chave é a versão lowercase do campo `account.bank`: a chave do enum
 * ('itau', 'bancodobrasil'), o rótulo ('itaú', 'banco do brasil', 'c6 bank')
 * e os apelidos abaixo, para cobrir variações de entrada.
 */
const ALIASES = {
  bb: 'BancoDoBrasil',
  c6: 'C6Bank',
  xp: 'Xp',
  btg: 'Btg',
};

const BANK_INDEX = {};
for (const [key, bank] of Object.entries(BANKS)) {
  BANK_INDEX[key.toLowerCase()] = bank.logo;
  BANK_INDEX[bank.label.toLowerCase()] = bank.logo;
}
for (const [alias, key] of Object.entries(ALIASES)) {
  BANK_INDEX[alias] = BANKS[key].logo;
}

/**
 * Resolve `bank` (string livre) para o logo do banco, ou null se não
 * reconhecido.
 *
 * A normalização é intencional: trim + lowercase. Não usamos remoção de
 * acentos porque as chaves já cobrem as variações mais comuns (itau/itaú).
 */
function resolveBank(bank) {
  if (!bank) return null;
  const key = String(bank).trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(BANK_INDEX, key) ? BANK_INDEX[key] : null;
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
        <span className="bkl-badge" style={{ background: entry.bg, color: entry.fg }}>
          {entry.abbr}
        </span>
      ) : (
        <span className="bkl-fallback">🏦</span>
      )}
    </span>
  );
}
