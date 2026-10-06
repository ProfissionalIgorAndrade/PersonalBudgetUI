import React from 'react';

export default function ReloginNotice({ seconds }) {
  return (
    <div className="modal-overlay" style={{ zIndex: 10000 }} role="status" aria-live="polite">
      <div className="card" style={{ maxWidth: 420, textAlign: 'center', padding: '24px 22px' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
        <h3 style={{ fontSize: 18, fontWeight: 800, fontFamily: 'Syne', margin: '0 0 10px 0' }}>
          Sessão será encerrada
        </h3>
        <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.65, margin: 0 }}>
          Para aplicar o novo acesso ao lar, você precisa entrar novamente.
        </p>
        <div style={{ marginTop: 18, fontSize: 36, fontWeight: 800, fontFamily: 'Syne', color: 'var(--primary)', fontVariantNumeric: 'tabular-nums' }}>
          {seconds}
        </div>
        <p style={{ fontSize: 11, color: 'var(--muted)', margin: '10px 0 0 0' }}>
          segundo(s) até o logout automático
        </p>
      </div>
    </div>
  );
}
