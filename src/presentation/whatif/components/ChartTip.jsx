import React from 'react';

/**
 * Dica de um mês nos gráficos. O valor vem antes e forte, o nome depois; cada
 * simulação leva um traço da cor dela. Vira para a esquerda perto da borda.
 */
export default function ChartTip({ x, y, width, title, lines, total }) {
  const flip = x > width - 260;
  return (
    <div
      className="wf-tip" role="presentation"
      style={{ left: x, top: y, transform: `translate(${flip ? 'calc(-100% - 14px)' : '14px'}, 0)` }}
    >
      <p className="wf-tip-title">{title}</p>
      <ul className="wf-tip-lines">
        {lines.map((l) => (
          <li key={l.key} className={l.muted ? 'is-muted' : undefined}>
            <span className="wf-tip-key" style={{ background: l.color || 'transparent' }} aria-hidden="true" />
            <span className="wf-tip-label">{l.label}</span>
            <strong className="wf-num">{l.value}</strong>
          </li>
        ))}
      </ul>
      {total && (
        <p className={`wf-tip-total${total.neg ? ' is-neg' : ''}`}>
          <span>{total.label}</span>
          <strong className="wf-num">{total.value}</strong>
        </p>
      )}
    </div>
  );
}
