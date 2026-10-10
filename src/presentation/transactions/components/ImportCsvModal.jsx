import React, { useMemo, useRef, useState } from 'react';
import Modal from '../../shared/components/Modal';
import { R$ } from '../../../core/utils/format';
import CurrencyInput from '../../shared/components/CurrencyInput';
import {
  buildTemplateCsv, parseImportCsv, validateImportRow, TEMPLATE_COLUMNS,
} from '../../../core/utils/csvImport';

/**
 * Importação de lançamentos por CSV com deduplicação por id_sistema.
 *
 * Fluxo: upload → revisão → destino → processamento.
 * Linhas com id_sistema já existente no sistema são ignoradas automaticamente
 * pelo backend; apenas linhas novas (sem id_sistema) são criadas.
 */
export default function ImportCsvModal({
  accounts, categories, members, onBulkImport, onClose, onDone,
}) {
  const [step, setStep]     = useState('upload');
  const [rows, setRows]     = useState([]);
  const [fatal, setFatal]   = useState('');
  const [fileName, setFileName] = useState('');

  const nonSavingsAccounts = (accounts || []).filter(a => a.type !== 'savings');
  const [defaultAccountId, setDefaultAccountId] = useState(nonSavingsAccounts[0]?.id || '');

  const [result,   setResult]   = useState(null);   // { created, skipped, errors }
  const [running,  setRunning]  = useState(false);
  const fileInput = useRef(null);

  const withErrors = useMemo(
    () => rows.map(r => ({ ...r, errors: validateImportRow(r) })),
    [rows],
  );
  const selected      = withErrors.filter(r => r.selected);
  const selectedValid = selected.filter(r => r.errors.length === 0);
  const blocked       = selected.length - selectedValid.length;

  const newRows      = selectedValid.filter(r => !r.externalId);
  const existingRows = selectedValid.filter(r => r.externalId);

  const total = selectedValid.reduce(
    (s, r) => s + (r.type === 'income' ? -Number(r.amount) : Number(r.amount)), 0);

  const setRow = (key, patch) =>
    setRows(prev => prev.map(r => (r.key === key ? { ...r, ...patch } : r)));

  const downloadTemplate = () => {
    const blob = new Blob([buildTemplateCsv()], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'modelo-lancamentos.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const readFile = (file) => {
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const { rows: parsed, fatal: err } = parseImportCsv(String(reader.result), { categories, members });
      if (err) { setFatal(err); setRows([]); return; }
      if (!parsed.length) { setFatal('Nenhuma linha encontrada além do cabeçalho.'); setRows([]); return; }
      setFatal('');
      setRows(parsed);
      setStep('review');
    };
    reader.onerror = () => setFatal('Não foi possível ler o arquivo.');
    reader.readAsText(file, 'utf-8');
  };

  const run = async () => {
    setRunning(true);
    setStep('running');
    try {
      const payload = selectedValid.map(r => ({
        externalId:          r.externalId || null,
        description:         r.description,
        amount:              Number(r.amount),
        date:                r.date,
        type:                r.type === 'income' ? 1 : 2,
        categoryId:          r.categoryId || null,
        attributionProfileId: r.memberId  || null,
        observations:        r.notes || null,
      }));
      const res = await onBulkImport(payload, defaultAccountId);
      setResult(res);
      onDone?.();
    } catch (e) {
      setResult({ created: 0, skipped: 0, errors: [e.message || 'Erro ao importar'] });
    } finally {
      setRunning(false);
    }
  };

  const cellStyle  = { padding: '6px 8px' };
  const fieldStyle = { fontSize: 12.5, padding: '7px 9px', width: '100%' };

  return (
    <Modal
      title="Importar Lançamentos"
      onClose={running ? () => {} : onClose}
      size={step === 'review' ? 'full' : 'wide'}
      confirmOnOverlay={step === 'review' || step === 'target'}
      confirmMessage="Descartar as linhas conferidas e fechar a importação?"
    >
      {step === 'upload' && (
        <div>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.5 }}>
            Baixe o modelo, preencha e envie de volta. CSV exportado do sistema já vem com
            <strong> id_sistema</strong> — linhas com esse campo são ignoradas na reimportação,
            apenas as novas (sem id) são criadas.
          </p>

          <div style={{ display: 'grid', gap: 10 }}>
            <button type="button" className="btn btn-secondary" onClick={downloadTemplate} style={{ padding: '14px' }}>
              ⬇️ Baixar modelo CSV
            </button>
            <button type="button" className="btn btn-primary" onClick={() => fileInput.current?.click()} style={{ padding: '14px' }}>
              ⬆️ Selecionar arquivo preenchido
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
            <strong>Colunas:</strong> {TEMPLATE_COLUMNS.join(', ')} · (id_sistema opcional)<br />
            Data em AAAA-MM-DD ou DD/MM/AAAA · Valor negativo vira estorno ·
            Separador vírgula ou ponto e vírgula
          </div>
        </div>
      )}

      {step === 'review' && (
        <div>
          <div className="flex jcb aic" style={{ marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>
              {fileName} · {rows.length} linha(s) ·{' '}
              <strong>{selectedValid.length}</strong> prontas
              {existingRows.length > 0 && (
                <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>
                  {' '}· {existingRows.length} já existem (serão ignoradas)
                </span>
              )}
              {blocked > 0 && <span style={{ color: 'var(--red)' }}> · {blocked} com pendência</span>}
            </span>
            <span style={{ fontSize: 13, fontWeight: 800 }}>{R$(total)}</span>
          </div>

          <div style={{ maxHeight: '58vh', overflow: 'auto', border: '1px solid var(--border)', borderRadius: 10 }}>
            <table className="csv-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ width: 38 }}>
                    <input
                      type="checkbox"
                      checked={rows.length > 0 && rows.every(r => r.selected)}
                      onChange={e => setRows(prev => prev.map(r => ({ ...r, selected: e.target.checked })))}
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
                {withErrors.map(r => {
                  const isExisting = Boolean(r.externalId);
                  return (
                    <React.Fragment key={r.key}>
                      <tr style={{ opacity: r.selected ? 1 : .45, background: isExisting ? 'color-mix(in srgb, var(--surface2) 60%, transparent)' : undefined }}>
                        <td style={cellStyle}>
                          <input type="checkbox" checked={r.selected}
                            onChange={e => setRow(r.key, { selected: e.target.checked })} />
                        </td>
                        <td style={{ ...cellStyle, color: 'var(--muted)' }}>
                          {r.lineNumber}
                          {isExisting && (
                            <span title="Já existe no sistema — será ignorado" style={{ marginLeft: 4, fontSize: 10, color: 'var(--muted)', fontStyle: 'italic' }}>
                              ↩
                            </span>
                          )}
                        </td>
                        <td style={cellStyle}>
                          {isExisting ? (
                            <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>{r.description}</span>
                          ) : (
                            <input className="form-input" style={fieldStyle}
                              value={r.description} onChange={e => setRow(r.key, { description: e.target.value })} />
                          )}
                        </td>
                        <td style={cellStyle}>
                          {isExisting ? (
                            <span style={{ fontSize: 12.5, color: 'var(--muted)', display: 'block', textAlign: 'right' }}>{R$(r.amount)}</span>
                          ) : (
                            <div className="flex aic" style={{ gap: 5 }}>
                              <span className="tmuted" style={{ fontSize: 11 }}>R$</span>
                              <CurrencyInput value={r.amount} onChange={v => setRow(r.key, { amount: v })}
                                style={{ ...fieldStyle, textAlign: 'right' }} />
                            </div>
                          )}
                        </td>
                        <td style={cellStyle}>
                          {isExisting ? (
                            <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>{r.type === 'income' ? 'Estorno' : 'Despesa'}</span>
                          ) : (
                            <select className="form-select" style={fieldStyle}
                              value={r.type} onChange={e => setRow(r.key, { type: e.target.value })}>
                              <option value="expense">Despesa</option>
                              <option value="income">Estorno</option>
                            </select>
                          )}
                        </td>
                        <td style={cellStyle}>
                          {isExisting ? (
                            <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>{r.date}</span>
                          ) : (
                            <input className="form-input" type="date" style={fieldStyle}
                              value={r.date} onChange={e => setRow(r.key, { date: e.target.value })} />
                          )}
                        </td>
                        <td style={cellStyle}>
                          {isExisting ? (
                            <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                              {(categories || []).find(c => c.id === r.categoryId)?.name || '—'}
                            </span>
                          ) : (
                            <select className="form-select" style={fieldStyle}
                              value={r.categoryId} onChange={e => setRow(r.key, { categoryId: e.target.value })}>
                              <option value="">— Selecione —</option>
                              {(categories || []).filter(c => c.type === (r.type === 'income' ? 'income' : 'expense'))
                                .map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                            </select>
                          )}
                        </td>
                        <td style={cellStyle}>
                          {isExisting ? (
                            <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                              {(members || []).find(m => m.id === r.memberId)?.name || '—'}
                            </span>
                          ) : (
                            <select className="form-select" style={fieldStyle}
                              value={r.memberId} onChange={e => setRow(r.key, { memberId: e.target.value })}>
                              <option value="">— Selecione —</option>
                              {(members || []).map(m => <option key={m.id} value={m.id}>{m.emoji} {m.name}</option>)}
                            </select>
                          )}
                        </td>
                        <td style={cellStyle}>
                          {isExisting ? (
                            <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>{r.notes}</span>
                          ) : (
                            <input className="form-input" style={fieldStyle}
                              value={r.notes} onChange={e => setRow(r.key, { notes: e.target.value })} />
                          )}
                        </td>
                      </tr>
                      {r.selected && r.errors.length > 0 && (
                        <tr>
                          <td colSpan={9} style={{ fontSize: 11.5, color: 'var(--red)', padding: '2px 10px 8px 50px' }}>
                            {r.errors.join(' · ')}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex jce gap2" style={{ gap: 8, marginTop: 12 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setStep('upload')}>Voltar</button>
            <button type="button" className="btn btn-primary" disabled={selectedValid.length === 0}
              onClick={() => setStep('target')}>
              Continuar ({selectedValid.length})
            </button>
          </div>
        </div>
      )}

      {step === 'target' && (
        <div>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
            {selectedValid.length} lançamento(s) · {R$(total)}
            {existingRows.length > 0 && (
              <span style={{ marginLeft: 8, fontStyle: 'italic' }}>
                ({existingRows.length} já existem e serão ignorados · {newRows.length} novos)
              </span>
            )}
          </p>

          {newRows.length > 0 && (
            <div className="form-group">
              <label className="form-label">Conta de destino para lançamentos novos *</label>
              <select
                className="form-select"
                value={defaultAccountId}
                onChange={e => setDefaultAccountId(e.target.value)}
              >
                {nonSavingsAccounts.length === 0 && (
                  <option value="">Nenhuma conta disponível</option>
                )}
                {nonSavingsAccounts.map(a => (
                  <option key={a.id} value={a.id}>🏦 {a.name}</option>
                ))}
              </select>
              <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, lineHeight: 1.5 }}>
                Todos os lançamentos novos serão associados a esta conta.
                Lançamentos com id_sistema serão ignorados automaticamente pelo sistema.
              </p>
            </div>
          )}

          {newRows.length === 0 && existingRows.length > 0 && (
            <div style={{ padding: '12px 16px', borderRadius: 10, fontSize: 13,
              background: 'color-mix(in srgb, var(--primary) 10%, transparent)',
              border: '1px solid color-mix(in srgb, var(--primary) 25%, transparent)' }}>
              Todos os {existingRows.length} lançamentos selecionados já existem no sistema
              e serão ignorados. Nenhum novo lançamento será criado.
            </div>
          )}

          <div className="flex jce gap2" style={{ gap: 8, marginTop: 16 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setStep('review')}>Voltar</button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={newRows.length > 0 && !defaultAccountId}
              onClick={run}
            >
              💾 Importar {selectedValid.length}
            </button>
          </div>
        </div>
      )}

      {step === 'running' && (
        <div>
          {running ? (
            <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 6 }}>
              Importando…
            </div>
          ) : result ? (
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>
                Importação concluída
              </div>
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
