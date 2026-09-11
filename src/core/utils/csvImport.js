/**
 * Leitura do CSV de importação de lançamentos de cartão.
 *
 * O parsing acontece no navegador, não no servidor, porque a tela precisa
 * mostrar as linhas para conferência e edição antes de qualquer gravação.
 * O que sai daqui é rascunho: nada é enviado sem o usuário confirmar.
 */

/** Colunas do modelo, na ordem em que aparecem no arquivo. */
export const TEMPLATE_COLUMNS = [
  'descricao',
  'valor',
  'data',
  'categoria',
  'membro',
  'observacoes',
];

const EXAMPLE_ROWS = [
  ['Supermercado Pão de Açúcar', '250,90', '2026-07-15', 'Mercado', 'Familia', 'Compra do mês'],
  ['Uber - aeroporto', '68,40', '2026-07-18', 'Transporte', 'Igor Andrade', ''],
  ['Estorno assinatura', '-29,90', '2026-07-20', 'Assinaturas', 'Igor Andrade', 'Cancelamento'],
];

/**
 * Modelo para download. Vai com BOM para o Excel abrir acentuação
 * corretamente, e com linhas de exemplo — um arquivo só com cabeçalho não
 * comunica o formato esperado de data nem de valor negativo.
 */
export function buildTemplateCsv() {
  const lines = [TEMPLATE_COLUMNS.join(',')];
  for (const row of EXAMPLE_ROWS) {
    lines.push(row.map(escapeField).join(','));
  }
  return '\uFEFF' + lines.join('\r\n') + '\r\n';
}

function escapeField(v) {
  const s = String(v ?? '');
  return /[",;\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Divide uma linha respeitando aspas duplas e aspas escapadas (""). */
export function splitCsvLine(line, sep) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === sep && !inQuotes) {
      out.push(cur); cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map(s => s.trim());
}

/**
 * Detecta o separador pela primeira linha. Excel em português salva com
 * ponto e vírgula, e um arquivo assim lido com vírgula vira uma coluna só.
 */
export function detectSeparator(headerLine) {
  const semi = (headerLine.match(/;/g) || []).length;
  const comma = (headerLine.match(/,/g) || []).length;
  return semi > comma ? ';' : ',';
}

/**
 * Aceita 1.234,56 / 1,234.56 / 1234.56 / -29,90 e "R$ 250,90".
 *
 * A ambiguidade real é 1,234: pode ser mil duzentos e trinta e quatro em
 * inglês ou um vírgula duzentos e trinta e quatro em português. Como o
 * arquivo vem de banco brasileiro, o último separador decide — se for
 * vírgula, é decimal.
 */
export function parseAmount(raw) {
  if (raw == null) return NaN;
  let s = String(raw).replace(/\s/g, '').replace(/R\$/gi, '');
  if (!s) return NaN;
  const negative = s.startsWith('-') || /^\(.*\)$/.test(s);
  s = s.replace(/[()-]/g, '');

  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma > lastDot)      s = s.replace(/\./g, '').replace(',', '.');
  else if (lastDot > lastComma) s = s.replace(/,/g, '');
  else                          s = s.replace(/[.,]/g, '');

  const n = Number(s);
  if (!Number.isFinite(n)) return NaN;
  return negative ? -n : n;
}

/** Aceita 2026-07-15, 15/07/2026 e 15-07-2026. Devolve sempre YYYY-MM-DD. */
export function parseDate(raw) {
  const s = String(raw ?? '').trim();
  if (!s) return '';
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return '';
}

/**
 * Lê o conteúdo do arquivo e devolve uma linha de rascunho por registro.
 *
 * Nunca lança: uma célula ruim vira um erro naquela linha, com as demais
 * preservadas. Rejeitar o arquivo inteiro por causa de uma data mal
 * formatada obrigaria o usuário a corrigir no escuro, fora da tela.
 */
export function parseImportCsv(text, { categories = [], members = [] } = {}) {
  const clean = String(text ?? '').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const lines = clean.split('\n').filter(l => l.trim() !== '');

  if (lines.length === 0) return { rows: [], fatal: 'Arquivo vazio.' };

  const sep = detectSeparator(lines[0]);
  const header = splitCsvLine(lines[0], sep).map(h => h.toLowerCase().replace(/^"|"$/g, ''));

  const missing = ['descricao', 'valor', 'data'].filter(c => !header.includes(c));
  if (missing.length) {
    return { rows: [], fatal: `Colunas obrigatórias ausentes: ${missing.join(', ')}. Baixe o modelo para ver o formato.` };
  }

  const idx = (name) => header.indexOf(name);
  const byName = (list, name) => {
    const t = String(name ?? '').trim().toLowerCase();
    if (!t) return null;
    return list.find(x => String(x.name ?? '').trim().toLowerCase() === t) || null;
  };

  const rows = lines.slice(1).map((line, i) => {
    const f = splitCsvLine(line, sep);
    const get = (name) => { const j = idx(name); return j >= 0 && j < f.length ? f[j] : ''; };

    const description = get('descricao');
    const amount = parseAmount(get('valor'));
    const date = parseDate(get('data'));
    const catName = get('categoria');
    const memName = get('membro');
    const cat = byName(categories, catName);
    const mem = byName(members, memName);

    const errors = [];
    if (!description) errors.push('Descrição vazia.');
    if (!Number.isFinite(amount) || amount === 0) errors.push('Valor inválido.');
    if (!date) errors.push('Data inválida — use AAAA-MM-DD ou DD/MM/AAAA.');
    if (catName && !cat) errors.push(`Categoria "${catName}" não existe — escolha uma na lista.`);
    if (memName && !mem) errors.push(`Membro "${memName}" não encontrado.`);

    return {
      key: `row-${i}`,
      lineNumber: i + 2,
      selected: errors.length === 0,
      description,
      amount: Number.isFinite(amount) ? Math.abs(amount) : '',
      type: Number.isFinite(amount) && amount < 0 ? 'income' : 'expense',
      date,
      categoryId: cat?.id || '',
      memberId: mem?.id || '',
      notes: get('observacoes'),
      errors,
    };
  });

  return { rows, fatal: null };
}

/**
 * Erros que impedem o envio de uma linha, recalculados após edição na tela.
 * Categoria entra aqui porque é obrigatória no cadastro normal.
 */
export function validateImportRow(row) {
  const errors = [];
  if (!String(row.description ?? '').trim()) errors.push('Descrição obrigatória.');
  const a = Number(row.amount);
  if (!Number.isFinite(a) || a <= 0) errors.push('Valor deve ser maior que zero.');
  if (!row.date) errors.push('Data obrigatória.');
  if (!row.categoryId) errors.push('Selecione uma categoria.');
  if (!row.memberId) errors.push('Selecione um membro.');
  return errors;
}
