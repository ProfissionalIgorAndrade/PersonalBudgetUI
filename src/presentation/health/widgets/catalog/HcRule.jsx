import React, { useState, useMemo } from 'react';
import { R$ } from '../../../../core/utils/format';
import { rule503020 } from '../../logic/catalog';
import { pct, LEVEL_LABELS } from '../../logic/score';
import { HlCard, HlToggle, HlEmpty, HlStatus } from '../HlParts';
import { HcTable } from './HcParts';

const HINT = {
  needs: 'fixos + parcelas',
  wants: 'despesas variáveis',
  savings: 'sobra do mês',
};

/**
 * Regra 50/30/20. É uma APROXIMAÇÃO: o app não separa necessidade de desejo,
 * então a recorrência serve de proxy (ver rule503020 em logic/catalog.js).
 */
export default function HcRule({ transactions, month }) {
  const [mode, setMode] = useState('chart');
  const rule = useMemo(() => rule503020(transactions, month), [transactions, month]);
  const targetText = (b) => `meta ${b.kind === 'max' ? 'até' : 'no mínimo'} ${pct(b.target)}`;

  return (
    <HlCard id="rule" title="Regra 50/30/20" subtitle="Necessidades, desejos e poupança sobre a renda do mês."
      actions={rule ? <HlToggle value={mode} onChange={setMode} label="Regra 50/30/20: exibição" /> : null}>
      {!rule ? <HlEmpty>Sem receita neste mês: não dá para calcular a divisão sobre a renda.</HlEmpty> : (
        <>
          <p className="hl-callout hl-callout-neutral">
            Aproximação: o app não separa necessidade de desejo. Aqui, necessidades são os gastos fixos e as parcelas,
            desejos são as despesas variáveis e poupança é o que sobrou do mês.
          </p>
          {rule.overspent && <p className="hl-note">As despesas passaram da renda do mês, então não sobrou nada para poupar.</p>}
          {mode === 'chart' ? (
            <ul className="hl-rule">
              {rule.buckets.map(b => (
                <li key={b.id} className="hl-rule-row" tabIndex={0}
                  aria-label={`${b.label}: ${R$(b.value)}, ${pct(b.share)} da renda, ${targetText(b)}, ${LEVEL_LABELS[b.level]}`}>
                  <div className="hl-goal-head">
                    <span>{b.label} <span className="hl-goal-of">({HINT[b.id]})</span></span>
                    <strong>{pct(b.share)} <span className="hl-goal-of">{R$(b.value)}</span></strong>
                  </div>
                  <div className="hl-meter-wrap">
                    <div className={`hl-meter hl-${b.level}`} role="meter" aria-label={b.label} aria-valuemin={0} aria-valuemax={100}
                      aria-valuenow={Math.round(Math.min(b.share, 1) * 100)} aria-valuetext={pct(b.share)}>
                      <span className="hl-meter-fill" style={{ width: `${Math.max(Math.min(b.share, 1) * 100, 2)}%` }} />
                    </div>
                    <span className="hl-meter-target" style={{ left: `${b.target * 100}%` }} aria-hidden="true" />
                  </div>
                  <div className="hl-pillar-meta">
                    <HlStatus level={b.level} label={LEVEL_LABELS[b.level]} />
                    <span>{targetText(b)} (marca no medidor)</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <HcTable rowKey={b => b.id} rows={rule.buckets} columns={[
              { label: 'Grupo', render: b => `${b.label} (${HINT[b.id]})` },
              { label: 'Valor', render: b => R$(b.value) },
              { label: 'Da renda', render: b => pct(b.share) },
              { label: 'Meta', render: b => targetText(b) },
              { label: 'Situação', render: b => LEVEL_LABELS[b.level] },
            ]} />
          )}
        </>
      )}
    </HlCard>
  );
}
