import React, { useMemo, useRef, useState } from 'react';
import Modal from '../../shared/components/Modal';
import { R$ } from '../../../core/utils/format';
import CurrencyInput from '../../shared/components/CurrencyInput';
import { cardLabel } from '../../../application/mappers/index';
import { buildTemplateCsv, parseImportCsv, validateImportRow } from '../../../core/utils/csvImport';
import { generateTransactionsCsv } from '../../../core/utils/csvExport';
import { CSV_COLUMNS, TYPE_LABEL, downloadCsv } from '../../../core/utils/csvFormat';

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

const toApiRow = (r) => ({
  externalId:           r.externalId || null,
  description:          r.description,
  amount:               Number(r.amount) || 0,
  date:                 r.date,
  type:                 r.type === 'income' ? 'Income' : 'Expense',
  categoryId:           r.categoryId || null,
  attributionProfileId: r.memberId   || null,
  observations:         r.notes      || null,
});

/**
 * Modal unificado de CSV — import e export na mesma interface, sempre de uma
 * fatura (cartão + mês/ano). O arquivo exportado é o mesmo que a importação lê.
 *
 * Export: choose → export → download
 * Import: choose → upload (fatura + arquivo) → review (só as novas) → running
 */
export default function ImportCsvModal({
  transactions, cards, categories, members, activeMonth,
  onImportStatement, onClose,
}) {
  const now = new Date();
  const [activeYear, activeMonthNum] = (activeMonth || '').split('-').map(Number);

  const [step, setStep] = useState('choose'); // choose | export | upload | review | running

  // ── Fatura (vale para export e import) ────────────────────────
  const [cardId, setCardId] = useState(cards[0]?.id || '');
  const [month,  setMonth]  = useState(activeMonthNum || now.getMonth() + 1);
  const [year,   setYear]   = useState(activeYear     || now.getFullYear());

  // ── Import state ──────────────────────────────────────────────
  const [rows,     setRows]     = useState([]);
  const [fatal,    setFatal]    = useState('');
  const [fileName, setFileName] = useState('');
  const [checking, setChecking] = useState(false);

  const [result,  setResult]  = useState(null);
  const [running, setRunning] = useState(false);
  const fileInput = useRef(null);

  const card = (cards || []).find(c => c.id === cardId);
  const statementLabel = `${String(month).padStart(2, '0')}/${year}`;
  const years = [...new Set([now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1, year])]
    .sort((a, b) => a - b);

  const statementTx = (transactions || []).filter(t =>
    t.cardId === cardId &&
    Number(t.statementMonth) === Number(month) &&
    Number(t.statementYear)  === Number(year)
  );

  // ── Export helpers ────────────────────────────────────────────
  const handleExport = () => {
    const name = card?.name?.toLowerCase().replace(/\s+/g, '-') || 'cartao';
    const csv  = generateTransactionsCsv(statementTx, categories, members);
    downloadCsv(`fatura-${name}-${String(month).padStart(2,'0')}-${year}.csv`, csv);
    onClose();
  };

  // ── Import helpers ────────────────────────────────────────────
  const withErrors = useMemo(
    () => rows.map(r => ({ ...r, errors: validateImportRow(r) })),
    [rows],
  );
  const existingRows  = withErrors.filter(r => r.existing);
  const newRows       = withErrors.filter(r => !r.existing);
  const selected      = newRows.filter(r => r.selected);
  const selectedValid = selected.filter(r => r.errors.length === 0);
  const blocked       = selected.length - selectedValid.length;
  const total         = selectedValid.reduce(
    (s, r) => s + (r.type === 'income' ? -Number(r.amount) : Number(r.amount)), 0);

  const setRow = (key, patch) =>
    setRows(prev => prev.map(r => (r.key === key ? { ...r, ...patch } : r)));

  const downloadTemplate = () => downloadCsv('modelo-fatura.csv', buildTemplateCsv());

  // Quem diz o que já existe é o servidor: a prévia compara cada linha com os
  // lançamentos da fatura escolhida, por id_sistema e, na falta dele, por conteúdo.
  const checkExisting = async (parsed) => {
    setChecking(true);
    try {
      const preview = await onImportStatement(cardId, month, year, parsed.map(toApiRow), true);
      const existing = new Set(
        (preview?.rows || []).filter(r => r.status === 'Existing').map(r => r.index));
      setRows(parsed.map((r, i) => ({ ...r, existing: existing.has(i) })));
      setFatal('');
      setStep('review');
    } catch (e) {
      setRows([]);
      setFatal(e.message || 'Não foi possível verificar a fatura.');
    } finally {
      setChecking(false);
    }
  };

  const readFile = (file) => {
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const { rows: parsed, fatal: err } = parseImportCsv(String(reader.result), { categories, members });
      if (err) { setFatal(err); setRows([]); return; }
      if (!parsed.length) { setFatal('Nenhuma linha encontrada além do cabeçalho.'); setRows([]); return; }
      checkExisting(parsed);
    };
    reader.onerror = () => setFatal('Não foi possível ler o arquivo.');
    reader.readAsText(file, 'utf-8');
  };

  const run = async () => {
    setRunning(true);
    setStep('running');
    try {
      const res = await onImportStatement(cardId, month, year, selectedValid.map(toApiRow), false);
      setResult({
        created: res?.created ?? 0,
        // O servidor confere de novo: uma linha editada pode ter virado igual a uma existente.
        skipped: existingRows.length + (res?.skipped ?? 0),
        errors:  res?.errors || [],
      });
    } catch (e) {
      setResult({ created: 0, skipped: existingRows.length, errors: [e.message || 'Erro ao importar'] });
    } finally {
      setRunning(false);
    }
  };

  const cellStyle  = { padding: '6px 8px' };
  const fieldStyle = { fontSize: 12.5, padding: '7px 9px', width: '100%' };
  const noticeStyle = {
    padding: '12px 16px', borderRadius: 10, fontSize: 13,
    background: 'color-mix(in srgb, var(--primary) 10%, transparent)',
    border: '1px solid color-mix(in srgb, var(--primary) 25%, transparent)',
  };

  const statementFields = cards.length === 0 ? (
    <div style={{ padding: '14px 16px', borderRadius: 10, fontSize: 13, color: 'var(--muted)',
      background: 'color-mix(in srgb, var(--surface2) 60%, transparent)',
      border: '1px solid var(--border)' }}>
      Nenhum cartão de crédito cadastrado.
    </div>
  ) : (
    <>
      <div className="form-group">
        <label className="form-label" htmlFor="csv-card">Cartão de crédito *</label>
        <select id="csv-card" className="form-select" value={cardId} onChange={e => setCardId(e.target.value)}>
          {cards.map(c => (
            <option key={c.id} value={c.id}>💳 {cardLabel(c, members)}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="csv-month">Fatura (mês/ano) *</label>
        <div className="flex" style={{ gap: 8 }}>
          <select id="csv-month" className="form-select" value={month} onChange={e => setMonth(Number(e.target.value))}>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select className="form-select" aria-label="Ano da fatura" value={year} onChange={e => setYear(Number(e.target.value))}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>
    </>
  );

  return (
    <Modal
      title={step === 'choose' ? 'CSV — Importar ou Exportar' : step === 'export' ? 'Exportar Fatura CSV' : 'Importar Fatura CSV'}
      onClose={running ? () => {} : onClose}
      size={step === 'review' ? 'full' : 'wide'}
      confirmOnOverlay={step === 'review'}
      confirmMessage="Descartar as linhas conferidas e fechar?"
    >

      {/* ── STEP: CHOOSE ── */}
      {step === 'choose' && (
        <div className="m-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setStep('export')}
            style={{ padding: '28px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, height: 120 }}
          >
            <span style={{ fontSize: 28 }}>📤</span>
            <span style={{ fontSize: 14, fontWeight: 700 }}>Exportar</span>
            <span style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center' }}>Baixar fatura de cartão como CSV</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setStep('upload')}
            style={{ padding: '28px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, height: 120 }}
          >
            <span style={{ fontSize: 28 }}>📥</span>
            <span style={{ fontSize: 14, fontWeight: 700 }}>Importar</span>
            <span style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center' }}>Enviar CSV e criar só o que falta na fatura</span>
          </button>
        </div>
      )}

      {/* ── STEP: EXPORT ── */}
      {step === 'export' && (
        <div>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20, lineHeight: 1.5 }}>
            Selecione o cartão e a fatura. O arquivo gerado pode ser editado e importado de volta:
            lançamentos que já existem são reconhecidos e não são duplicados.
          </p>

          {statementFields}

          {cards.length > 0 && (
            <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>
              {statementTx.length > 0
                ? `${statementTx.length} lançamento(s) encontrado(s) nesta fatura`
                : 'Nenhum lançamento nesta fatura — o CSV será exportado vazio'}
            </p>
          )}

          <div className="flex jce" style={{ gap: 8, marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setStep('choose')}>Voltar</button>
            <button type="button" className="btn btn-primary" disabled={!cardId} onClick={handleExport}>
              📤 Exportar CSV
            </button>
          </div>
        </div>
      )}

      {/* ── STEP: UPLOAD ── */}
      {step === 'upload' && (
        <div>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.5 }}>
            Informe a fatura de destino e envie o arquivo. As linhas são comparadas com os
            lançamentos dessa fatura: as que já existem são ignoradas e só as novas ficam
            disponíveis para conferência.
          </p>

          {statementFields}

          <div style={{ display: 'grid', gap: 10 }}>
            <button type="button" className="btn btn-secondary" onClick={downloadTemplate} style={{ padding: '14px' }}>
              ⬇️ Baixar modelo CSV
            </button>
            <button type="button" className="btn btn-primary" disabled={!cardId || checking}
              onClick={() => fileInput.current?.click()} style={{ padding: '14px' }}>
              {checking ? 'Verificando fatura…' : '⬆️ Selecionar arquivo CSV'}
            </button>
            <input
              ref={fileInput}
              type="file"
              accept=".csv,text/csv"
              style={{ display: 'none' }}
              onChange={e => { readFile(e.target.files?.[0]); e.target.value = ''; }}
            />
          </div>

          {fatal && (
            <div style={{ marginTop: 14, padding: '10px 12px', borderRadius: 10, fontSize: 12,
              background: 'color-mix(in srgb, var(--red) 18%, transparent)',
              border: '1px solid color-mix(in srgb, var(--red) 35%, transparent)' }}>
              {fatal}
            </div>
          )}

          <div style={{ marginTop: 16, fontSize: 11, color: 'var(--muted)', lineHeight: 1.6 }}>
            <strong>Colunas:</strong> {CSV_COLUMNS.join(', ')}<br />
            Obrigatórias: descricao, valor, data · id_sistema vem preenchido na exportação; deixe vazio em linhas novas<br />
            Data em AAAA-MM-DD ou DD/MM/AAAA · Tipo Despesa ou Estorno (valor negativo também vira estorno) ·
            Separador ponto e vírgula ou vírgula
          </div>

          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-start' }}>
            <button type="button" className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => setStep('choose')}>
              ← Voltar
            </button>
          </div>
        </div>
      )}

      {/* ── STEP: REVIEW ── */}
      {step === 'review' && (
        <div>
          <div className="flex jcb aic" style={{ marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>
              💳 <strong>{card ? cardLabel(card, members) : '—'}</strong> · fatura <strong>{statementLabel}</strong> ·{' '}
              {fileName} · {rows.length} linha(s) ·{' '}
              <strong>{newRows.length}</strong> nova(s)
              {blocked > 0 && <span style={{ color: 'var(--red)' }}> · {blocked} com pendência</span>}
            </span>
            <span style={{ fontSize: 13, fontWeight: 800 }}>{R$(total)}</span>
          </div>

          {existingRows.length > 0 && (
            <details style={{ ...noticeStyle, marginBottom: 10 }}>
              <summary style={{ cursor: 'pointer' }}>
                {existingRows.length} linha(s) já existem nesta fatura e serão ignoradas
              </summary>
              <div style={{ maxHeight: 160, overflow: 'auto', marginTop: 8, fontSize: 12, color: 'var(--muted)' }}>
                {existingRows.map(r => (
                  <div key={r.key} style={{ marginBottom: 3 }}>
                    #{r.lineNumber} · {r.date} · {r.description} · {R$(r.amount)}
                    {r.type === 'income' ? ` (${TYPE_LABEL.income})` : ''}
                  </div>
                ))}
              </div>
            </details>
          )}

          {newRows.length === 0 ? (
            <div style={noticeStyle}>
              Todas as linhas do arquivo já existem nesta fatura. Nenhum lançamento novo para importar.
            </div>
          ) : (
            <div className="csv-review-wrap" style={{ maxHeight: '58vh', overflow: 'auto', border: '1px solid var(--border)', borderRadius: 10 }}>
              <table className="csv-table csv-review-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ width: 38 }}>
                      <input
                        type="checkbox"
                        aria-label="Selecionar todas"
                        checked={newRows.every(r => r.selected)}
                        onChange={e => setRows(prev => prev.map(r => (r.existing ? r : { ...r, selected: e.target.checked })))}
                      />
                    </th>
                    <th style={{ width: 44 }}>#</th>
                    <th style={{ minWidth: 240 }}>Descrição</th>
                    <th style={{ width: 130 }}>Valor</th>
                    <th style={{ width: 118 }}>Tipo</th>
                    <th style={{ width: 150 }}>Data</th>
                    <th style={{ width: 190 }}>Categoria</th>
                    <th style={{ width: 170 }}>Membro</th>
                    <th style={{ minWidth: 200 }}>Observações</th>
                  </tr>
                </thead>
                <tbody>
                  {newRows.map(r => (
                    <React.Fragment key={r.key}>
                      <tr className="csv-review-row" style={{ opacity: r.selected ? 1 : .45 }}>
                        <td className="csv-review-check" style={cellStyle}>
                          <input type="checkbox" checked={r.selected}
                            onChange={e => setRow(r.key, { selected: e.target.checked })} />
                        </td>
                        <td className="csv-review-line" style={{ ...cellStyle, color: 'var(--muted)' }}>{r.lineNumber}</td>
                        <td data-label="Descrição" style={cellStyle}>
                          <input className="form-input" style={fieldStyle} value={r.description}
                            onChange={e => setRow(r.key, { description: e.target.value })} />
                        </td>
                        <td data-label="Valor" style={cellStyle}>
                          <div className="flex aic" style={{ gap: 5 }}>
                            <span className="tmuted" style={{ fontSize: 11 }}>R$</span>
                            <CurrencyInput value={r.amount} onChange={v => setRow(r.key, { amount: v })}
                              style={{ ...fieldStyle, textAlign: 'right' }} />
                          </div>
                        </td>
                        <td data-label="Tipo" style={cellStyle}>
                          <select className="form-select" style={fieldStyle} value={r.type}
                            onChange={e => setRow(r.key, { type: e.target.value })}>
                            <option value="expense">{TYPE_LABEL.expense}</option>
                            <option value="income">{TYPE_LABEL.income}</option>
                          </select>
                        </td>
                        <td data-label="Data" style={cellStyle}>
                          <input className="form-input" type="date" style={fieldStyle} value={r.date}
                            onChange={e => setRow(r.key, { date: e.target.value })} />
                        </td>
                        <td data-label="Categoria" style={cellStyle}>
                          <select className="form-select" style={fieldStyle} value={r.categoryId}
                            onChange={e => setRow(r.key, { categoryId: e.target.value })}>
                            <option value="">— Selecione —</option>
                            {(categories || []).filter(c => c.type === (r.type === 'income' ? 'income' : 'expense'))
                              .map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                          </select>
                        </td>
                        <td data-label="Membro" style={cellStyle}>
                          <select className="form-select" style={fieldStyle} value={r.memberId}
                            onChange={e => setRow(r.key, { memberId: e.target.value })}>
                            <option value="">— Selecione —</option>
                            {(members || []).map(m => <option key={m.id} value={m.id}>{m.emoji} {m.name}</option>)}
                          </select>
                        </td>
                        <td data-label="Observações" style={cellStyle}>
                          <input className="form-input" style={fieldStyle} value={r.notes}
                            onChange={e => setRow(r.key, { notes: e.target.value })} />
                        </td>
                      </tr>
                      {r.selected && r.errors.length > 0 && (
                        <tr>
                          <td className="csv-review-errors" colSpan={9} style={{ fontSize: 11.5, color: 'var(--red)', padding: '2px 10px 8px 50px' }}>
                            {r.errors.join(' · ')}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex jce" style={{ gap: 8, marginTop: 12 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setStep('upload')}>Voltar</button>
            {newRows.length === 0 ? (
              <button type="button" className="btn btn-primary" onClick={onClose}>Fechar</button>
            ) : (
              <button type="button" className="btn btn-primary" disabled={selectedValid.length === 0} onClick={run}>
                💾 Importar {selectedValid.length} na fatura {statementLabel}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── STEP: RUNNING ── */}
      {step === 'running' && (
        <div>
          {running ? (
            <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 6 }}>Importando…</div>
          ) : result ? (
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>Importação concluída</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                <div style={{ padding: '14px 16px', borderRadius: 10, textAlign: 'center',
                  background: 'color-mix(in srgb, #4ade80 15%, transparent)',
                  border: '1px solid color-mix(in srgb, #4ade80 35%, transparent)' }}>
                  <div style={{ fontSize: 28, fontWeight: 800 }}>{result.created}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>novos criados</div>
                </div>
                <div style={{ padding: '14px 16px', borderRadius: 10, textAlign: 'center',
                  background: 'color-mix(in srgb, var(--surface2) 60%, transparent)',
                  border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--muted)' }}>{result.skipped}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>já existentes ignorados</div>
                </div>
              </div>
              {result.errors?.length > 0 && (
                <div style={{ maxHeight: 160, overflow: 'auto', fontSize: 11, marginBottom: 12 }}>
                  <div style={{ color: 'var(--red)', fontWeight: 700, marginBottom: 6 }}>
                    {result.errors.length} erro(s):
                  </div>
                  {result.errors.map((e, i) => (
                    <div key={i} style={{ color: 'var(--muted)', marginBottom: 3 }}>{e}</div>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          <div className="progress-bar" style={{ marginBottom: 14 }}>
            <div className="progress-fill" style={{
              width: running ? '60%' : '100%',
              background: 'var(--primary)',
              transition: 'width 0.4s ease',
            }} />
          </div>

          <div className="flex jce">
            {!running && (
              <button type="button" className="btn btn-primary" onClick={onClose}>Fechar</button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
