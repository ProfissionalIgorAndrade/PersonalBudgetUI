import { describe, it, expect } from 'vitest';
import {
  AVATAR_GROUPS, AVATARS, SKIN_TONES,
  applyTone, stripTone, getTone, supportsTone, defaultAvatarFor,
} from '../avatars';
import { EMOJIS, NAV } from '../index';

const TONES = SKIN_TONES.filter(t => t.mod);

describe('applyTone', () => {
  it('applies each of the 5 tones to a simple base', () => {
    expect(TONES).toHaveLength(5);
    TONES.forEach(t => {
      expect(applyTone('👩', t.mod)).toBe('👩' + t.mod);
    });
  });

  it('puts the modifier right after the first code point for hair sequences', () => {
    expect(applyTone('🧑‍🦱', '\u{1F3FD}')).toBe('🧑\u{1F3FD}‍🦱');
    expect(applyTone('👩‍🦰', '\u{1F3FF}')).toBe('👩\u{1F3FF}‍🦰');
    expect(applyTone('🧔‍♀️', '\u{1F3FB}')).toBe('🧔\u{1F3FB}‍♀️');
  });

  it('replaces a previous tone instead of stacking', () => {
    expect(applyTone('👩\u{1F3FB}', '\u{1F3FE}')).toBe('👩\u{1F3FE}');
  });

  it('empty tone returns the base', () => {
    expect(applyTone('👩\u{1F3FD}', '')).toBe('👩');
  });

  it('leaves family sequences untouched', () => {
    expect(applyTone('👨‍👩‍👧‍👦', '\u{1F3FD}')).toBe('👨‍👩‍👧‍👦');
    expect(applyTone('👩‍👧', '\u{1F3FD}')).toBe('👩‍👧');
    expect(applyTone('👪', '\u{1F3FD}')).toBe('👪');
  });

  it('does not tone non-person emoji', () => {
    expect(applyTone('💼', '\u{1F3FD}')).toBe('💼');
    expect(supportsTone('💼')).toBe(false);
  });
});

describe('stripTone / getTone', () => {
  it('round-trips for simple and hair sequences', () => {
    ['👩', '🧑‍🦱', '👩‍🦰', '🧓'].forEach(base => {
      TONES.forEach(t => {
        const toned = applyTone(base, t.mod);
        expect(getTone(toned)).toBe(t.mod);
        expect(stripTone(toned)).toBe(base);
      });
    });
  });

  it('getTone is empty without a modifier and tolerates empty input', () => {
    expect(getTone('👩')).toBe('');
    expect(getTone('')).toBe('');
    expect(getTone(undefined)).toBe('');
    expect(stripTone(undefined)).toBe(undefined);
  });
});

describe('catalog', () => {
  it('has no briefcase or police officer and no duplicates', () => {
    expect(AVATARS.includes('💼')).toBe(false);
    expect(AVATARS.includes('👮')).toBe(false);
    expect(new Set(AVATARS).size).toBe(AVATARS.length);
  });

  it('has the four curated groups and feeds EMOJIS', () => {
    expect(AVATAR_GROUPS.map(g => g.id)).toEqual(['adults', 'elders', 'children', 'families']);
    expect(EMOJIS).toEqual(AVATARS);
  });

  it('only person groups support tone', () => {
    AVATAR_GROUPS.forEach(g => {
      g.items.forEach(e => expect(supportsTone(e)).toBe(g.id !== 'families'));
    });
  });

  it('uses a single glyph for the Família nav icon', () => {
    expect(NAV.find(n => n.id === 'members').icon).toBe('👪');
  });
});

describe('defaultAvatarFor', () => {
  it('gives the family group to Joint profiles', () => {
    expect(defaultAvatarFor('Joint')).toBe('👨‍👩‍👧‍👦');
    expect(defaultAvatarFor('joint')).toBe('👨‍👩‍👧‍👦');
  });

  it('gives the neutral person to everyone else', () => {
    expect(defaultAvatarFor('User')).toBe('🧑');
    expect(defaultAvatarFor('other')).toBe('🧑');
    expect(defaultAvatarFor(undefined)).toBe('🧑');
  });
});
