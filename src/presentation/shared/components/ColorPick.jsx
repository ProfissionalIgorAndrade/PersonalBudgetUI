import React from 'react';
import { PALETTE, inkOn } from '../../../core/constants/palette';

/**
 * Colour picker.
 *
 * The previous selected state was a white ring plus a slight scale. On a
 * dark surface that ring disappeared against any light swatch - mint, pale
 * yellow, off-white - which is exactly where it was needed most.
 *
 * The selected swatch now carries a tick drawn in whichever of black or
 * white contrasts with it, chosen by luminance rather than by eye, plus a
 * ring separated from the swatch by a gap in the surface colour so it reads
 * on light and dark swatches alike.
 */
export default function ColorPick({ val, onChange, colors = PALETTE }) {
  const list = val && !colors.includes(val) ? [val, ...colors] : colors;

  return (
    <div className="color-opts" role="radiogroup" aria-label="Cor">
      {list.map(c => {
        const selected = val === c;
        return (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={c}
            title={c}
            className={`color-opt ${selected ? 'sel' : ''}`}
            style={{ background: c, color: inkOn(c) }}
            onClick={() => onChange(c)}
          >
            {selected ? '✓' : ''}
          </button>
        );
      })}
    </div>
  );
}
