/**
 * Registro de widgets da Saúde Financeira.
 *
 * Os obrigatórios têm ordem fixa e ficam sempre no topo: não entram no layout
 * salvo nem no personalizador. O catálogo é opcional, todo desligado por
 * padrão, e só ele é ligado/desligado e reordenado pelo usuário.
 * Chave de storage própria; não compartilha nada com a Dashboard.
 */
export const LAYOUT_KEY = 'pb_health_layout';

export const MANDATORY_IDS = ['verdict', 'month-result', 'pillars', 'savings', 'spending', 'evolution', 'future'];

export const CATALOG = [
  { id: 'cashflow', title: 'Fluxo de caixa (6 meses)', group: 'Fluxo e tendências', description: 'Receita contra despesa nos 6 meses até o mês selecionado.' },
  { id: 'pace', title: 'Ritmo de gasto no mês', group: 'Fluxo e tendências', description: 'Quanto já gastou contra o esperado para o dia do mês.' },
  { id: 'weekday', title: 'Padrão por dia da semana', group: 'Fluxo e tendências', description: 'Em que dias da semana a despesa se concentra.' },
  { id: 'share', title: 'Participação por categoria', group: 'Categorias', description: 'Peso de cada categoria na despesa, em uma barra única.' },
  { id: 'trend', title: 'Tendência por categoria', group: 'Categorias', description: 'Evolução das maiores categorias em 3, 6 ou 12 meses.' },
  { id: 'increases', title: 'Maiores aumentos vs média', group: 'Categorias', description: 'Categorias que mais subiram contra a média dos 3 meses anteriores.' },
  { id: 'member-expense', title: 'Gasto por membro', group: 'Pessoas', description: 'Quanto cada membro da família gastou no mês.' },
  { id: 'member-income', title: 'Renda por membro', group: 'Pessoas', description: 'Quanto cada membro recebeu no mês.' },
  { id: 'income-sources', title: 'Fontes de renda', group: 'Pessoas', description: 'De onde vem a receita do mês.' },
  { id: 'invoices', title: 'Faturas e uso do limite', group: 'Cartões e contas', description: 'Fatura do mês de cada cartão e quanto do limite está usado.' },
  { id: 'balances', title: 'Saldo das contas', group: 'Cartões e contas', description: 'Saldo atual de cada conta corrente.' },
  { id: 'boxes', title: 'Caixinhas e metas', group: 'Cartões e contas', description: 'Saldo, meta e movimentos recentes de cada caixinha.' },
  { id: 'latest', title: 'Últimos lançamentos', group: 'Cartões e contas', description: 'Os lançamentos mais recentes do mês.' },
  { id: 'review', title: 'Progresso de revisão', group: 'Cartões e contas', description: 'Quanto dos lançamentos do mês já foi revisado.' },
  { id: 'fixed', title: 'Fixos do mês', group: 'Planejamento', description: 'Despesas fixas do mês e o peso delas na renda.' },
  { id: 'installments', title: 'Parcelamentos ativos', group: 'Planejamento', description: 'Parcelas em andamento, meses e valor que faltam.' },
  { id: 'subscriptions', title: 'Assinaturas', group: 'Planejamento', description: 'Fixos da categoria Assinaturas, com custo anual.' },
  { id: 'rule', title: 'Regra 50/30/20', group: 'Planejamento', description: 'Necessidades, desejos e poupança sobre a renda (aproximação).' },
  { id: 'projection', title: 'Projeção de saldo (6 meses)', group: 'Planejamento', description: 'Saldo das contas somando renda média menos compromissos lançados.' },
];

const CATALOG_IDS = new Set(CATALOG.map(w => w.id));

/** Layout inicial: todo o catálogo desligado, na ordem do registro. */
export const defaultLayout = () => CATALOG.map(w => ({ id: w.id, on: false }));

/**
 * Reconcilia o layout salvo com o registro atual: descarta ids desconhecidos,
 * duplicados e obrigatórios; preserva ordem e on/off do que sobra; acrescenta
 * (desligados) os widgets novos do registro ao final. Aceita qualquer lixo.
 */
export function reconcileLayout(stored) {
  const seen = new Set();
  const kept = [];
  if (Array.isArray(stored)) {
    for (const entry of stored) {
      const id = typeof entry === 'string' ? entry : entry?.id;
      if (!CATALOG_IDS.has(id) || seen.has(id)) continue; // obrigatórios nunca estão em CATALOG_IDS
      seen.add(id);
      kept.push({ id, on: typeof entry === 'string' ? true : entry.on === true });
    }
  }
  for (const w of CATALOG) if (!seen.has(w.id)) kept.push({ id: w.id, on: false });
  return kept;
}

export const toggleWidget = (layout, id) => layout.map(w => (w.id === id ? { ...w, on: !w.on } : w));

/** Move um widget uma posição (-1 sobe, +1 desce). Nos limites devolve o layout igual. */
export function moveWidget(layout, id, dir) {
  const i = layout.findIndex(w => w.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= layout.length) return layout;
  const next = [...layout];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

/** Ids ligados, na ordem do layout. */
export const enabledIds = (layout) => layout.filter(w => w.on).map(w => w.id);
