import React, { useState } from 'react';

/**
 * Peças compartilhadas pelos widgets da Saúde Financeira.
 *
 * Nenhuma delas usa canvas: os gráficos são HTML/SVG, o que mantém cada marca
 * focável por teclado e legível em qualquer tema sem resolver CSS vars na mão.
 */

export const STATUS_ICON = { good: '✓', warning: '!', critical: '✕', unknown: '?' };

/** Sinal e percentual sempre explícitos: "+12%" / "−5%". */
export function signedPct(v, digits = 0) {
  if (v === null || v === undefined || !Number.isFinite(v)) return null;
  const abs = Math.abs(v * 100).toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  return `${v < 0 ? '−' : '+'}${abs}%`;
}

/** Valor compacto para eixo: 950, 1,2k, 12k. */
export function compact(v) {
  const a = Math.abs(v);
  const sign = v < 0 ? '−' : '';
  if (a >= 10000) return `${sign}${Math.round(a / 1000)}k`;
  if (a >= 1000) return `${sign}${(a / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k`;
  return `${sign}${Math.round(a)}`;
}

/** Cartão de widget: título, subtítulo opcional e ações (toggle) no cabeçalho. */
export function HlCard({ id, title, subtitle, actions, children, className = '' }) {
  const headingId = `hl-h-${id}`;
  return (
    <section className={`hl-card ${className}`.trim()} aria-labelledby={headingId} data-widget={id}>
      <header className="hl-card-head">
        <div>
          <h2 className="hl-card-title" id={headingId}>{title}</h2>
          {subtitle && <p className="hl-card-sub">{subtitle}</p>}
        </div>
        {actions}
      </header>
      {children}
    </section>
  );
}

/** Alterna entre a visão gráfica e a tabela equivalente. */
export function HlToggle({ value, onChange, label = 'Modo de exibição' }) {
  const opts = [{ id: 'chart', label: 'Gráfico' }, { id: 'table', label: 'Tabela' }];
  return (
    <div className="hl-toggle" role="group" aria-label={label}>
      {opts.map(o => (
        <button key={o.id} type="button" aria-pressed={value === o.id} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Estado de um pilar/veredito: ícone + texto, nunca só cor. */
export function HlStatus({ level, label }) {
  return (
    <span className={`hl-status hl-${level}`}>
      <span className="hl-status-icon" aria-hidden="true">{STATUS_ICON[level]}</span>
      {label}
    </span>
  );
}

/** Estado vazio explícito. */
export function HlEmpty({ children }) {
  return <p className="hl-empty">{children}</p>;
}

/**
 * Mini-série de tendência: linha cinza, ponto final na cor de destaque.
 * `points` aceita null (mês sem base), que abre uma lacuna na linha.
 */
export function HlSpark({ points, ariaLabel }) {
  const W = 96, H = 28, PAD = 5;
  const vals = points.map(p => p.value).filter(v => v !== null && Number.isFinite(v));
  if (vals.length === 0) return null;
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const span = hi - lo || 1;
  const x = (i) => PAD + (i * (W - PAD * 2)) / Math.max(points.length - 1, 1);
  const y = (v) => H - PAD - ((v - lo) / span) * (H - PAD * 2);

  const segments = [];
  let cur = [];
  points.forEach((p, i) => {
    if (p.value === null || !Number.isFinite(p.value)) { if (cur.length) segments.push(cur); cur = []; return; }
    cur.push(`${x(i).toFixed(1)},${y(p.value).toFixed(1)}`);
  });
  if (cur.length) segments.push(cur);

  let lastIdx = -1;
  points.forEach((p, i) => { if (p.value !== null && Number.isFinite(p.value)) lastIdx = i; });

  return (
    <svg className="hl-spark" width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel}>
      <title>{ariaLabel}</title>
      {segments.map((s, i) => <polyline key={i} points={s.join(' ')} className="hl-spark-line" />)}
      <circle cx={x(lastIdx)} cy={y(points[lastIdx].value)} r="4" className="hl-spark-dot" />
    </svg>
  );
}

/**
 * Barras horizontais ranqueadas, uma cor só. Cada linha é focável e traz o
 * mesmo detalhe no foco e no hover (title), e o valor fica na ponta da barra.
 *
 * rows: { key, label, icon?, value, valueText, detail?, tone?: 'accent'|'muted' }
 */
export function HlRankBars({ rows, ariaLabel }) {
  const max = Math.max(...rows.map(r => r.value), 0) || 1;
  return (
    <ul className="hl-rank" aria-label={ariaLabel}>
      {rows.map(r => (
        <li key={r.key} className="hl-rank-row" tabIndex={0} title={r.detail || `${r.label}: ${r.valueText}`}
          aria-label={r.detail || `${r.label}: ${r.valueText}`}>
          <span className="hl-rank-label">
            {r.icon && <span aria-hidden="true">{r.icon} </span>}{r.label}
          </span>
          <span className="hl-rank-track" aria-hidden="true">
            <span className={`hl-rank-bar hl-tone-${r.tone || 'accent'}`}
              style={{ width: `${Math.max((Math.max(r.value, 0) / max) * 100, 1.5)}%` }} />
          </span>
          <span className="hl-rank-value">{r.valueText}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Gráfico SVG de um único eixo: colunas (sobra) ou linha (taxa).
 *
 * points: { key, label, value|null }. reference: linha fina contínua e rotulada.
 * Cada ponto tem uma área de foco/hover cobrindo toda a faixa vertical; a
 * leitura do ponto ativo aparece abaixo do gráfico (e o último é o padrão).
 */
export function HlEvoChart({ points, kind, format, axisFormat, title, reference, ariaLabel }) {
  const [active, setActive] = useState(null);
  const W = 320, H = 150, L = 40, R = 10, T = 12, B = 24;
  const plotW = W - L - R, plotH = H - T - B;

  const vals = points.map(p => p.value).filter(v => v !== null && Number.isFinite(v));
  const refVal = reference ? reference.value : null;
  const all = refVal === null || refVal === undefined ? vals : [...vals, refVal];
  let lo = Math.min(0, ...all), hi = Math.max(0, ...all);
  if (hi === lo) hi = lo + 1;
  const pad = (hi - lo) * 0.08;
  if (hi > 0) hi += pad;
  if (lo < 0) lo -= pad;

  const band = plotW / points.length;
  const cx = (i) => L + band * i + band / 2;
  const y = (v) => T + plotH - ((v - lo) / (hi - lo)) * plotH;
  const ticks = [lo, (lo + hi) / 2, hi];

  const lastIdx = points.reduce((acc, p, i) => (p.value !== null ? i : acc), -1);
  const shown = active !== null ? active : lastIdx;
  const shownPoint = shown >= 0 ? points[shown] : null;

  const segments = [];
  if (kind === 'line') {
    let cur = [];
    points.forEach((p, i) => {
      if (p.value === null) { if (cur.length) segments.push(cur); cur = []; return; }
      cur.push(`${cx(i).toFixed(1)},${y(p.value).toFixed(1)}`);
    });
    if (cur.length) segments.push(cur);
  }

  const barW = Math.min(24, band * 0.5);

  return (
    <figure className="hl-evo">
      <figcaption className="hl-evo-title">{title}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="hl-evo-svg" role="group" aria-label={ariaLabel}>
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} className="hl-grid" />
            <text x={L - 6} y={y(t) + 3} textAnchor="end" className="hl-axis">{axisFormat(t)}</text>
          </g>
        ))}
        {lo < 0 && hi > 0 && <line x1={L} x2={W - R} y1={y(0)} y2={y(0)} className="hl-baseline" />}
        {reference && (
          <g>
            <line x1={L} x2={W - R} y1={y(reference.value)} y2={y(reference.value)} className="hl-ref" />
            <text x={W - R} y={y(reference.value) - 4} textAnchor="end" className="hl-axis">{reference.label}</text>
          </g>
        )}

        {kind === 'columns' && points.map((p, i) => {
          if (p.value === null) return null;
          const top = Math.min(y(p.value), y(0));
          const h = Math.max(Math.abs(y(p.value) - y(0)), 1);
          return (
            <rect key={p.key} x={cx(i) - barW / 2} y={top} width={barW} height={h} rx="3"
              className={`hl-mark${shown === i ? ' is-active' : ''}`} />
          );
        })}

        {kind === 'line' && segments.map((s, i) => <polyline key={i} points={s.join(' ')} className="hl-line" />)}
        {kind === 'line' && points.map((p, i) => (p.value === null ? null : (
          <circle key={p.key} cx={cx(i)} cy={y(p.value)} r={shown === i ? 5 : 4}
            className={`hl-dot${shown === i ? ' is-active' : ''}`} />
        )))}

        {points.map((p, i) => (
          <text key={`l${p.key}`} x={cx(i)} y={H - 7} textAnchor="middle" className="hl-axis">{p.label}</text>
        ))}

        {points.map((p, i) => (
          <rect key={`h${p.key}`} x={L + band * i} y={T} width={band} height={plotH + B - 4}
            className="hl-hit" tabIndex={0} role="img"
            aria-label={`${p.label}: ${p.value === null ? 'sem dados' : format(p.value)}`}
            onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)}
            onFocus={() => setActive(i)} onBlur={() => setActive(null)} />
        ))}
      </svg>
      <p className="hl-readout" aria-live="polite">
        {shownPoint
          ? <><span>{shownPoint.label}</span> <strong>{shownPoint.value === null ? 'sem dados' : format(shownPoint.value)}</strong></>
          : 'Sem dados no período.'}
      </p>
    </figure>
  );
}
