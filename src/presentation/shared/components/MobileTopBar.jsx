import React from 'react';
import { NAV } from '../../../core/constants';

const EXTRA_TITLES = { profile: 'Meu Perfil' };

/**
 * Barra do topo que só aparece em telas estreitas (mobile.css). No desktop a
 * sidebar fica sempre visível e esta barra é escondida por CSS.
 */
export default function MobileTopBar({ view, menuOpen, onToggleMenu }) {
  const title = NAV.find(n => n.id === view)?.label || EXTRA_TITLES[view] || 'Personal Budget';

  return (
    <header className="mobile-topbar">
      <button
        type="button"
        className="mobile-menu-btn"
        onClick={onToggleMenu}
        aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
        aria-expanded={menuOpen}
        aria-controls="app-sidebar"
      >
        {menuOpen ? '✕' : '☰'}
      </button>
      <div className="logo-mark" aria-hidden="true">💰</div>
      <span className="mobile-topbar-title">{title}</span>
    </header>
  );
}
