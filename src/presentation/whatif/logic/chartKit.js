import { useLayoutEffect, useRef, useState } from 'react';
import { R$ } from '../../../core/utils/format';

/**
 * Peças comuns dos gráficos do "E se...?": largura medida, cor da simulação e
 * formatos de valor.
 */

/** Largura do elemento, atualizada quando ele muda de tamanho. */
export function useWidth(fallback = 800) {
  const ref = useRef(null);
  const [width, setWidth] = useState(fallback);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    setWidth(el.clientWidth || fallback);
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width) || fallback));
    ro.observe(el);
    return () => ro.disconnect();
  }, [fallback]);
  return [ref, width];
}

/** Cor da simulação pelo slot estável (1..6 ou 'other'), via tokens do tema. */
export const simColor = (slot) => (slot === 'other' ? 'var(--wf-cat-other)' : `var(--wf-cat-${slot})`);

/** "−R$ 8.935,78"; positivo e zero sem sinal. */
export const money = (v) => (v < 0 ? `−${R$(-v)}` : R$(v));

/** Simulações que entram na conta, com o slot de cor. */
export const activeRows = (rows) => rows.filter((r) => r.sim.enabled || r.isDraft);

/** Valor de uma simulação no mês i (0 quando não cai). */
export const simAt = (row, i) => row.schedule?.monthly?.[i] ?? 0;
