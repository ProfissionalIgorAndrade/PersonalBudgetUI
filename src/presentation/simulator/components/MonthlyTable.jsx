import React, { useState } from 'react';
import { R$ } from '../../../core/utils/format';
import { HlStatus } from '../../health/widgets/HlParts';
import { signedMoney, MONTH_STATUS } from '../logic/labels';

/** Sobra: positiva sem sinal, negativa com sinal explícito. */
const result = (v) => (v < 0 ? signedMoney(v) : R$(v));

/**
 * Tabela mensal, gêmea do gráfico (mesmos números de composeMonthly): linhas
 * são meses; colunas são receita, despesa, uma por simulação ligada, sobra e
 * situação. No celular cada linha vira um cartão (data-label no CSS).
 *
 * infos: [{ sim, name, slot }] de todas as simulações (para os nomes).
 */
export default function MonthlyTable({ composed, infos }) {
  const { months, simIds, totals, negativeCount, countedCount, excludedCount } = composed;
  const [open, setOpen] = useState(() => new Set());
  const nameOf = (id) => infos.find((i) => i.sim.id === id)?.name ?? id;
  const cols = 5 + simIds.length;

  const toggle = (key) => setOpen((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  return (
    <div className="wi-mt">
      <div className="hl-table-wrap wi-mt-wrap">
        <table className="hl-table wi-table wi-mt-table">
          <caption className="wi-sr">Receita, despesa, simulações e sobra de cada mês</caption>
          <thead>
            <tr>
              <th scope="col">Mês</th>
              <th scope="col" className="wi-num">Receita</th>
              <th scope="col" className="wi-num">Despesa</th>
              {simIds.map((id) => <th key={id} scope="col" className="wi-num">{nameOf(id)}</th>)}
              <th scope="col" className="wi-num">Sobra do mês</th>
              <th scope="col">Situação</th>
            </tr>
          </thead>
          <tbody>
            {months.map((m, i) => {
              const key = m.ym;
              const isOpen = open.has(key);
              const st = MONTH_STATUS[m.status];
              return (
                <React.Fragment key={key}>
                  <tr className={`wi-mt-row is-${m.status}`}>
                    <th scope="row">
                      <button type="button" className="wi-mt-toggle" aria-expanded={isOpen} aria-controls={`wi-mt-d-${i}`}
                        aria-label={`Detalhe de ${m.label}`} onClick={() => toggle(key)}>
                        <span aria-hidden="true">{isOpen ? '▾' : '▸'}</span> {m.label}
                      </button>
                    </th>
                    <td className="wi-num" data-label="Receita">{m.hasData ? R$(m.income) : '—'}</td>
                    <td className="wi-num" data-label="Despesa">{m.hasData ? signedMoney(-m.expense) : '—'}</td>
                    {m.sims.map((s) => (
                      <td key={s.id} className="wi-num" data-label={nameOf(s.id)}>{signedMoney(s.amount)}</td>
                    ))}
                    <td className="wi-num wi-mt-result" data-label="Sobra do mês">{m.hasData ? result(m.result) : '—'}</td>
                    <td data-label="Situação"><HlStatus level={st.level} label={st.label} /></td>
                  </tr>
                  {isOpen && (
                    <tr id={`wi-mt-d-${i}`} className="wi-mt-detail">
                      <td colSpan={cols}>
                        {m.hasData
                          ? (
                            <p>
                              Fixos e parcelas: <strong>{R$(m.committed)}</strong> · Demais despesas: <strong>{R$(m.variable)}</strong>
                            </p>
                          )
                          : <p>Sem lançamentos de receita ou despesa em {m.label}. As simulações aparecem, mas o mês não entra no veredito nem nos totais.</p>}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
          {countedCount > 1 && (
            <tfoot>
              <tr className="wi-mt-total">
                <th scope="row">Total do período</th>
                <td className="wi-num" data-label="Receita">{R$(totals.income)}</td>
                <td className="wi-num" data-label="Despesa">{signedMoney(-totals.expense)}</td>
                {totals.sims.map((s) => (
                  <td key={s.id} className="wi-num" data-label={nameOf(s.id)}>{signedMoney(s.amount)}</td>
                ))}
                <td className="wi-num wi-mt-result" data-label="Sobra do mês">{result(totals.result)}</td>
                <td data-label="Situação">
                  {negativeCount > 0
                    ? <HlStatus level="critical" label={`${negativeCount} de ${countedCount} negativos`} />
                    : <HlStatus level="good" label="Nenhum negativo" />}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      {excludedCount > 0 && (
        <p className="wi-note">
          {excludedCount} {excludedCount === 1 ? 'mês sem lançamentos fica' : 'meses sem lançamentos ficam'} fora do total do período e do veredito.
        </p>
      )}
    </div>
  );
}
