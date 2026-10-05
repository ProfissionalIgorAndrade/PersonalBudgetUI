import React from 'react';
import { HlCard, HlStatus } from './HlParts';
import { LEVEL_LABELS } from '../logic/score';

/** Os quatro pilares da nota: medidor, meta e a frase que explica o porquê. */
export default function HlPillars({ health }) {
  return (
    <HlCard id="pillars" title="Pilares da saúde" subtitle="O que compõe a nota e o que falta para a meta.">
      <ul className="hl-pillars">
        {health.pillars.map(p => (
          <li key={p.id} className="hl-pillar">
            <div className="hl-pillar-head">
              <span className="hl-pillar-name">{p.label}</span>
              <HlStatus level={p.status} label={p.score === null ? LEVEL_LABELS.unknown : LEVEL_LABELS[p.status]} />
            </div>
            <div className={`hl-meter hl-${p.status}`} role="meter" aria-label={p.label}
              aria-valuemin={0} aria-valuemax={100} aria-valuenow={p.score === null ? undefined : p.score}
              aria-valuetext={p.score === null ? 'sem dados' : `${p.score} de 100`}>
              <span className="hl-meter-fill" style={{ width: `${p.score === null ? 0 : Math.max(p.score, 2)}%` }} />
            </div>
            <div className="hl-pillar-meta">
              <span>{p.score === null ? 'sem nota' : `${p.score}/100`} · peso {p.weight}%</span>
              <span>{p.target}</span>
            </div>
            <p className="hl-pillar-reason">{p.reason}</p>
          </li>
        ))}
      </ul>
    </HlCard>
  );
}
