import React from 'react';

export default function LoadingOverlay() {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: 14,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: '50%',
        border: '3px solid var(--border)', borderTopColor: 'var(--primary)',
        animation: 'spin 0.8s linear infinite',
      }} />
      <span style={{ color: 'var(--muted)', fontSize: 13 }}>Carregando dados…</span>
    </div>
  );
}
