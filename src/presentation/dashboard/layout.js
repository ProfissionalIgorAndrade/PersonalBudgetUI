/**
 * Reconcilia o layout salvo com o conjunto de widgets que existe hoje.
 *
 * O layout mora no localStorage e era usado como veio. Isso produzia dois
 * problemas silenciosos:
 *
 * - widget novo nunca aparecia para quem já tinha um layout salvo, porque o
 *   padrão só era usado quando não havia nada guardado;
 * - id repetido no armazenamento renderizava o mesmo widget duas vezes, cada
 *   um com seus próprios controles, disputando o mesmo espaço.
 *
 * A reconciliação preserva o que o usuário escolheu — posição, ordem e
 * visibilidade —, acrescenta o que é novo e descarta o que não existe mais.
 */
export function reconcileLayout(stored, defaults) {
  const byId = new Map(defaults.map(w => [w.id, w]));
  const seen = new Set();
  const kept = [];

  for (const w of Array.isArray(stored) ? stored : []) {
    const def = byId.get(w?.id);
    // Descarta id desconhecido (widget removido do app) e repetido.
    if (!def || seen.has(w.id)) continue;
    seen.add(w.id);
    kept.push({
      ...def,
      col:     typeof w.col === 'number' ? w.col : def.col,
      order:   typeof w.order === 'number' ? w.order : def.order,
      visible: typeof w.visible === 'boolean' ? w.visible : def.visible,
    });
  }

  // Widgets novos entram no fim da coluna que o padrão indica, para não
  // empurrar o que o usuário já organizou.
  for (const def of defaults) {
    if (seen.has(def.id)) continue;
    const lastInCol = kept.filter(w => w.col === def.col).reduce((m, w) => Math.max(m, w.order), -1);
    kept.push({ ...def, order: lastInCol + 1 });
  }

  return kept;
}
