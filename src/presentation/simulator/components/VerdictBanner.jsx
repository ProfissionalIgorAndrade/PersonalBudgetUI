import React from 'react';
import { STATUS_ICON } from '../../health/widgets/HlParts';

/**
 * Veredito no topo: status (ícone + texto, nunca só cor), a frase da decisão e
 * as linhas de apoio (folga, comprometimento, avisos). Tudo vem de buildVerdict.
 */
export default function VerdictBanner({ verdict }) {
  const { level, statusLabel, headline, lines } = verdict;
  return (
    <section className={`wi-vd hl-${level}`} aria-label="Veredito da simulação" data-level={level}>
      <span className="wi-vd-status">
        <span className="wi-vd-icon" aria-hidden="true">{STATUS_ICON[level]}</span>
        {statusLabel}
      </span>
      <p className="wi-vd-headline" aria-live="polite">{headline}</p>
      {lines.length > 0 && (
        <ul className="wi-vd-lines">
          {lines.map((l) => <li key={l.kind} className={`wi-vd-line wi-vd-${l.kind}`}>{l.text}</li>)}
        </ul>
      )}
    </section>
  );
}
