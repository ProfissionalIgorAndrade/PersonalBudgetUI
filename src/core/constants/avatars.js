/**
 * Avatares de membros: pessoas curadas em grupos, tom de pele e padrão por tipo.
 *
 * Este módulo não importa de `constants/index` (o índice deriva EMOJIS daqui).
 */

export const AVATAR_GROUPS = [
  { id: 'adults',   label: 'Adultos',   items: ['🧑', '👨', '👩', '🧔', '🧔‍♀️', '👱‍♂️', '👱‍♀️', '🧑‍🦱', '👩‍🦰', '👨‍🦲'] },
  { id: 'elders',   label: 'Idosos',    items: ['🧓', '👴', '👵'] },
  { id: 'children', label: 'Crianças',  items: ['👶', '🧒', '👦', '👧'] },
  { id: 'families', label: 'Famílias',  items: ['👨👩', '👨👩👧', '👨👩👦', '👨👩👧👦', '👩👩👧', '👨👨👦', '👩👧', '👨👦', '🧑🧑🧒'] },
];

/**
 * Grupos de pessoas aceitam tom de pele. Em `families` cada item é uma
 * composição de pessoas simples (sem ZWJ), então o tom vale para cada uma.
 */
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

/** Pessoas de um único ponto de código, que podem ser compostas lado a lado. */
const SINGLE_PEOPLE = new Set([...PERSON_BASES].filter(e => Array.from(e).length === 1));

/** Composição = 2+ pessoas simples coladas, sem ZWJ (legado 👨‍👩‍👧‍👦 e 👪 ficam de fora). */
const isComposition = (base) => {
  const cps = Array.from(base);
  return cps.length > 1 && cps.every(c => SINGLE_PEOPLE.has(c));
};

export const stripTone = (e) => (e ? e.replace(TONE_RE, '') : e);

export const getTone = (e) => {
  const m = (e || '').match(TONE_FIRST_RE);
  return m ? m[0] : '';
};

/**
 * Uma pessoa ou composição de pessoas simples aceita tom. Valores legados com
 * ZWJ de família (👨‍👩‍👧‍👦) e 👪 não aceitam: continuam válidos, só sem tom.
 */
export const supportsTone = (e) => {
  const base = stripTone(e || '');
  return PERSON_BASES.has(base) || isComposition(base);
};

/**
 * O modificador vai logo depois do primeiro ponto de código, não no fim:
 * 🧑‍🦱 + tom = 🧑🏽‍🦱. No fim da sequência o resultado quebra em dois glifos.
 * Em composições, vai depois de cada pessoa: 👨👩 + tom = 👨🏽👩🏽.
 */
export function applyTone(emoji, tone) {
  const base = stripTone(emoji || '');
  if (!tone || !supportsTone(base)) return base;
  if (isComposition(base)) return Array.from(base).map(c => c + tone).join('');
  const [first, ...rest] = Array.from(base);
  return first + tone + rest.join('');
}

const isTone  = (c) => c >= '\u{1F3FB}' && c <= '\u{1F3FF}';

/**
 * Quantidade de pessoas (glifos) do avatar, para o layout. Um glifo começa em
 * cada ponto de código que não seja tom, ZWJ/VS16 nem venha logo após um ZWJ;
 * então 👨🏽👩🏽 conta 2. Sequências ZWJ legadas (👨‍👩‍👧‍👦) e 👪 contam 1, pois
 * renderizam como um único glifo. Vazio conta 0.
 */
export function countPeople(emoji) {
  let n = 0;
  let afterZwj = false;
  Array.from(emoji || '').forEach((c) => {
    if (isTone(c) || c === '\uFE0F') return;
    if (c === '\u200D') { afterZwj = true; return; }
    if (!afterZwj) n += 1;
    afterZwj = false;
  });
  return n;
}

const isJoint = (kind) => String(kind ?? '').toLowerCase() === 'joint';

/** Perfil conjunto ("Família"/"Casal") ganha o grupo familiar; os demais, a pessoa neutra. */
export const defaultAvatarFor = (kind) => (isJoint(kind) ? '👨👩👧👦' : '🧑');
