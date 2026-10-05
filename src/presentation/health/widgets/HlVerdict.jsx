import React from 'react';
import { HlCard, HlStatus } from './HlParts';

/** Hero da tela: o veredito, a nota e o principal motivo. Exatamente um número-herói. */
export default function HlVerdict({ health }) {
  const { score, level, label, headline, capped } = health;
  return (
    <HlCard id="verdict" title="Veredito" className="hl-verdict">
      <div className="hl-verdict-body">
        <div className="hl-hero" aria-label={score === null ? 'Sem nota' : `Nota ${score} de 100`}>
          <span className="hl-hero-num">{score === null ? '—' : score}</span>
          {score !== null && <span className="hl-hero-max">/ 100</span>}
        </div>
        <div className="hl-verdict-text">
          <HlStatus level={level} label={label} />
          <p className="hl-headline">{headline}</p>
          {capped && (
            <p className="hl-note">A nota passaria de 75, mas o mês fechou negativo, então o veredito fica limitado a Atenção.</p>
          )}
        </div>
      </div>
    </HlCard>
  );
}
