import React from 'react';
import { R$ } from '../../../core/utils/format';
import { signedMoney } from '../../simulator/logic/labels';

/** Valor com sinal só quando é negativo ("−R$ 8.935,78"); positivo e zero sem sinal. */
const money = (v) => (v < 0 ? `−${R$(-v)}` : R$(v));

/**
 * Resumo do período em uma faixa dividida: quanto sobra, quanto as simulações
 * tiram ou põem, o pior mês e quantos meses fecham no vermelho. Só considera os
 * meses com lançamentos, como o veredito.
 */
export default function Outlook({ composed, months, draftActive, onPickMonth }) {
  const { totals, tightest, negativeCount, countedCount, excludedCount, simIds } = composed;
  if (countedCount === 0) {
    return (
      <section className="wf-panel wf-outlook-empty" aria-label="Resumo do período">
        <p>Nenhum mês dos próximos {months === 1 ? 'mês' : `${months} meses`} tem lançamentos ainda, então não há sobra para projetar.
          As simulações aparecem no quadro mesmo assim.</p>
      </section>
    );
  }

  const negatives = composed.months.filter((m) => m.status === 'negative');
  const period = countedCount === 1 ? 'no mês' : `em ${countedCount} meses`;
  const sims = simIds.length;

  return (
    <section className="wf-panel wf-outlook" aria-label="Resumo do período">
      <div className="wf-kpi wf-kpi-lead">
        <span className="wf-kpi-label">Sobra {period}</span>
        <strong className={`wf-kpi-value wf-num${totals.result < 0 ? ' is-neg' : ''}`}>{money(totals.result)}</strong>
        <span className="wf-kpi-sub">
          Sem simulações: <span className="wf-num">{money(totals.baselineResult)}</span>
          {excludedCount > 0 && <> · {excludedCount} {excludedCount === 1 ? 'mês sem lançamentos fica' : 'meses sem lançamentos ficam'} de fora</>}
        </span>
      </div>

      <div className="wf-kpi">
        <span className="wf-kpi-label">Efeito das simulações</span>
        <strong className="wf-kpi-value wf-num">{signedMoney(totals.simTotal)}</strong>
        <span className="wf-kpi-sub">
          {sims === 0 ? 'Nenhuma ligada' : `${sims} ${sims === 1 ? 'ligada' : 'ligadas'}`}
          {draftActive && ', com o rascunho'}
        </span>
      </div>

      <div className="wf-kpi">
        <span className="wf-kpi-label">Pior mês: {tightest.label}</span>
        <button
          type="button" className={`wf-kpi-value wf-kpi-link wf-num${tightest.result < 0 ? ' is-neg' : ''}`}
          onClick={() => onPickMonth(tightest.index)}
          aria-label={`Ver a conta de ${tightest.label}: sobra ${money(tightest.result)}`}
        >
          {money(tightest.result)}
        </button>
        <span className="wf-kpi-sub">
          {tightest.result < 0
            ? <>Faltam <span className="wf-num">{R$(-tightest.result)}</span> para fechar no zero</>
            : 'É a menor sobra do período'}
        </span>
      </div>

      <div className="wf-kpi">
        <span className="wf-kpi-label">Meses no vermelho</span>
        <strong className="wf-kpi-value wf-num">
          {negativeCount}<span className="wf-kpi-of"> de {countedCount}</span>
        </strong>
        <span className="wf-kpi-sub">
          {negatives.length === 0 ? 'Todos fecham no verde' : negatives.slice(0, 4).map((m) => m.label).join(', ')}
          {negatives.length > 4 && ` e mais ${negatives.length - 4}`}
        </span>
      </div>
    </section>
  );
}
