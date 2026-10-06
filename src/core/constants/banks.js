/**
 * Fonte única de metadados de bancos.
 *
 * As chaves são exatamente os nomes do enum `Bank` aceitos e devolvidos pela
 * API em `account.bank` — renomear uma chave quebra o contrato com o backend.
 * Para cada banco:
 *   label — nome de exibição
 *   color — cor da marca (#rrggbb; `hexDarken` do AccountTile fatia a string)
 *   logo  — badge CSS: sigla curta (até 3 letras), fundo e cor do texto
 *           (`fg` escolhido pelo contraste com `bg`)
 */
export const BANKS = {
  Itau:          { label: 'Itaú',           color: '#f47321', logo: { abbr: 'IT',  bg: '#f47321', fg: '#ffffff' } },
  Nubank:        { label: 'Nubank',         color: '#8a05be', logo: { abbr: 'NU',  bg: '#8a05be', fg: '#ffffff' } },
  Inter:         { label: 'Inter',          color: '#ff7a00', logo: { abbr: 'IN',  bg: '#ff7a00', fg: '#ffffff' } },
  Santander:     { label: 'Santander',      color: '#cc0000', logo: { abbr: 'S',   bg: '#cc0000', fg: '#ffffff' } },
  Bradesco:      { label: 'Bradesco',       color: '#cc092f', logo: { abbr: 'BRA', bg: '#cc092f', fg: '#ffffff' } },
  Caixa:         { label: 'Caixa',          color: '#006f3d', logo: { abbr: 'CEF', bg: '#006f3d', fg: '#ffffff' } },
  BancoDoBrasil: { label: 'Banco do Brasil', color: '#fcd116', logo: { abbr: 'BB',  bg: '#fcd116', fg: '#0b3a8c' } },
  Btg:           { label: 'BTG Pactual',    color: '#0c2340', logo: { abbr: 'BTG', bg: '#0c2340', fg: '#ffffff' } },
  C6Bank:        { label: 'C6 Bank',        color: '#242424', logo: { abbr: 'C6',  bg: '#242424', fg: '#ffffff' } },
  Safra:         { label: 'Safra',          color: '#0a2f5c', logo: { abbr: 'SF',  bg: '#0a2f5c', fg: '#ffffff' } },
  Sicoob:        { label: 'Sicoob',         color: '#00a091', logo: { abbr: 'SCB', bg: '#00a091', fg: '#ffffff' } },
  Sicredi:       { label: 'Sicredi',        color: '#3fa535', logo: { abbr: 'SCR', bg: '#3fa535', fg: '#ffffff' } },
  Original:      { label: 'Banco Original', color: '#1fa447', logo: { abbr: 'OR',  bg: '#1fa447', fg: '#ffffff' } },
  Pan:           { label: 'Banco Pan',      color: '#0090e3', logo: { abbr: 'PAN', bg: '#0090e3', fg: '#ffffff' } },
  Neon:          { label: 'Neon',           color: '#00e5e5', logo: { abbr: 'NE',  bg: '#00e5e5', fg: '#06303a' } },
  PicPay:        { label: 'PicPay',         color: '#21c25e', logo: { abbr: 'PP',  bg: '#21c25e', fg: '#ffffff' } },
  MercadoPago:   { label: 'Mercado Pago',   color: '#00b1ea', logo: { abbr: 'MP',  bg: '#00b1ea', fg: '#ffffff' } },
  Banrisul:      { label: 'Banrisul',       color: '#0057a8', logo: { abbr: 'BRS', bg: '#0057a8', fg: '#ffffff' } },
  Next:          { label: 'Next',           color: '#00ff5f', logo: { abbr: 'NX',  bg: '#00ff5f', fg: '#0a2e14' } },
  Bmg:           { label: 'Banco BMG',      color: '#f26522', logo: { abbr: 'BMG', bg: '#f26522', fg: '#ffffff' } },
  Xp:            { label: 'XP',             color: '#1a1a1a', logo: { abbr: 'XP',  bg: '#1a1a1a', fg: '#ffd400' } },
  PagBank:       { label: 'PagBank',        color: '#3ab54a', logo: { abbr: 'PAG', bg: '#3ab54a', fg: '#ffffff' } },
  Bv:            { label: 'Banco BV',       color: '#0033a0', logo: { abbr: 'BV',  bg: '#0033a0', fg: '#ffffff' } },
  Outro:         { label: 'Outro',          color: '#64748b', logo: { abbr: '•••', bg: '#64748b', fg: '#ffffff' } },
};

/** Chave do enum -> rótulo de exibição. */
export const BANK_LABELS = Object.fromEntries(
  Object.entries(BANKS).map(([k, b]) => [k, b.label]),
);

/** Chave do enum -> cor da marca (#rrggbb). */
export const BANK_COLORS = Object.fromEntries(
  Object.entries(BANKS).map(([k, b]) => [k, b.color]),
);
