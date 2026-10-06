import React from 'react';
import { R$, fdate } from '../../../core/utils/format';
import { HlStatus } from '../../health/widgets/HlParts';
import { signedMoney } from '../logic/labels';

/** Linha de situação do saldo: ícone + texto, nunca só cor. */
function Negative({ index, months, who }) {
  if (index === null || index === undefined) {
    return <HlStatus level="good" label={`${who}: nenhum mês negativo`} />;
  }
  const m = months[index];
  return <HlStatus level="critical" label={`${who}: negativo em ${m ? m.label : '—'}`} />;
}

/**
 * Resumo sempre visível acima das abas. Tudo vem do cenário composto no
 * cliente (liga/desliga reflete na hora) e do saldo de partida da API.
 */
export default function SummaryTiles({ opening, composed, baselineMonths }) {
  const { summary } = composed;
  const accounts = opening.accounts.length;
  const baseMin = summary.baselineMinBalance;
  const scenMin = summary.scenarioMinBalance;
  const monthAt = (i) => (baselineMonths[i] ? baselineMonths[i].label : '—');

  return (
    <div className="hl-tiles wi-tiles" role="group" aria-label="Resumo da projeção">
      <div className="hl-tile" tabIndex={0} aria-label={`Saldo hoje: ${R$(opening.amount)}`}>
        <span className="hl-tile-label">Saldo hoje (contas correntes)</span>
        <span className="hl-tile-value">{R$(opening.amount)}</span>
        <span className="hl-delta">
          em {fdate(opening.asOf)} · {accounts} {accounts === 1 ? 'conta' : 'contas'}, sem caixinhas
        </span>
      </div>

      <div className="hl-tile" tabIndex={0}>
        <span className="hl-tile-label">Menor saldo no período</span>
        <span className="wi-tile-line">Base: <strong>{R$(baseMin.amount)}</strong> <span className="hl-delta">({monthAt(baseMin.monthIndex)})</span></span>
        <span className="wi-tile-line">Com simulações: <strong>{R$(scenMin.amount)}</strong> <span className="hl-delta">({monthAt(scenMin.monthIndex)})</span></span>
      </div>

      <div className="hl-tile" tabIndex={0}>
        <span className="hl-tile-label">Primeiro mês negativo</span>
        <Negative index={summary.firstNegativeMonthIndexBaseline} months={baselineMonths} who="Base" />
        <Negative index={summary.firstNegativeMonthIndexScenario} months={baselineMonths} who="Com simulações" />
      </div>

      <div className="hl-tile" tabIndex={0}>
        <span className="hl-tile-label">Impacto das simulações ligadas</span>
        <span className="wi-tile-line">No horizonte: <strong>{signedMoney(summary.totalImpactInHorizon)}</strong></span>
        <span className="wi-tile-line">Total completo: <strong>{signedMoney(summary.totalImpactFull)}</strong></span>
      </div>
    </div>
  );
}
