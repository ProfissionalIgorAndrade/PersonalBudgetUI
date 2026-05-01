import React, { useRef, useState, useLayoutEffect } from 'react';
import Modal from '../../shared/components/Modal';

export default function DashboardCustomizer({ draftLayout, onMove, onToggle, onReset, onApply, onCancel, renderWidget }) {
  const draftCol0 = [...draftLayout].filter(w => w.col === 0).sort((a, b) => a.order - b.order);
  const draftCol1 = [...draftLayout].filter(w => w.col === 1).sort((a, b) => a.order - b.order);

  const visCol0 = draftCol0.filter(w => w.visible);
  const visCol1 = draftCol1.filter(w => w.visible);

  const previewRef = useRef(null);
  const innerRef   = useRef(null);
  const [scale, setScale] = useState(0.38);

  useLayoutEffect(() => {
    if (!previewRef.current || !innerRef.current) return;
    const outerW = previewRef.current.offsetWidth;
    const innerW = innerRef.current.scrollWidth;
    if (innerW > 0) setScale(outerW / innerW);
  }, [visCol0.length, visCol1.length]);

  return (
    <Modal title="⚙️ Personalizar Dashboard" onClose={onCancel} wide>
      <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: -10, marginBottom: 16 }}>
        Ajuste a ordem e visibilidade dos blocos. Veja o resultado no preview antes de aplicar.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {[
          { title: '◧ Coluna Esquerda', items: draftCol0 },
          { title: '◨ Coluna Direita',  items: draftCol1 },
        ].map(({ title, items }) => (
          <div key={title}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
              {title}
            </div>
            {items.map((w, idx) => (
              <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', marginBottom: 5, borderRadius: 9, background: w.visible ? 'var(--surface2)' : 'transparent', border: '1px solid var(--border)', opacity: w.visible ? 1 : 0.4, transition: 'opacity .2s, background .2s' }}>
                <span style={{ fontSize: 14 }}>{w.icon}</span>
                <span style={{ flex: 1, fontSize: 12, fontWeight: 600 }}>{w.label}</span>
                <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <button className="btn-icon" style={{ padding: '2px 5px', fontSize: 11 }} onClick={() => onMove(w.id, -1)} disabled={idx === 0}>↑</button>
                  <button className="btn-icon" style={{ padding: '2px 5px', fontSize: 11 }} onClick={() => onMove(w.id, 1)} disabled={idx === items.length - 1}>↓</button>
                  <button className="btn-icon" style={{ padding: '3px 7px', fontSize: 14, color: w.visible ? 'var(--primary)' : 'var(--muted)' }} onClick={() => onToggle(w.id)}>{w.visible ? '👁' : '🙈'}</button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* ── Real preview ───────────────────────────────────────────── */}
      <div style={{ marginTop: 20, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 12 }}>
          👁 Pré-visualização
        </div>

        <div
          ref={previewRef}
          style={{ overflow: 'hidden', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg)', height: 320, position: 'relative' }}
        >
          {(visCol0.length === 0 && visCol1.length === 0) ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--muted)', fontSize: 13 }}>
              Todos os widgets estão ocultos
            </div>
          ) : (
            <div
              ref={innerRef}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 14,
                padding: 14,
                transformOrigin: 'top left',
                transform: `scale(${scale})`,
                width: `${100 / scale}%`,
                pointerEvents: 'none',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {visCol0.map((w, i) => renderWidget(w.id, i))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {visCol1.map((w, i) => renderWidget(w.id, i))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex jcb aic" style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)', gap: 8 }}>
        <button className="btn btn-secondary" onClick={onReset}>↺ Restaurar padrão</button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={onCancel}>Cancelar</button>
          <button className="btn btn-primary" onClick={onApply}>✓ Aplicar</button>
        </div>
      </div>
    </Modal>
  );
}
