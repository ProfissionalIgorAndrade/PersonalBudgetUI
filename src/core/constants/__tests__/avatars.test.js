import { describe, it, expect } from 'vitest';
import {
  AVATAR_GROUPS, AVATARS, SKIN_TONES,
  applyTone, stripTone, getTone, supportsTone, defaultAvatarFor, countPeople,
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

  it('applies each tone to every person of a composed family', () => {
    TONES.forEach(t => {
      expect(applyTone('👨👩👧👦', t.mod)).toBe(`👨${t.mod}👩${t.mod}👧${t.mod}👦${t.mod}`);
    });
    expect(applyTone('👨👩👧👦', '\u{1F3FD}')).toBe('👨🏽👩🏽👧🏽👦🏽');
  });

  it('replaces a previous tone on a composed family instead of stacking', () => {
    expect(applyTone('👨🏻👩🏻', '\u{1F3FF}')).toBe('👨🏿👩🏿');
    expect(applyTone('👨🏻👩🏻', '')).toBe('👨👩');
  });

  it('leaves legacy ZWJ family sequences untouched', () => {
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

  it('round-trips for composed families', () => {
    AVATAR_GROUPS.find(g => g.id === 'families').items.forEach(base => {
      TONES.forEach(t => {
        const toned = applyTone(base, t.mod);
        expect(getTone(toned)).toBe(t.mod);
        expect(stripTone(toned)).toBe(base);
      });
    });
  });

  it('legacy ZWJ family values round-trip unchanged', () => {
    ['👨‍👩‍👧‍👦', '👩‍👧', '👪'].forEach(e => {
      expect(stripTone(e)).toBe(e);
      expect(getTone(e)).toBe('');
      expect(applyTone(e, '')).toBe(e);
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

  it('every catalog item supports tone, including composed families', () => {
    AVATAR_GROUPS.forEach(g => g.items.forEach(e => expect(supportsTone(e)).toBe(true)));
  });

  it('family items are plain people without ZWJ', () => {
    AVATAR_GROUPS.find(g => g.id === 'families').items.forEach(e => {
      expect(e.includes('\u200D')).toBe(false);
      expect(countPeople(e) > 1).toBe(true);
    });
  });

  it('legacy ZWJ family values and 👪 do not support tone', () => {
    ['👨‍👩‍👧‍👦', '👩‍👧', '🧑‍🧑‍🧒', '👪'].forEach(e => expect(supportsTone(e)).toBe(false));
  });

  it('uses 👫 (single code point) for the Família nav icon', () => {
    const icon = NAV.find(n => n.id === 'members').icon;
    expect(icon).toBe('\u{1F46B}');
    expect(Array.from(icon)).toHaveLength(1);
  });
});

describe('defaultAvatarFor', () => {
  it('gives the family group to Joint profiles', () => {
    expect(defaultAvatarFor('Joint')).toBe('👨👩👧👦');
    expect(defaultAvatarFor('joint')).toBe('👨👩👧👦');
    expect(getTone(defaultAvatarFor('Joint'))).toBe('');
  });

  it('gives the neutral person to everyone else', () => {
    expect(defaultAvatarFor('User')).toBe('🧑');
    expect(defaultAvatarFor('other')).toBe('🧑');
    expect(defaultAvatarFor(undefined)).toBe('🧑');
  });
});

describe('countPeople', () => {
  it('counts 1 for a single person, with or without tone or hair sequence', () => {
    expect(countPeople('👩')).toBe(1);
    expect(countPeople('👩🏽')).toBe(1);
    expect(countPeople('🧑‍🦱')).toBe(1);
    expect(countPeople('🧑🏽‍🦱')).toBe(1);
  });

  it('counts each person of a composed family, toned or not', () => {
    expect(countPeople('👨👩')).toBe(2);
    expect(countPeople('👨👩👧')).toBe(3);
    expect(countPeople('👨👩👧👦')).toBe(4);
    expect(countPeople('👨🏽👩🏽👧🏽👦🏽')).toBe(4);
  });

  it('counts legacy ZWJ families as 1 glyph (they render as a single emoji)', () => {
    expect(countPeople('👨‍👩‍👧‍👦')).toBe(1);
    expect(countPeople('👪')).toBe(1);
  });

  it('is 0 for empty input', () => {
    expect(countPeople('')).toBe(0);
    expect(countPeople(undefined)).toBe(0);
  });
});
