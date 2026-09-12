import React, { useMemo, useRef, useState } from 'react';
import Modal from '../../shared/components/Modal';
import { R$ } from '../../../core/utils/format';
import CurrencyInput from '../../shared/components/CurrencyInput';
import { cardLabel } from '../../../application/mappers/index';
import {
  buildTemplateCsv, parseImportCsv, validateImportRow, TEMPLATE_COLUMNS,
} from '../../../core/utils/csvImport';

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

/**
 * Importação de lançamentos de cartão por CSV.
 *
 * Três passos, deliberadamente: conferir antes de escolher o destino, e
 * escolher o destino antes de gravar. Cada linha é gravada por uma chamada
 * própria, e é isso que permite mostrar "12 de 50" enquanto acontece — e
 * também que uma linha ruim no meio não derrube as anteriores.
 */
export default function ImportCsvModal({ cards, categories, members, onCreate, onClose, onDone }) {
  const [step, setStep]     = useState('upload');   // upload → review → target → running
  const [rows, setRows]     = useState([]);
  const [fatal, setFatal]   = useState('');
  const [fileName, setFileName] = useState('');

  const now = new Date();
  const [cardId, setCardId]     = useState(cards[0]?.id || '');
  const [stMonth, setStMonth]   = useState(now.getMonth() + 1);
  const [stYear, setStYear]     = useState(now.getFullYear());

  const [progress, setProgress] = useState({ done: 0, total: 0, ok: 0, failed: [] });
  const cancelled = useRef(false);
  const fileInput = useRef(null);

  const withErrors = useMemo(
    () => rows.map(r => ({ ...r, errors: validateImportRow(r) })),
    [rows],
  );
  const selected = withErrors.filter(r => r.selected);
  const selectedValid = selected.filter(r => r.errors.length === 0);
  const blocked = selected.length - selectedValid.length;

  const total = selectedValid.reduce(
    (s, r) => s + (r.type === 'income' ? -Number(r.amount) : Number(r.amount)), 0);

  const setRow = (key, patch) =>
    setRows(prev => prev.map(r => (r.key === key ? { ...r, ...patch } : r)));

  const downloadTemplate = () => {
    const blob = new Blob([buildTemplateCsv()], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modelo-lancamentos.csv';
    a.click();
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
    cancelled.current = false;
    const list = selectedValid;
    setProgress({ done: 0, total: list.length, ok: 0, failed: [] });
    setStep('running');

    for (const row of list) {
      if (cancelled.current) break;
      try {
        await onCreate({
          type: row.type,
          description: row.description,
          amount: Number(row.amount),
          date: row.date,
          categoryId: row.categoryId,
          memberId: row.memberId,
          cardId,
          accountId: '',
          recurrence: 'variable',
          status: 'pending',
          statementMonth: Number(stMonth),
          statementYear: Number(stYear),
          notes: row.notes || '',
        });
        setProgress(p => ({ ...p, done: p.done + 1, ok: p.ok + 1 }));
      } catch (e) {
        setProgress(p => ({
          ...p,
          done: p.done + 1,
          failed: [...p.failed, { line: row.lineNumber, description: row.description, message: e.message || 'Erro' }],
        }));
      }
    }
    onDone?.();
  };

  // A escala de antes (11px, 4px de padding) vinha de um modal de 720px.
  // Em tela cheia, alinha com a tabela de Lançamentos.
  const cellStyle = { padding: '6px 8px' };
  const fieldStyle = { fontSize: 12.5, padding: '7px 9px', width: '100%' };

  return (
    <Modal
      title="Importar Lançamentos"
      onClose={step === 'running' ? () => {} : onClose}
      size={step === 'review' ? 'full' : 'wide'}
      confirmOnOverlay={step === 'review' || step === 'target'}
      confirmMessage="Descartar as linhas conferidas e fechar a importação?"
    >
      {step === 'upload' && (
        <div>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.5 }}>
            Baixe o modelo, preencha e envie de volta. Você confere e edita tudo
            na próxima tela antes de qualquer coisa ser gravada.
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
            <strong>Colunas:</strong> {TEMPLATE_COLUMNS.join(', ')}<br />
            Data em AAAA-MM-DD ou DD/MM/AAAA · Valor negativo vira estorno (receita) ·
            Separador vírgula ou ponto e vírgula
          </div>
        </div>
      )}

      {step === 'review' && (
        <div>
          <div className="flex jcb aic" style={{ marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>
              {fileName} · {rows.length} linha(s) · <strong>{selectedValid.length}</strong> prontas
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
                {withErrors.map(r => (
                  <React.Fragment key={r.key}>
                    <tr style={{ opacity: r.selected ? 1 : .45 }}>
                      <td style={cellStyle}>
                        <input type="checkbox" checked={r.selected}
                          onChange={e => setRow(r.key, { selected: e.target.checked })} />
                      </td>
                      <td style={{ ...cellStyle, color: 'var(--muted)' }}>{r.lineNumber}</td>
                      <td style={cellStyle}>
                        <input className="form-input" style={fieldStyle}
                          value={r.description} onChange={e => setRow(r.key, { description: e.target.value })} />
                      </td>
                      <td style={cellStyle}>
                        <div className="flex aic" style={{ gap: 5 }}>
                          <span className="tmuted" style={{ fontSize: 11 }}>R$</span>
                          <CurrencyInput
                            value={r.amount}
                            onChange={v => setRow(r.key, { amount: v })}
                            style={{ ...fieldStyle, textAlign: 'right' }}
                          />
                        </div>
                      </td>
                      <td style={cellStyle}>
                        <select className="form-select" style={fieldStyle}
                          value={r.type} onChange={e => setRow(r.key, { type: e.target.value })}>
                          <option value="expense">Despesa</option>
                          <option value="income">Estorno</option>
                        </select>
                      </td>
                      <td style={cellStyle}>
                        <input className="form-input" type="date" style={fieldStyle}
                          value={r.date} onChange={e => setRow(r.key, { date: e.target.value })} />
                      </td>
                      <td style={cellStyle}>
                        <select className="form-select" style={fieldStyle}
                          value={r.categoryId} onChange={e => setRow(r.key, { categoryId: e.target.value })}>
                          <option value="">— Selecione —</option>
                          {categories.filter(c => c.type === (r.type === 'income' ? 'income' : 'expense'))
                            .map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                        </select>
                      </td>
                      <td style={cellStyle}>
                        <select className="form-select" style={fieldStyle}
                          value={r.memberId} onChange={e => setRow(r.key, { memberId: e.target.value })}>
                          <option value="">— Selecione —</option>
                          {members.map(m => <option key={m.id} value={m.id}>{m.emoji} {m.name}</option>)}
                        </select>
                      </td>
                      <td style={cellStyle}>
                        <input className="form-input" style={fieldStyle}
                          value={r.notes} onChange={e => setRow(r.key, { notes: e.target.value })} />
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
                ))}
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
          </p>

          <div className="form-group">
            <label className="form-label">Cartão de crédito *</label>
            <select className="form-select" value={cardId} onChange={e => setCardId(e.target.value)}>
              {cards.map(c => <option key={c.id} value={c.id}>💳 {cardLabel(c, members)}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Fatura *</label>
            <div className="flex gap2" style={{ gap: 8 }}>
              <select className="form-select" value={stMonth} onChange={e => setStMonth(Number(e.target.value))}>
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
              <select className="form-select" value={stYear} onChange={e => setStYear(Number(e.target.value))}>
                {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1, now.getFullYear() + 2]
                  .map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, lineHeight: 1.5 }}>
            Todos entram nesta fatura, independente da data de cada compra —
            é a fatura que define em que mês o lançamento aparece.
          </div>

          <div className="flex jce gap2" style={{ gap: 8, marginTop: 16 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setStep('review')}>Voltar</button>
            <button type="button" className="btn btn-primary" disabled={!cardId} onClick={run}>
              💾 Importar {selectedValid.length}
            </button>
          </div>
        </div>
      )}

      {step === 'running' && (
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 6 }}>
            {progress.done < progress.total
              ? `Salvando ${progress.done} de ${progress.total}…`
              : `Concluído — ${progress.ok} de ${progress.total} salvos`}
          </div>

          <div className="progress-bar" style={{ marginBottom: 14 }}>
            <div className="progress-fill" style={{
              width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%`,
              background: 'var(--primary)',
            }} />
          </div>

          {progress.failed.length > 0 && (
            <div style={{ maxHeight: 180, overflow: 'auto', fontSize: 11, marginBottom: 12 }}>
              <div style={{ color: 'var(--red)', fontWeight: 700, marginBottom: 6 }}>
                {progress.failed.length} não salvo(s):
              </div>
              {progress.failed.map((f, i) => (
                <div key={i} style={{ color: 'var(--muted)', marginBottom: 3 }}>
                  Linha {f.line} · {f.description} — {f.message}
                </div>
              ))}
            </div>
          )}

          <div className="flex jce gap2" style={{ gap: 8 }}>
            {progress.done < progress.total ? (
              <button type="button" className="btn btn-secondary"
                onClick={() => { cancelled.current = true; }}>
                Parar
              </button>
            ) : (
              <button type="button" className="btn btn-primary" onClick={onClose}>Fechar</button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
