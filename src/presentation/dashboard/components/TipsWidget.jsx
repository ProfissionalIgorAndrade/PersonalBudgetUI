import React from 'react';

export default function TipsWidget({ tips }) {
  return (
    <div className="card">
      <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, letterSpacing: '-0.2px' }}>💡 Dicas & Alertas</h3>
      {tips.map((t, i) => (
        <div key={i} className="tip-card" style={{ borderColor: t.color + '44', marginBottom: 6 }}>
          <span style={{ fontSize: 18 }}>{t.icon}</span>
          <p style={{ fontSize: 12, lineHeight: 1.55, color: 'var(--text)' }}>{t.text}</p>
        </div>
      ))}
    </div>
  );
}
