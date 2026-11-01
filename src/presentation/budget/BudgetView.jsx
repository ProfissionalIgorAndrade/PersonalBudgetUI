import React, { useEffect, useMemo, useState } from 'react';
import { R$ } from '../../core/utils/format';
import MonthSelector from '../shared/components/MonthSelector';
import CurrencyInput from '../shared/components/CurrencyInput';
import PanelHeader from '../shared/components/PanelHeader';
import * as budgetRepo from '../../data/repositories/budgetRepository';
import { budgetRows, budgetSummary, monthName, pctLabel, statusOf, previousMonth, copyPlan } from './budgetSummary';
import CopyPreviousModal from './components/CopyPreviousModal';

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

const STATUS_TEXT = { over: 'Acima do limite', near: 'Perto do limite', ok: 'Dentro do limite' };

/** Trilho do tamanho do limite com o gasto preenchido; estouro cheio, na cor de alerta. */
function PlanBar({ ratio, status, label }) {
  const fill = Math.min(Math.max(ratio || 0, 0), 1) * 100;
  return (
    <div className={`bud-bar bud-${status}`} role="img" aria-label={label}>
      <span className="bud-bar-fill" style={{ width: `${fill}%` }} />
    </div>
  );
}

function LimitEditor({ initial, hasLimit, onSave, onRemove, onCancel, name }) {
  const [value, setValue] = useState(initial || 0);
  const keys = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); onSave(value); }
    if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
  };
  return (
    <div className="bud-editor">
      <CurrencyInput
        value={value}
        onChange={setValue}
        className="form-input bud-editor-input"
        aria-label={`Limite de ${name}`}
        onKeyDown={keys}
        autoFocus
      />
      <button type="button" className="btn btn-primary bud-editor-btn" onClick={() => onSave(value)}>Salvar</button>
      <button type="button" className="btn btn-secondary bud-editor-btn" onClick={onCancel}>Cancelar</button>
      {hasLimit && (
        <button type="button" className="bud-link bud-link-danger" onClick={onRemove}>Remover limite</button>
      )}
    </div>
  );
}

function BudgetRow({ row, editing, onEdit, onSave, onRemove, onCancel }) {
  const { cat, limit, spent, ratio, status } = row;
  const limited = status !== 'none';

  return (
    <li className={`bud-row${limited ? '' : ' bud-row-free'}${editing ? ' is-editing' : ''}`} style={{ '--cat': cat.color }}>
      <span className="bud-chip" aria-hidden="true">{cat.icon || '📦'}</span>
      <div className="bud-name">
        <span className="bud-name-text" title={cat.name}>{cat.name}</span>
        {limited && (
          <span className={`bud-status bud-${status}`}>
            {status === 'over' ? `${R$(spent - limit)} acima` : STATUS_TEXT[status]}
          </span>
        )}
      </div>

      {editing ? (
        <LimitEditor
          initial={limit}
          hasLimit={limited}
          name={cat.name}
          onSave={onSave}
          onRemove={onRemove}
          onCancel={onCancel}
        />
      ) : limited ? (
        <>
          <PlanBar ratio={ratio} status={status} label={`${pctLabel(ratio)} do limite de ${cat.name}`} />
          <span className="bud-amount">
            <span className="bud-spent">{R$(spent)}</span>
            <span className="bud-of">de {R$(limit)}</span>
          </span>
          <span className={`bud-pct bud-${status}`}>{pctLabel(ratio)}</span>
          <button type="button" className="btn-icon bud-edit" aria-label={`Editar limite de ${cat.name}`} title="Editar limite" onClick={onEdit}>✏️</button>
        </>
      ) : (
        <button type="button" className="bud-link" onClick={onEdit}>+ Definir limite</button>
      )}
    </li>
  );
}

/**
 * Orçamentos do mês: primeiro quanto do total já foi usado e o que estourou,
 * depois cada categoria com limite (as que estouraram no topo) e, por fim,
 * as que ainda não têm limite, cada uma a um clique de ganhar um.
 */
export default function BudgetView({
  budgets = [], categories = [], activeMonth, setActiveMonth,
  loadBudgets, budgetOps, notify, titleId = 'hh-budgets-title',
}) {
  const [editingCatId, setEditingCatId] = useState(null);
  const [copy,         setCopy]         = useState(null);   // null | { loading, plan, error, saving }

  const [activeYear, activeMonthNum] = (activeMonth || '').split('-').map(Number);

  useEffect(() => {
    if (activeYear && activeMonthNum) loadBudgets?.(activeMonthNum, activeYear);
    setEditingCatId(null);
    setCopy(null);
  }, [activeMonth]);

  const rows    = useMemo(() => budgetRows(categories, budgets), [categories, budgets]);
  const summary = useMemo(() => budgetSummary(rows), [rows]);
  const month   = monthName(activeMonth);
  const prevYm  = previousMonth(activeMonth);
  const prevMonthName = monthName(prevYm);
  const hasExpenseCats = rows.limited.length + rows.free.length > 0;

  const save = async (row, value) => {
    if (value <= 0) {
      if (row.budget) await budgetOps.onDelete(row.budget.id, activeMonthNum, activeYear);
    } else {
      await budgetOps.onUpsert({ categoryId: row.cat.id, month: activeMonthNum, year: activeYear, limitAmount: value });
    }
    setEditingCatId(null);
  };
  const remove = async (row) => {
    if (row.budget) await budgetOps.onDelete(row.budget.id, activeMonthNum, activeYear);
    setEditingCatId(null);
  };

  /** Abre a confirmação já com o que vai mudar: nada é gravado antes do "Copiar". */
  const openCopy = async () => {
    setCopy({ loading: true, plan: null, error: '', saving: false });
    const [py, pm] = prevYm.split('-').map(Number);
    try {
      const prev = await budgetRepo.listBudgets(pm, py);
      setCopy(c => c && { ...c, loading: false, plan: copyPlan(prev || [], budgets, categories) });
    } catch (e) {
      setCopy(c => c && { ...c, loading: false, error: e?.message || `Não foi possível buscar os limites de ${prevMonthName}.` });
    }
  };

  const confirmCopy = async () => {
    const items = [...copy.plan.create, ...copy.plan.update];
    setCopy(c => ({ ...c, saving: true, error: '' }));
    let saved = 0;
    try {
      for (const { cat, limitAmount } of items) {
        await budgetRepo.upsertBudget({ categoryId: cat.id, month: activeMonthNum, year: activeYear, limitAmount });
        saved += 1;
      }
      await loadBudgets(activeMonthNum, activeYear);
      setCopy(null);
      notify?.(`${saved === 1 ? '1 limite copiado' : `${saved} limites copiados`} de ${prevMonthName}.`, 'success');
    } catch {
      await loadBudgets(activeMonthNum, activeYear).catch(() => {});
      const done = saved ? ` ${saved} de ${items.length} já foram salvos.` : '';
      setCopy(c => ({ ...c, saving: false, error: `Não foi possível salvar todos os limites.${done} Tente de novo.` }));
    }
  };

  const rowProps = (row) => ({
    row,
    editing: editingCatId === row.cat.id,
    onEdit: () => setEditingCatId(row.cat.id),
    onSave: (v) => save(row, v),
    onRemove: () => remove(row),
    onCancel: () => setEditingCatId(null),
  });


  return (
    <div className="bud-root">
      <PanelHeader id={titleId} title="Orçamentos" sub={`Limites de gasto por categoria em ${month}.`}>
        <button type="button" className="btn btn-secondary" onClick={openCopy} disabled={Boolean(copy) || !activeMonthNum}
          title={`Copiar os limites de ${prevMonthName} para ${month}`}>
          📋 Copiar mês anterior
        </button>
        <MonthSelector month={activeMonth} onChange={setActiveMonth} />
      </PanelHeader>

      {!hasExpenseCats ? (
        <div className="card bud-empty">
          <p>Nenhuma categoria de despesa cadastrada.</p>
          <a className="bud-link" href="#household/categories">Criar categorias em Meu Lar</a>
        </div>
      ) : (
        <>
          <section className="card bud-summary" aria-label={`Resumo de ${month}`}>
            {summary.limitedCount === 0 ? (
              <div className="bud-summary-empty">
                <p className="bud-summary-empty-title">Nenhum limite em {month}.</p>
                <p className="bud-summary-empty-sub">Defina um limite nas categorias abaixo ou traga os do mês anterior.</p>
              </div>
            ) : (
              <>
                <div className="bud-total">
                  <span className="bud-k">Usado no mês</span>
                  <span className="bud-total-v">
                    <span className="bud-total-spent">{R$(summary.spent)}</span>
                    <span className="bud-of">de {R$(summary.limit)}</span>
                  </span>
                  <PlanBar
                    ratio={summary.ratio}
                    status={statusOf(summary.spent, summary.limit)}
                    label={`${pctLabel(summary.ratio)} do total dos limites`}
                  />
                </div>
                <dl className="bud-stats">
                  <div className="bud-stat">
                    <dt className="bud-k">{summary.left >= 0 ? 'Disponível' : 'Acima do total'}</dt>
                    <dd className={`bud-v${summary.left < 0 ? ' bud-over-text' : ''}`}>{R$(Math.abs(summary.left))}</dd>
                  </div>
                  <div className="bud-stat">
                    <dt className="bud-k">Acima do limite</dt>
                    <dd className={`bud-v${summary.overCount ? ' bud-over-text' : ''}`}>
                      {plural(summary.overCount, 'categoria', 'categorias')}
                    </dd>
                  </div>
                  <div className="bud-stat">
                    <dt className="bud-k">Perto do limite</dt>
                    <dd className="bud-v">{plural(summary.nearCount, 'categoria', 'categorias')}</dd>
                  </div>
                </dl>
              </>
            )}
          </section>

          {rows.limited.length > 0 && (
            <section className="card bud-list" aria-labelledby="bud-limited-title">
              <div className="bud-list-head">
                <h3 id="bud-limited-title" className="bud-list-title">Com limite</h3>
                <span className="bud-list-count">{plural(rows.limited.length, 'categoria', 'categorias')}</span>
              </div>
              <ul className="bud-rows">
                {rows.limited.map(r => <BudgetRow key={r.cat.id} {...rowProps(r)} />)}
              </ul>
            </section>
          )}

          {rows.free.length > 0 && (
            <section className="card bud-list" aria-labelledby="bud-free-title">
              <div className="bud-list-head">
                <h3 id="bud-free-title" className="bud-list-title">Sem limite</h3>
                <span className="bud-list-count">{plural(rows.free.length, 'categoria', 'categorias')}</span>
              </div>
              <ul className="bud-rows bud-rows-free">
                {rows.free.map(r => <BudgetRow key={r.cat.id} {...rowProps(r)} />)}
              </ul>
            </section>
          )}
        </>
      )}
      {copy && (
        <CopyPreviousModal
          fromLabel={prevMonthName}
          toLabel={month}
          state={copy}
          onConfirm={confirmCopy}
          onClose={() => setCopy(null)}
        />
      )}
    </div>
  );
}
