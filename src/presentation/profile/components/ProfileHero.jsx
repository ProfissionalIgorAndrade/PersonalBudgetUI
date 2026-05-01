import React from 'react';

function Avatar({ initials, size = 56 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'linear-gradient(135deg, var(--primary), #0d9488)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 800, fontFamily: 'Syne',
      color: '#fff', flexShrink: 0, letterSpacing: 1,
      boxShadow: '0 4px 16px rgba(45,212,191,.3)',
    }}>
      {initials || '?'}
    </div>
  );
}

export default function ProfileHero({ profile }) {
  const displayName = profile.nickname || profile.firstName || 'Usuário';
  const fullName    = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || '—';
  const initials    = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <Avatar initials={initials} size={72} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'Syne', marginBottom: 2 }}>{displayName}</div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>{fullName !== displayName ? fullName : ''}</div>
          {profile.email      && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>✉️ {profile.email}</div>}
          {profile.occupation && <div style={{ fontSize: 12, color: 'var(--muted)' }}>💼 {profile.occupation}</div>}
        </div>
        {profile.bio && (
          <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic', maxWidth: 260, borderLeft: '2px solid var(--border)', paddingLeft: 14 }}>
            "{profile.bio}"
          </div>
        )}
      </div>
    </div>
  );
}
