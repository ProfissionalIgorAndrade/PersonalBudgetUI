import React from 'react';

/**
 * `size` aceita 'default' (540px), 'wide' (720px) e 'full' (96vw, até 1400px).
 * A prop `wide` continua valendo para quem já a usa.
 */
export default function Modal({ title, onClose, children, wide, size }) {
  const cls = size === 'full' ? 'modal-full' : (size === 'wide' || wide) ? 'modal-wide' : '';
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${cls}`}>
        <div className="flex jcb aic" style={{ marginBottom: 20 }}>
          <h2 className="modal-title" style={{ margin: 0 }}>{title}</h2>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
