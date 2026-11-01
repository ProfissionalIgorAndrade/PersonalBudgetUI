/**
 * Escala e formatos do quadro mês a mês.
 */

const STEPS = [1, 2, 2.5, 5, 10];

/**
 * Escala "redonda" que sempre inclui o zero, para colunas acima e abaixo da
 * linha do zero. Devolve { min, max, ticks } com 3 a 6 marcas em passos iguais;
 * a marca de cima fica acima do maior valor (a coluna nunca encosta na borda).
 */
export function niceScale(values, target = 4) {
  const lo = Math.min(0, ...values);
  const hi = Math.max(0, ...values);
  if (lo === hi) return { min: 0, max: 1000, ticks: [0, 500, 1000] };

  const raw = (hi - lo) / target;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = mag * STEPS.find((s) => s * mag >= raw);

  const min = lo < 0 ? Math.floor(lo / step) * step - (lo % step === 0 ? step : 0) : 0;
  const max = hi > 0 ? Math.ceil(hi / step) * step + (hi % step === 0 ? step : 0) : 0;
  const ticks = [];
  for (let v = min; v <= max + step / 2; v += step) ticks.push(Math.round(v * 100) / 100);
  return { min, max, ticks };
}

const int = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });

/** "−R$ 8.936" (sem centavos), para rótulos de coluna. Zero sem sinal. */
export function moneyShort(v) {
  const r = Math.round(v);
  if (r === 0) return 'R$ 0';
  return `${r < 0 ? '−' : '+'}R$ ${int.format(Math.abs(r))}`;
}

/** "−1.573" para células estreitas da linha do tempo. */
export function amountShort(v) {
  const r = Math.round(v);
  if (r === 0) return '0';
  return `${r < 0 ? '−' : '+'}${int.format(Math.abs(r))}`;
}

/** Marca do eixo: "20 mil", "−5 mil", "0", "750". */
export function tickLabel(v) {
  if (v === 0) return '0';
  const a = Math.abs(v);
  const sign = v < 0 ? '−' : '';
  if (a >= 1000) return `${sign}${(a / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`;
  return `${sign}${int.format(a)}`;
}
