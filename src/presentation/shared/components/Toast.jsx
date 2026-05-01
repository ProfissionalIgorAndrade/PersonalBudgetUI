import React, { useEffect } from 'react';

export default function Toast({ msg, type = 'success', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, type === 'error' ? 4200 : 2800);
    return () => clearTimeout(t);
  }, [onClose, type]);

  const isError = type === 'error';
  return (
    <div className="toast" style={{
      background: isError ? 'var(--red)'  : 'var(--surface2)',
      color:      isError ? '#fff'        : 'var(--text)',
      border:     isError ? 'none'        : '1px solid var(--border)',
    }}>
      {isError ? '⚠ ' : '✓ '}{msg}
    </div>
  );
}
