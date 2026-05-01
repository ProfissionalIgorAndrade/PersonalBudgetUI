import React from 'react';
import { COLORS } from '../../constants';

const EXTRA = ['#1e3a5f','#7c2d12','#134e4a','#312e81','#1c1917','#292524'];

export default function ColorPick({ val, onChange }) {
  return (
    <div className="color-opts">
      {[...COLORS, ...EXTRA].map(c => (
        <div
          key={c}
          className={`color-opt ${val === c ? 'sel' : ''}`}
          style={{ background: c }}
          onClick={() => onChange(c)}
        />
      ))}
    </div>
  );
}
