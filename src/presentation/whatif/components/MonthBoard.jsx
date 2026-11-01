import React, { useMemo } from 'react';
import { R$ } from '../../../core/utils/format';
import { MODE_LABEL, signedMoney, addMonths, shortMonth } from '../../simulator/logic/labels';
import { niceScale, moneyShort, amountShort, tickLabel } from '../logic/scale';

const money = (v) => (v < 0 ? `−${R$(-v)}` : R$(v));

/**
 * O quadro: em cima, a sobra de cada mês como coluna (acima ou abaixo do zero)
 * com um traço onde ela estaria sem simulações; embaixo, uma linha por
 * simulação, com o valor dela em cada mês nas MESMAS colunas. Assim se lê, mês
 * a mês, o que empurrou a coluna para baixo.
 */
export default function MonthBoard({
  composed, rows, selected, onSelect, onToggle, onEdit, onSetAll, saving, noFlow, ownedCount, onClearMine,
}) {
  const saved = rows.filter((r) => r.id !== '__draft');
  const onCount = saved.filter((r) => r.sim.enabled).length;
  const n = composed.months.length;
  const scale = useMemo(() => {
    const values = composed.months.filter((m) => m.hasData).flatMap((m) => [m.result, m.baselineResult]);
    return niceScale(values.length ? values : [0]);
  }, [composed]);

  const span = scale.max - scale.min;
  const pct = (v) => ((scale.max - v) / span) * 100;   // distância do topo, em %
  const zero = pct(0);

  const gridStyle = { '--n': n, '--colmin': n > 12 ? '44px' : '64px' };

  return (
    <section className="wf-panel wf-board" aria-labelledby="wf-board-title">
      <header className="wf-board-head">
        <div>
          <h2 className="wf-h2" id="wf-board-title">Mês a mês</h2>
          <p className="wf-sub">Cada mês fecha sozinho, sem levar saldo para o próximo. Escolha um mês para ver a conta.</p>
        </div>
        {!noFlow && (
          <ul className="wf-legend" aria-label="Legenda">
            <li><span className="wf-key wf-key-bar" aria-hidden="true" />Sobra com as simulações</li>
            <li><span className="wf-key wf-key-tick" aria-hidden="true" />Sem simulações</li>
            {composed.excludedCount > 0 && (
              <li><span className="wf-key wf-key-nodata" aria-hidden="true" />Mês sem lançamentos</li>
            )}
          </ul>
        )}
      </header>

      <div className="wf-board-scroll">
        <div className="wf-grid" style={gridStyle}>
          {/* Gráfico */}
          <div className="wf-row wf-plot-row">
            <div className="wf-axis" aria-hidden="true">
              {scale.ticks.map((t) => (
                <span key={t} className="wf-tick-label wf-num" style={{ top: `${pct(t)}%` }}>{tickLabel(t)}</span>
              ))}
            </div>
            <div className="wf-plot">
              <div className="wf-gridlines" aria-hidden="true">
                {scale.ticks.map((t) => (
                  <span key={t} className={t === 0 ? 'wf-zero' : 'wf-gridline'} style={{ top: `${pct(t)}%` }} />
                ))}
              </div>
              {composed.months.map((m, i) => (
                <MonthColumn
                  key={m.ym} m={m} pct={pct} zero={zero}
                  selected={i === selected} onSelect={() => onSelect(i)}
                />
              ))}
            </div>
          </div>

          {/* Meses */}
          <div className="wf-row wf-months-row">
            <div className="wf-cell-label" />
            {composed.months.map((m, i) => (
              <button
                key={m.ym} type="button" tabIndex={-1} aria-hidden="true"
                className={`wf-month${i === selected ? ' is-selected' : ''}${m.status === 'negative' ? ' is-neg' : ''}`}
                onClick={() => onSelect(i)}
              >
                {n > 12 ? (
                  <>
                    {m.label.slice(0, 3)}
                    {(i === 0 || m.ym.endsWith('-01')) && <span className="wf-month-year">{m.ym.slice(0, 4)}</span>}
                  </>
                ) : m.label}
              </button>
            ))}
          </div>

          {/* Simulações */}
          <div className="wf-row wf-sims-head">
            <div className="wf-cell-label wf-sims-title">
              <h3 className="wf-h3">Simulações</h3>
              {saved.length > 0 && (
                <span className="wf-sims-count">
                  <strong className="wf-num">{onCount}</strong> de {saved.length} {saved.length === 1 ? 'ligada' : 'ligadas'}
                </span>
              )}
            </div>
            <div className="wf-sims-head-fill">
              {saved.length > 1 && (
                <span className="wf-sims-bulk">
                  <button type="button" className="wf-link" onClick={() => onSetAll(true)} disabled={onCount === saved.length}>Ligar todas</button>
                  <button type="button" className="wf-link" onClick={() => onSetAll(false)} disabled={onCount === 0}>Desligar todas</button>
                </span>
              )}
            </div>
          </div>

          {rows.length === 0 ? (
            <div className="wf-row">
              <p className="wf-empty-line">
                Nenhuma simulação ainda. Use <strong>Simular algo</strong> para testar uma compra, uma venda ou um gasto novo.
              </p>
            </div>
          ) : rows.map((row) => (
            <SimRow
              key={row.id} row={row} n={n} selected={selected}
              saving={saving} onToggle={onToggle} onEdit={onEdit}
            />
          ))}
        </div>
      </div>

      {ownedCount > 0 && (
        <footer className="wf-board-foot">
          <button type="button" className="wf-link wf-link-danger" onClick={onClearMine} disabled={saving}>
            Remover minhas simulações
          </button>
        </footer>
      )}
    </section>
  );
}

function MonthColumn({ m, pct, zero, selected, onSelect }) {
  if (!m.hasData) {
    return (
      <button
        type="button" className={`wf-col is-nodata${selected ? ' is-selected' : ''}`} onClick={onSelect}
        aria-pressed={selected} aria-label={`${m.label}: sem lançamentos`}
      >
        <span className="wf-col-nodata" style={{ top: `${zero}%` }} title="Sem lançamentos" />
      </button>
    );
  }

  const top = Math.min(pct(m.result), zero);
  const height = Math.abs(pct(m.result) - zero);
  const neg = m.result < 0;
  const changed = Math.round(m.result * 100) !== Math.round(m.baselineResult * 100);
  const label = `${m.label}: sobra ${money(m.result)}${changed ? `, sem simulações ${money(m.baselineResult)}` : ''}`;

  return (
    <button
      type="button" className={`wf-col${selected ? ' is-selected' : ''}`} onClick={onSelect}
      aria-pressed={selected} aria-label={label} title={label}
    >
      <span className={`wf-bar${neg ? ' is-neg' : ''}`} style={{ top: `${top}%`, height: `max(${height}%, 2px)` }} />
      {changed && <span className="wf-base-tick" style={{ top: `${pct(m.baselineResult)}%` }} />}
      {/* O rótulo fica além da coluna e do traço, o que estiver mais longe do zero, para não cruzar o traço. */}
      <span
        className={`wf-bar-val wf-num${neg ? ' is-neg is-below' : ''}`}
        style={neg
          ? { top: `${Math.max(top + height, changed ? pct(m.baselineResult) : 0)}%` }
          : { top: `${Math.min(top, changed ? pct(m.baselineResult) : 100)}%` }}
      >
        {moneyShort(m.result)}
      </span>
    </button>
  );
}

function SimRow({ row, n, selected, saving, onToggle, onEdit }) {
  const { sim, name, owner, schedule, isDraft } = row;
  const monthly = schedule?.monthly ?? [];
  const warnings = schedule?.warnings ?? [];
  const continues = warnings.some((w) => w.code === 'AfterWindow');
  const startedBefore = warnings.some((w) => w.code === 'Truncated');
  const kind = sim.type === 'Income' ? 'is-income' : 'is-expense';
  const editable = sim.isOwner && !isDraft;
  const total = schedule?.totalInHorizon ?? 0;
  const lastOn = monthly.reduce((acc, v, i) => (v !== 0 ? i : acc), -1);
  const endsAt = continues && schedule.installmentsTotal
    ? shortMonth(addMonths(sim.startMonth, schedule.installmentsTotal - 1)) : '';
  const meta = [
    MODE_LABEL[sim.mode], endsAt && `vai até ${endsAt}`, isDraft ? 'rascunho' : owner.text,
  ].filter(Boolean).join(' · ');

  return (
    <div className={`wf-row wf-sim${sim.enabled ? '' : ' is-off'}${isDraft ? ' is-draft' : ''}`}>
      <div className="wf-cell-label wf-sim-label">
        <div className="wf-sim-text">
          {editable ? (
            <button type="button" className="wf-sim-name" onClick={() => onEdit(sim)} disabled={saving} title={`Editar ${name}`}>
              {name}
            </button>
          ) : (
            <span className="wf-sim-name is-static" title={sim.isOwner ? name : `${name}, criada por ${owner.name}`}>{name}</span>
          )}
          <span className="wf-sim-meta">
            {meta} · <span className="wf-num" title="Total dentro do período">{signedMoney(total)} no período</span>
          </span>
        </div>
        {isDraft ? (
          <span className="wf-state is-draft">Rascunho</span>
        ) : (
          // O estado vem escrito no botão, não só na cor: "Ligada" entra na conta, "Desligada" não.
          <button
            type="button" role="switch" aria-checked={sim.enabled}
            className={`wf-state${sim.enabled ? ' is-on' : ''}`}
            aria-label={`${name}: ${sim.enabled ? 'ligada, entra na conta' : 'desligada, fora da conta'}`}
            title={sim.enabled ? 'Entra na conta. Clique para desligar.' : 'Fora da conta. Clique para ligar.'}
            onClick={() => onToggle(sim.id)}
          >
            <span className="wf-state-dot" aria-hidden="true" />
            {sim.enabled ? 'Ligada' : 'Desligada'}
          </button>
        )}
      </div>

      {Array.from({ length: n }, (_, i) => {
        const v = monthly[i] ?? 0;
        if (v === 0) return <div key={i} className={`wf-cell${i === selected ? ' is-selected' : ''}`} />;
        const prevOn = i > 0 && (monthly[i - 1] ?? 0) !== 0;
        const nextOn = i < n - 1 && (monthly[i + 1] ?? 0) !== 0;
        const cls = [
          'wf-chip', kind,
          !prevOn && !(i === 0 && startedBefore) ? 'is-start' : '',
          !nextOn && !(i === lastOn && continues) ? 'is-end' : '',
          i === lastOn && continues ? 'is-continues' : '',
        ].filter(Boolean).join(' ');
        return (
          <div key={i} className={`wf-cell${i === selected ? ' is-selected' : ''}`}>
            <span className={cls} title={`${name}: ${signedMoney(v)}`}>
              <span className="wf-chip-val wf-num">{amountShort(v)}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
