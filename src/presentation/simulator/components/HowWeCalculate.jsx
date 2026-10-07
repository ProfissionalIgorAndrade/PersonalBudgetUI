import React from 'react';

/** "Como calculamos": a regra em uma frase, recolhível. */
export default function HowWeCalculate() {
  return (
    <details className="wi-how">
      <summary>Como calculamos</summary>
      <div className="wi-how-body">
        <p className="wi-how-text">
          Receitas e despesas de cada mês são exatamente as do Dashboard (lançamentos do mês; compras de cartão no mês da
          fatura; sem transferências nem caixinhas). As simulações somam por cima, mês a mês. Meses sem lançamentos não
          entram no veredito.
        </p>
      </div>
    </details>
  );
}
