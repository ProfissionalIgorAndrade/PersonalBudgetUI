import React, { useState } from 'react';
import { R$ } from '../../../core/utils/format';
import { toCents, fromCents } from '../../../core/utils/simulatorMath';
import { HlEmpty } from '../../health/widgets/HlParts';
import { signedMoney, projectionMonthLabel, monthName } from '../logic/labels';

const Neg = ({ v }) => (v < 0
  ? <span className="wi-neg-tag"> <span aria-hidden="true">✕</span> negativo</span>
  : null);

/** Aba "No mês": a conta explícita de um mês, linha a linha. */
export default function MonthTab({ baseline, composed, enabledSims, impactById }) {
  const [picked, setPicked] = useState(0);
  const idx = Math.min(picked, baseline.length - 1);
  const base = baseline[idx];
  const scen = composed.months[idx];
  const simNet = fromCents(toCents(scen.simulatedIncome) - toCents(scen.simulatedExpense));

  return (
    <div className="wi-month">
      <div className="wi-chips" role="group" aria-label="Mês da projeção">
        {baseline.map((b, i) => (
          <button key={`${b.year}-${b.month}`} type="button" className="wi-chip" aria-pressed={idx === i} onClick={() => setPicked(i)}>
            {projectionMonthLabel(b, i)}
          </button>
        ))}
      </div>

      {idx === 0 && (
        <p className="wi-note">
          Restante de {monthName(base.month)}: só o que ainda falta acontecer. O que já aconteceu no mês está dentro do saldo de hoje.
        </p>
      )}

      <div className="hl-table-wrap">
        <table className="hl-table wi-table">
          <caption className="wi-sr">
            Conta do mês {idx === 0 ? `restante de ${monthName(base.month)}` : base.label}
          </caption>
          <thead>
            <tr><th scope="col">Linha</th><th scope="col" className="wi-num">Valor</th></tr>
          </thead>
          <tbody>
            <tr><th scope="row">Receitas previstas</th><td className="wi-num">{R$(base.income)}</td></tr>
            <tr><th scope="row">Compromissos (fixos e parcelas)</th><td className="wi-num">{signedMoney(-base.committed)}</td></tr>
            <tr><th scope="row">Gastos variáveis estimados</th><td className="wi-num">{signedMoney(-base.variable)}</td></tr>
            <tr className="wi-row-total">
              <th scope="row">Resultado base</th>
              <td className="wi-num">{signedMoney(base.result)}<Neg v={base.result} /></td>
            </tr>

            {enabledSims.length === 0 ? (
              <tr><td colSpan={2}><HlEmpty>Nenhuma simulação ligada: o cenário é igual à base.</HlEmpty></td></tr>
            ) : enabledSims.map((s) => {
              const v = impactById.get(s.id)?.monthly?.[idx];
              return (
                <tr key={s.id} className="wi-row-sim">
                  <th scope="row"><span aria-hidden="true">{s.type === 'Income' ? '📥' : '📤'} </span>{s.description}</th>
                  <td className="wi-num">{v === undefined ? '…' : signedMoney(v)}</td>
                </tr>
              );
            })}

            <tr className="wi-row-total">
              <th scope="row">Resultado com simulações</th>
              <td className="wi-num">{signedMoney(scen.result)}<Neg v={scen.result} /></td>
            </tr>
            <tr>
              <th scope="row">Diferença para a base</th>
              <td className="wi-num">{signedMoney(simNet)}</td>
            </tr>
            <tr>
              <th scope="row">Saldo no fim do mês (base)</th>
              <td className="wi-num">{R$(base.balance)}<Neg v={base.balance} /></td>
            </tr>
            <tr>
              <th scope="row">Saldo no fim do mês (com simulações)</th>
              <td className="wi-num">{R$(scen.balance)}<Neg v={scen.balance} /></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
