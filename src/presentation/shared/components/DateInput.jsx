import React from 'react';

function formatBR(iso) {
  if (!iso || iso.length < 10) return '';
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

export default function DateInput({ value, onChange, required, className, style }) {
  return (
    <div style={{ position: 'relative', ...style }}>
      <input
        type="date"
        required={required}
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`form-input ${className || ''}`}
        style={{ color: 'transparent', caretColor: 'transparent', width: '100%' }}
      />
      <span style={{
        position: 'absolute',
        left: 12,
        top: '50%',
        transform: 'translateY(-50%)',
        pointerEvents: 'none',
        color: value ? 'var(--text)' : 'var(--muted)',
        fontSize: 14,
      }}>
        {value ? formatBR(value) : 'DD/MM/AAAA'}
      </span>
    </div>
  );
}
