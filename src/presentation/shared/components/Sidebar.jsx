import React from 'react';
import { NAV } from '../../../core/constants';

export default function Sidebar({ view, setView, theme, setTheme, profile = {}, authSession = {}, onLogout }) {
  const displayName = profile.nickname || profile.firstName || authSession.displayName || authSession.firstName || 'Usuário';
  const initials    = displayName.slice(0, 2).toUpperCase();
  const email       = profile.email || authSession.email || '';

  return (
    <aside className="sidebar">
      <div className="logo">
        <div className="logo-mark">💰</div>
        <div className="logo-text">
          <span className="logo-line1">Personal</span>
          <span className="logo-line2">Budget</span>
        </div>
      </div>

      {NAV.map(n => (
        <div key={n.id} className={`nav-item${view === n.id ? ' active' : ''}`} onClick={() => setView(n.id)}>
          <span className="ni">{n.icon}</span>
          <span>{n.label}</span>
        </div>
      ))}

      <div style={{ marginTop: 'auto', paddingTop: 14, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 5 }}>
        <button onClick={() => setView('profile')} className={`sidebar-profile-btn${view === 'profile' ? ' active' : ''}`}>
          {view === 'profile' && <div className="sidebar-active-bar" />}
          <div className="sidebar-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">{displayName}</span>
            {email && <span className="sidebar-user-email">{email}</span>}
          </div>
          <span className="sidebar-chevron">›</span>
        </button>

        <button className="theme-toggle-btn" onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}>
          <span style={{ fontSize: 14, width: 20, textAlign: 'center', flexShrink: 0 }}>{theme === 'dark' ? '☀️' : '🌙'}</span>
          <span>{theme === 'dark' ? 'Tema Claro' : 'Tema Escuro'}</span>
        </button>

        {onLogout && (
          <button className="theme-toggle-btn" onClick={onLogout} style={{ color: 'var(--red)', borderColor: 'rgba(248,113,113,0.2)' }}>
            <span style={{ fontSize: 14, width: 20, textAlign: 'center', flexShrink: 0 }}>🚪</span>
            <span>Sair da conta</span>
          </button>
        )}
      </div>
    </aside>
  );
}
