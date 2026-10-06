import React, { useState } from 'react';
import { R$ } from '../../../core/utils/format';
import { HlToggle, HlStatus } from '../../health/widgets/HlParts';
import WiChart from './WiChart';
import { projectionMonthLabel, FIRST_MONTH_NOTE } from '../logic/labels';

/** Aba "Mês a mês": dois gráficos de um eixo cada, com tabela equivalente. */
export default function FlowTab({ baseline, composed }) {
  const [mode, setMode] = useState('chart');
  const { months, summary } = composed;

  const labels = baseline.map((b, i) => ({
    key: `${b.year}-${b.month}`,
    axis: projectionMonthLabel(b, i),
    long: i === 0 ? `${b.label}, ${projectionMonthLabel(b, i, { long: true })}` : b.label,
  }));

  const baseSeries = (pick, label) => ({ key: 'base', tone: 'base', label, values: baseline.map(pick) });
  const scenSeries = (pick, label) => ({ key: 'scen', tone: 'scenario', label, values: months.map(pick) });

  const firstNeg = summary.firstNegativeMonthIndexScenario;
  const status = firstNeg === null
    ? <HlStatus level="good" label="Com as simulações ligadas, nenhum mês termina com saldo negativo." />
    : <HlStatus level="critical" label={`Com as simulações ligadas, o saldo fica negativo a partir de ${months[firstNeg].label}.`} />;

  return (
    <div className="wi-flow">
      <div className="wi-flow-head">
        {status}
        <HlToggle value={mode} onChange={setMode} label="Mês a mês: exibição" />
      </div>

      {mode === 'chart' ? (
        <div className="wi-charts">
          <WiChart
            title="Resultado do mês: base x com simulações" kind="columns" months={labels}
            ariaLabel="Resultado de cada mês, base e com simulações"
            series={[baseSeries((b) => b.result, 'Base'), scenSeries((m) => m.result, 'Com simulações')]}
          />
          <WiChart
            title="Saldo projetado no fim do mês: base x com simulações" kind="lines" months={labels}
            ariaLabel="Saldo projetado ao fim de cada mês, base e com simulações"
            series={[baseSeries((b) => b.balance, 'Base'), scenSeries((m) => m.balance, 'Com simulações')]}
          />
        </div>
      ) : (
        <div className="hl-table-wrap">
          <table className="hl-table wi-table">
            <caption className="wi-sr">Resultado e saldo projetado mês a mês, base e com simulações</caption>
            <thead>
              <tr>
                <th scope="col">Mês</th>
                <th scope="col" className="wi-num">Resultado base</th>
                <th scope="col" className="wi-num">Resultado com simulações</th>
                <th scope="col" className="wi-num">Saldo base</th>
                <th scope="col" className="wi-num">Saldo com simulações</th>
                <th scope="col">Situação</th>
              </tr>
            </thead>
            <tbody>
              {baseline.map((b, i) => {
                const m = months[i];
                return (
                  <tr key={labels[i].key}>
                    <th scope="row">{labels[i].long}</th>
                    <td className="wi-num">{R$(b.result)}</td>
                    <td className="wi-num">{R$(m.result)}</td>
                    <td className="wi-num">{R$(b.balance)}</td>
                    <td className="wi-num">{R$(m.balance)}</td>
                    <td>
                      {m.balance < 0
                        ? <HlStatus level="critical" label="Saldo negativo" />
                        : <HlStatus level="good" label="Saldo positivo" />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="wi-note">{FIRST_MONTH_NOTE}</p>
    </div>
  );
}
