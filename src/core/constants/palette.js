/**
 * Colour palette for categories, cards and members.
 *
 * Grouped by hue so the picker reads as a spectrum rather than a scatter,
 * with three steps per family: light, mid and deep. Every entry is legible
 * against the dark surface the picker sits on - no near-blacks that vanish
 * into the background.
 */
export const PALETTE = [
  // teal / cyan
  '#5eead4', '#2dd4bf', '#0d9488',
  // green
  '#86efac', '#4ade80', '#16a34a',
  // lime / olive
  '#bef264', '#a3e635', '#65a30d',
  // yellow / amber
  '#fde047', '#fbbf24', '#d97706',
  // orange
  '#fdba74', '#fb923c', '#ea580c',
  // red
  '#fca5a5', '#f87171', '#dc2626',
  // pink
  '#f9a8d4', '#f472b6', '#db2777',
  // fuchsia / magenta
  '#f0abfc', '#e879f9', '#c026d3',
  // purple
  '#d8b4fe', '#a78bfa', '#7c3aed',
  // indigo
  '#a5b4fc', '#818cf8', '#4f46e5',
  // blue
  '#93c5fd', '#60a5fa', '#2563eb',
  // sky
  '#7dd3fc', '#38bdf8', '#0284c7',
  // warm neutrals
  '#d6d3d1', '#a8a29e', '#78716c',
  // cool neutrals
  '#cbd5e1', '#94a3b8', '#475569',
];

/**
 * Relative luminance per WCAG, used to decide whether the selected-state
 * tick should be drawn dark or light on a given swatch. Picking by eye
 * breaks on the mid tones, where neither is obviously right.
 *
 * @param {string} hex colour as '#rrggbb'
 * @returns {number} 0 (black) to 1 (white)
 */
export function luminance(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const [r, g, b] = [0, 2, 4].map(i => parseInt(full.slice(i, i + 2), 16) / 255);
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** Best contrasting ink for text or a tick drawn on top of `hex`. */
export const inkOn = (hex) => (luminance(hex) > 0.45 ? '#0b0f14' : '#ffffff');
