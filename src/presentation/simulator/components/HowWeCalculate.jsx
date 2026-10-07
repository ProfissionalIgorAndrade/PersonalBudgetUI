import React from 'react';
import { R$, fdate } from '../../../core/utils/format';

/** "Como calculamos": premissas devolvidas pela API, recolhível. */
export default function HowWeCalculate({ opening, assumptions }) {
  const { lookbackMonths, monthsWithData, averageIncome, averageVariableExpense, notes } = assumptions;
  return (
    <details className="wi-how">
      <summary>Como calculamos</summary>
      <div className="wi-how-body">
        <h3 className="hl-h3">Saldo de partida em {fdate(opening.asOf)}</h3>
        <ul className="wi-how-list" aria-label="Contas no saldo de partida">
          {opening.accounts.map((a) => (
            <li key={a.id}><span>{a.name}</span><strong>{R$(a.balance)}</strong></li>
          ))}
          <li className="wi-how-total"><span>Total (contas correntes{opening.excludesSavings ? ', sem caixinhas' : ''})</span><strong>{R$(opening.amount)}</strong></li>
        </ul>
        <p className="wi-hint">Confira com a tela Contas: o saldo de partida é o saldo de hoje das contas correntes ativas.</p>
        <p className="wi-hint">O saldo de partida não entra no veredito: ele olha só a receita e a despesa de cada mês. Um mês positivo ainda pode não caber no caixa de hoje se o saldo das contas for baixo.</p>

        <h3 className="hl-h3">Médias usadas</h3>
        <ul className="wi-how-list" aria-label="Médias usadas">
          <li><span>Meses com dados na janela</span><strong>{monthsWithData} de {lookbackMonths}</strong></li>
          <li><span>Receita média por mês</span><strong>{averageIncome === null || averageIncome === undefined ? 'sem dados' : R$(averageIncome)}</strong></li>
          <li><span>Gasto variável médio por mês</span><strong>{averageVariableExpense === null || averageVariableExpense === undefined ? 'sem dados' : R$(averageVariableExpense)}</strong></li>
        </ul>

        <h3 className="hl-h3">Regras e limites</h3>
        <ul className="wi-notes">
          {notes.map((n, i) => <li key={i}>{n}</li>)}
        </ul>
      </div>
    </details>
  );
}
