import React, { useState } from 'react';
import { R$, monthLabel } from '../../../core/utils/format';
import { variation } from '../logic/metrics';
import { pct } from '../logic/score';
import { HlCard, HlToggle, HlSpark, HlEmpty, signedPct } from './HlParts';

const TILES = [
  { id: 'income',  label: 'Receitas',  upIsGood: true,  money: true },
  { id: 'expense', label: 'Despesas',  upIsGood: false, money: true },
  { id: 'result',  label: 'Sobra',     upIsGood: true,  money: true },
  { id: 'savingsRate', label: 'Taxa de poupança', upIsGood: true, money: false },
];

const fmt = (tile, v) => (v === null ? '—' : tile.money ? R$(v) : pct(v, 1));

/** Delta com seta, sinal e texto; a cor só reforça se a direção é boa ou ruim. */
function Delta({ tile, cur, prev }) {
  if (cur === null || prev === null) return <span className="hl-delta hl-neutral">sem base no mês anterior</span>;
  let text;
  let diff;
  if (tile.money) {
    const v = variation(cur, prev);
    diff = v.abs;
    const p = signedPct(v.pct);
    text = p ? `${p} vs mês anterior` : `${diff >= 0 ? '+' : '−'}${R$(Math.abs(diff))} vs mês anterior`;
  } else {
    diff = cur - prev;
    text = `${diff >= 0 ? '+' : '−'}${(Math.abs(diff) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} p.p. vs mês anterior`;
  }
  if (Math.abs(diff) < 0.0005) return <span className="hl-delta hl-neutral">▬ sem variação vs mês anterior</span>;
  const good = (diff > 0) === tile.upIsGood;
  return (
    <span className={`hl-delta ${good ? 'hl-good' : 'hl-critical'}`}>
      <span aria-hidden="true">{diff > 0 ? '▲' : '▼'}</span> {text}
    </span>
  );
}

/** Receitas, despesas, sobra e taxa de poupança, cada um com variação e mini-série de 6 meses. */
export default function HlMonthResult({ series }) {
  const [mode, setMode] = useState('chart');
  const cur = series[series.length - 1];
  const prev = series[series.length - 2];
  const hasAny = series.some(s => s.income > 0 || s.expense > 0);

  return (
    <HlCard id="result" title="Resultado do mês" subtitle="Comparado ao mês anterior, com os últimos 6 meses."
      actions={<HlToggle value={mode} onChange={setMode} label="Resultado do mês: exibição" />}>
      {!hasAny ? <HlEmpty>Sem lançamentos nos últimos 6 meses.</HlEmpty> : mode === 'chart' ? (
        <div className="hl-tiles">
          {TILES.map(tile => (
            <div key={tile.id} className="hl-tile" tabIndex={0}
              aria-label={`${tile.label}: ${fmt(tile, cur[tile.id])}`}>
              <span className="hl-tile-label">{tile.label}</span>
              <span className="hl-tile-value">{fmt(tile, cur[tile.id])}</span>
              <Delta tile={tile} cur={cur[tile.id]} prev={prev ? prev[tile.id] : null} />
              <HlSpark
                points={series.map(s => ({ value: s[tile.id] }))}
                ariaLabel={`${tile.label}, 6 meses: ${series.map(s => `${monthLabel(s.key)} ${fmt(tile, s[tile.id])}`).join('; ')}`} />
            </div>
          ))}
        </div>
      ) : (
        <div className="hl-table-wrap">
          <table className="hl-table">
            <thead>
              <tr><th scope="col">Mês</th>{TILES.map(t => <th key={t.id} scope="col">{t.label}</th>)}</tr>
            </thead>
            <tbody>
              {series.map(s => (
                <tr key={s.key}>
                  <th scope="row">{monthLabel(s.key)}</th>
                  {TILES.map(t => <td key={t.id}>{fmt(t, s[t.id])}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </HlCard>
  );
}
