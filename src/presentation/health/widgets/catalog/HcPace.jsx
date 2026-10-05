import React, { useState, useMemo } from 'react';
import { R$ } from '../../../../core/utils/format';
import { spendingPace } from '../../logic/catalog';
import { PACE_TOLERANCE } from '../../logic/targets';
import { HlCard, HlToggle, HlEmpty, HlStatus } from '../HlParts';
import { HcTable, HcLegend, HcPaceChart } from './HcParts';

const LABEL = { good: 'No ritmo', warning: 'Acima do ritmo', critical: 'Muito acima do ritmo', unknown: 'Sem comparação' };

/** Ritmo de gasto: despesa acumulada até hoje contra o esperado pela média dos 3 meses anteriores. */
export default function HcPace({ transactions, month, today }) {
  const [mode, setMode] = useState('chart');
  const pace = useMemo(() => spendingPace(transactions, month, today || new Date()), [transactions, month, today]);
  const { state } = pace;

  let body;
  if (state === 'future') {
    body = <HlEmpty>Mês futuro: ainda não há gasto para comparar com o ritmo.</HlEmpty>;
  } else if (pace.spent <= 0 && state === 'no-baseline') {
    body = <HlEmpty>Sem despesas neste mês e sem meses anteriores para comparar.</HlEmpty>;
  } else {
    const diff = pace.expectedToDate !== null ? pace.spent - pace.expectedToDate : null;
    body = (
      <>
        <div className="hl-pace-head">
          <div className="hl-tile">
            <span className="hl-tile-label">{pace.closed ? 'Gasto no mês' : `Gasto até o dia ${pace.day}`}</span>
            <span className="hl-tile-value">{R$(pace.spent)}</span>
          </div>
          <div className="hl-tile">
            <span className="hl-tile-label">Esperado até o dia {pace.day}</span>
            <span className="hl-tile-value">{pace.expectedToDate === null ? '—' : R$(pace.expectedToDate)}</span>
          </div>
          <div className="hl-tile">
            <span className="hl-tile-label">Média do mês completo</span>
            <span className="hl-tile-value">{pace.expectedTotal === null ? '—' : R$(pace.expectedTotal)}</span>
          </div>
        </div>
        <p className="hl-pace-verdict">
          <HlStatus level={pace.level} label={LABEL[pace.level]} />
          <span>
            {state === 'no-baseline' && 'Sem meses anteriores com despesa para formar a referência.'}
            {state === 'ok' && diff !== null && (diff > 0
              ? `${R$(diff)} acima do esperado para o dia ${pace.day}.`
              : `${R$(Math.abs(diff))} abaixo do esperado para o dia ${pace.day}.`)}
            {state === 'ok' && pace.level === 'warning' && ` Tolerância de ${Math.round(PACE_TOLERANCE * 100)}%.`}
          </span>
        </p>
        {state === 'ok' && (mode === 'chart' ? (
          <>
            <HcLegend items={[{ key: 'a', cls: 'hl-sw-line', label: 'Gasto acumulado' }, { key: 'e', cls: 'hl-sw-dash', label: 'Esperado (média de 3 meses)' }]} />
            <HcPaceChart actual={pace.actual} expected={pace.expected} days={pace.daysInMonth} ariaLabel="Gasto acumulado por dia do mês contra o esperado" />
          </>
        ) : (
          <div className="hl-table-scroll">
            <HcTable rowKey={r => r.day} rows={pace.expected.map(e => ({ day: e.day, expected: e.value, actual: pace.actual.find(a => a.day === e.day)?.value ?? null }))}
              columns={[
                { label: 'Dia', render: r => r.day },
                { label: 'Gasto acumulado', render: r => (r.actual === null ? '—' : R$(r.actual)) },
                { label: 'Esperado', render: r => R$(r.expected) },
              ]} />
          </div>
        ))}
      </>
    );
  }

  return (
    <HlCard id="pace" title="Ritmo de gasto no mês" subtitle="Quanto já foi gasto contra o esperado para este dia do mês."
      actions={state === 'ok' ? <HlToggle value={mode} onChange={setMode} label="Ritmo de gasto: exibição" /> : null}>
      {body}
    </HlCard>
  );
}
