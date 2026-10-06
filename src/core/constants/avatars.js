/**
 * Avatares de membros: pessoas curadas em grupos, tom de pele e padrão por tipo.
 *
 * Este módulo não importa de `constants/index` (o índice deriva EMOJIS daqui).
 */

export const AVATAR_GROUPS = [
  { id: 'adults',   label: 'Adultos',   items: ['🧑', '👨', '👩', '🧔', '🧔‍♀️', '👱‍♂️', '👱‍♀️', '🧑‍🦱', '👩‍🦰', '👨‍🦲'] },
  { id: 'elders',   label: 'Idosos',    items: ['🧓', '👴', '👵'] },
  { id: 'children', label: 'Crianças',  items: ['👶', '🧒', '👦', '👧'] },
  { id: 'families', label: 'Famílias',  items: ['👨‍👩‍👧‍👦', '👨‍👩‍👧', '👨‍👩‍👦', '👩‍👩‍👧', '👨‍👨‍👦', '👩‍👧', '👨‍👦', '🧑‍🧑‍🧒', '👪'] },
];

/** Grupos cujos itens são uma pessoa só e, por isso, aceitam tom de pele. */
const PERSON_GROUP_IDS = ['adults', 'elders', 'children'];

const TONE_RE        = /[\u{1F3FB}-\u{1F3FF}]/gu;
const TONE_FIRST_RE  = /[\u{1F3FB}-\u{1F3FF}]/u;

export const SKIN_TONES = [
  { id: 'default', label: 'Padrão',       mod: '',          swatch: '#FFD43B' },
  { id: 'light',   label: 'Claro',        mod: '\u{1F3FB}', swatch: '#F7D7C4' },
  { id: 'mlight',  label: 'Médio-claro',  mod: '\u{1F3FC}', swatch: '#D8B094' },
  { id: 'medium',  label: 'Médio',        mod: '\u{1F3FD}', swatch: '#BA8B5F' },
  { id: 'mdark',   label: 'Médio-escuro', mod: '\u{1F3FE}', swatch: '#8D5B3A' },
  { id: 'dark',    label: 'Escuro',       mod: '\u{1F3FF}', swatch: '#5C3A28' },
];

export const AVATARS = AVATAR_GROUPS.flatMap(g => g.items);

const PERSON_BASES = new Set(
  AVATAR_GROUPS.filter(g => PERSON_GROUP_IDS.includes(g.id)).flatMap(g => g.items),
);

export const stripTone = (e) => (e ? e.replace(TONE_RE, '') : e);

export const getTone = (e) => {
  const m = (e || '').match(TONE_FIRST_RE);
  return m ? m[0] : '';
};

/** Só as bases de uma pessoa aceitam tom; combinações de família não. */
export const supportsTone = (e) => PERSON_BASES.has(stripTone(e || ''));

/**
 * O modificador vai logo depois do primeiro ponto de código, não no fim:
 * 🧑‍🦱 + tom = 🧑🏽‍🦱. No fim da sequência o resultado quebra em dois glifos.
 */
export function applyTone(emoji, tone) {
  const base = stripTone(emoji || '');
  if (!tone || !supportsTone(base)) return base;
  const [first, ...rest] = Array.from(base);
  return first + tone + rest.join('');
}

const isJoint = (kind) => String(kind ?? '').toLowerCase() === 'joint';

/** Perfil conjunto ("Família"/"Casal") ganha o grupo familiar; os demais, a pessoa neutra. */
export const defaultAvatarFor = (kind) => (isJoint(kind) ? '👨‍👩‍👧‍👦' : '🧑');
