import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSimulator, HORIZONS } from '../../application/hooks/useSimulator';
import { localToday } from '../../core/utils/simulatorMath';
import Modal from '../shared/components/Modal';
import { composeMonthly, buildVerdict, assignSimColors } from '../simulator/logic/compose';
import { buildMonthlyBaseline } from '../simulator/logic/baseline';
import { buildSchedules } from '../simulator/logic/schedule';
import { simulationName, ownerInfo } from '../simulator/logic/labels';
import Outlook from './components/Outlook';
import SimList, { PlusIcon } from './components/SimList';
import ScenarioTable from './components/ScenarioTable';
import BridgeChart from './components/BridgeChart';
import GapChart from './components/GapChart';
import CascadeChart from './components/CascadeChart';
import Composer, { draftToSim } from './components/Composer';
import './whatif.css';

const NO_TRANSACTIONS = [];
const NO_MEMBERS = [];
const DRAFT_ID = '__draft';

const horizonLabel = (m) => (m === 1 ? '1 mês' : `${m} meses`);

/** Jeitos de ver o período. Fica guardado por navegador, só como conveniência. */
const LAYOUTS = [
  { id: 'bridge', label: 'Ponte', hint: 'A coluna cinza é a sobra de hoje; os blocos coloridos são as simulações. O traço é onde o mês fecha.' },
  { id: 'gap', label: 'Linha', hint: 'A sobra de hoje e a com simulações; a faixa entre as duas é o efeito delas. Embaixo, quando cada uma pesa.' },
  { id: 'cascade', label: 'Cascata', hint: 'Escolha um mês ou o período todo para ver, degrau por degrau, quanto cada simulação tira ou põe.' },
];
const LAYOUT_KEY = 'pb_whatif_viz';
function readLayout() {
  try {
    const v = localStorage.getItem(LAYOUT_KEY);
    return LAYOUTS.some((l) => l.id === v) ? v : 'bridge';
  } catch { return 'bridge'; }
}

/** Soma de um vetor mensal só nos meses com lançamentos, como os totais do período. */
const periodTotal = (monthly = [], months) => months.reduce((acc, m, i) => (m.hasData ? acc + (monthly[i] ?? 0) : acc), 0);

/**
 * "E se...?" (tela nova). Mesmos dados e mesma conta da tela antiga
 * (SimulatorView): a base de cada mês é a do Dashboard e as simulações da
 * família somam por cima. O que muda é a leitura: um resumo do período, as
 * simulações em cartões (rostinho de quem criou e switch para ligar/desligar) e
 * o período em um de três gráficos (ponte, linha ou cascata), com a tabela dos
 * números a um clique.
 * O painel lateral simula por intenção e mostra o efeito antes de salvar.
 */
export default function WhatIfView({ transactions = NO_TRANSACTIONS, members = NO_MEMBERS, authSession = null, titleId }) {
  const sim = useSimulator({ userId: authSession?.userId });
  return <WhatIfScreen sim={sim} transactions={transactions} members={members} titleId={titleId} />;
}

/**
 * A tela em si, recebendo o resultado de `useSimulator`: o Planejamento chama
 * o hook uma vez e usa as mesmas simulações no resumo do sub-menu. O título é
 * o h2 da seção (`hh-simulator-title`), que recebe o foco ao abrir pelo sub-menu.
 */
export function WhatIfScreen({ sim, transactions = NO_TRANSACTIONS, members = NO_MEMBERS, titleId = 'hh-simulator-title' }) {
  const {
    simulations, months, setMonths, loading, error, retry, saving, actionError, dismissActionError,
    addSimulation, editSimulation, removeSimulation, removeMine, toggleSimulation, limitReached, ownedCount,
    legacyCount, importing, importError, importLegacy, dismissImport,
  } = sim;

  const firstMonth = useMemo(() => localToday().slice(0, 7), []);

  // Painel lateral: null (fechado) ou { key, editingId, intent }. O rascunho dele entra no quadro antes de salvar.
  const [sheet, setSheet] = useState(null);
  const [draft, setDraft] = useState(null);         // valores do formulário do painel, ou null
  const [confirmClear, setConfirmClear] = useState(false);
  const [picked, setPicked] = useState(null);       // mês escolhido no quadro (índice); null = o pior

  const baseline = useMemo(
    () => buildMonthlyBaseline(transactions, firstMonth, months),
    [transactions, firstMonth, months],
  );

  const draftSim = useMemo(() => (sheet && draft ? draftToSim(draft) : null), [sheet, draft]);
  const editingId = sheet?.editingId ?? null;

  // Lista efetiva: a simulação em edição é trocada pelo rascunho; uma nova entra no fim.
  const effective = useMemo(() => {
    const list = simulations.map((s) => (
      s.id === editingId && draftSim ? { ...s, ...draftSim, id: s.id, enabled: true } : s
    ));
    if (draftSim && !editingId) list.push({ ...draftSim, id: DRAFT_ID, enabled: true, isOwner: true });
    return list;
  }, [simulations, draftSim, editingId]);

  const schedules = useMemo(() => buildSchedules(effective, firstMonth, months), [effective, firstMonth, months]);
  const enabledIds = useMemo(() => effective.filter((s) => s.enabled).map((s) => s.id), [effective]);
  const composed = useMemo(() => composeMonthly({ baseline, schedules, enabledIds }), [baseline, schedules, enabledIds]);
  const verdict = useMemo(() => buildVerdict({ composed }), [composed]);

  // O mesmo cenário sem o rascunho: o painel mostra o antes e o depois.
  const savedComposed = useMemo(() => {
    if (!draftSim) return composed;
    const saved = buildSchedules(simulations, firstMonth, months);
    return composeMonthly({ baseline, schedules: saved, enabledIds: simulations.filter((s) => s.enabled).map((s) => s.id) });
  }, [draftSim, composed, simulations, baseline, firstMonth, months]);

  const scheduleById = useMemo(() => new Map(schedules.map((s) => [s.id, s])), [schedules]);
  // Cor de cada simulação pela posição na lista completa: ligar ou desligar não repinta as outras.
  const slots = useMemo(() => assignSimColors(effective), [effective]);
  const rows = useMemo(() => effective.map((sim, i) => ({
    id: sim.id,
    sim,
    slot: slots[sim.id],
    name: sim.id === DRAFT_ID ? (sim.description?.trim() || 'Nova simulação') : simulationName(sim, i),
    owner: ownerInfo(sim, members),
    schedule: scheduleById.get(sim.id),
    total: periodTotal(scheduleById.get(sim.id)?.monthly, composed.months),
    isDraft: sim.id === DRAFT_ID || sim.id === editingId,
  })), [effective, members, scheduleById, editingId, composed, slots]);

  const [layout, setLayoutState] = useState(readLayout);
  const setLayout = (id) => {
    setLayoutState(id);
    try { localStorage.setItem(LAYOUT_KEY, id); } catch { /* sem armazenamento: vale só nesta visita */ }
  };
  const [hoverId, setHoverId] = useState(null);
  const [showNumbers, setShowNumbers] = useState(false);

  const worstIndex = composed.firstNegative ?? composed.tightest?.index ?? 0;
  const selected = picked !== null && picked < composed.months.length ? picked : worstIndex;
  const offCount = simulations.filter((s) => !s.enabled && s.id !== editingId).length;

  // Trocar o horizonte volta para o pior mês do novo período.
  useEffect(() => { setPicked(null); }, [months]);

  const openSheet = ({ sim = null, intent = null } = {}) => {
    dismissActionError();
    setDraft(null);
    setSheet((prev) => ({ key: (prev?.key ?? 0) + 1, editingId: sim?.id ?? null, intent }));
  };
  const openComposer = (sim) => openSheet({ sim });
  // Fechar devolve o foco ao botão do topo, de onde o painel costuma ser aberto.
  const triggerRef = useRef(null);
  const closeComposer = () => {
    setSheet(null); setDraft(null); dismissActionError();
    requestAnimationFrame(() => triggerRef.current?.focus());
  };

  // Liga ou desliga todas de uma vez (só as que estão no estado oposto).
  const setAll = (on) => simulations.filter((s) => s.enabled !== on).forEach((s) => toggleSimulation(s.id));

  const editing = editingId ? simulations.find((s) => s.id === editingId) ?? null : null;
  const handleSave = async (payload) => {
    const ok = editing ? await editSimulation(editing.id, payload) : await addSimulation(payload);
    if (ok) closeComposer();
    return ok;
  };
  const handleRemove = async () => {
    if (!editing) return false;
    const ok = await removeSimulation(editing.id);
    if (ok) closeComposer();
    return ok;
  };
  const doRemoveMine = async () => { setConfirmClear(false); closeComposer(); await removeMine(); };

  const blocked = loading || Boolean(error);
  const noFlow = composed.countedCount === 0;

  return (
    <div className={`wf-root${sheet ? ' has-sheet' : ''}`}>
      <header className="wf-head">
        <div className="wf-head-text">
          <h2 className="wf-title" id={titleId} tabIndex={-1}>E se...?</h2>
          <p className="wf-finding">
            {!blocked && verdict.level !== 'unknown' && (
              <span className={`wf-status is-${verdict.level}`}>{verdict.statusLabel}</span>
            )}
            {blocked ? 'Projeção mês a mês do que sobra, com as compras, vendas e gastos que você quiser testar.' : verdict.headline}
          </p>
        </div>
        <div className="wf-head-actions">
          <div className="wf-range" role="group" aria-label="Período da projeção">
            {HORIZONS.map((m) => (
              <button key={m} type="button" aria-pressed={months === m} onClick={() => setMonths(m)}>
                {horizonLabel(m)}
              </button>
            ))}
          </div>
          <button
            ref={triggerRef} type="button" className="wf-btn wf-btn-primary wf-btn-create"
            onClick={() => openSheet()} disabled={blocked || saving || limitReached} aria-expanded={Boolean(sheet)}
          >
            <PlusIcon />
            Nova simulação
          </button>
        </div>
      </header>

      {loading && <BoardSkeleton />}
      {!loading && error && (
        <section className="wf-panel wf-error" role="alert">
          <p>{error}</p>
          <button type="button" className="wf-btn" onClick={retry}>Tentar de novo</button>
        </section>
      )}

      {!blocked && (
        <>
          {actionError && !sheet && (
            <div className="wf-notice" role="alert">
              <p>{actionError}</p>
              <button type="button" className="wf-link" onClick={dismissActionError}>Fechar</button>
            </div>
          )}

          <Outlook
            composed={composed} months={months} draftActive={Boolean(draftSim)}
            onPickMonth={setPicked}
          />

          <SimList
            rows={rows} onToggle={toggleSimulation} onEdit={openComposer} onSetAll={setAll}
            onCreate={() => openSheet()} saving={saving} limitReached={limitReached}
            ownedCount={ownedCount} onClearMine={() => setConfirmClear(true)} onHover={setHoverId}
          />

          <section className="wf-panel wf-viz-panel" aria-labelledby="wf-viz-title">
            <header className="wf-viz-head">
              <div>
                <h2 className="wf-h2" id="wf-viz-title">Mês a mês</h2>
                <p className="wf-sub">{LAYOUTS.find((l) => l.id === layout).hint}</p>
              </div>
              <div className="wf-viz-tools">
                <div className="wf-seg" role="group" aria-label="Forma do gráfico">
                  {LAYOUTS.map((l) => (
                    <button key={l.id} type="button" aria-pressed={layout === l.id} onClick={() => setLayout(l.id)}>
                      {l.label}
                    </button>
                  ))}
                </div>
                <button type="button" className="wf-link" aria-expanded={showNumbers} onClick={() => setShowNumbers((v) => !v)}>
                  {showNumbers ? 'Esconder os números' : 'Ver os números'}
                </button>
              </div>
            </header>
            {offCount > 0 && (
              <p className="wf-viz-off">
                {offCount === 1 ? '1 simulação desligada fica' : `${offCount} simulações desligadas ficam`} fora do gráfico.
              </p>
            )}
            {noFlow ? (
              <p className="wf-viz-empty">Nenhum mês do período tem lançamentos ainda, então não há sobra para desenhar.</p>
            ) : (
              <>
                {layout === 'bridge' && <BridgeChart composed={composed} rows={rows} hoverId={hoverId} selected={selected} onSelect={setPicked} />}
                {layout === 'gap' && <GapChart composed={composed} rows={rows} hoverId={hoverId} selected={selected} onSelect={setPicked} />}
                {layout === 'cascade' && <CascadeChart composed={composed} rows={rows} hoverId={hoverId} selected={selected} onSelect={setPicked} />}
              </>
            )}
          </section>

          {(showNumbers || noFlow) && (
            <ScenarioTable composed={composed} rows={rows} selected={selected} onSelect={setPicked} offCount={offCount} />
          )}

          {sheet && (
            <Composer
              key={sheet.key}
              editing={editing} initialIntent={sheet.intent} defaultMonth={firstMonth}
              before={savedComposed} after={composed} months={months}
              limitReached={limitReached} saving={saving} error={actionError}
              onChange={setDraft}
              onSave={handleSave} onCancel={closeComposer} onRemove={handleRemove}
            />
          )}
        </>
      )}

      {confirmClear && (
        <Modal title="Remover minhas simulações?" onClose={() => setConfirmClear(false)}>
          <p className="wf-modal-text">
            Isso apaga {ownedCount === 1 ? 'a 1 simulação que você criou' : `as ${ownedCount} simulações que você criou`}.
            As simulações dos outros membros da família continuam como estão. Seus lançamentos reais não mudam.
          </p>
          <div className="wf-modal-actions">
            <button type="button" className="wf-btn" onClick={() => setConfirmClear(false)}>Cancelar</button>
            <button type="button" className="wf-btn wf-btn-danger" onClick={doRemoveMine}>Remover minhas simulações</button>
          </div>
        </Modal>
      )}

      {legacyCount > 0 && !blocked && (
        <Modal title="Enviar simulações salvas?" onClose={importing ? () => {} : dismissImport}>
          <p className="wf-modal-text">
            Encontramos {legacyCount} {legacyCount === 1 ? 'simulação salva' : 'simulações salvas'} neste navegador.
            Enviar para a família?
          </p>
          {importError && <p className="wf-field-error" role="alert">{importError}</p>}
          <div className="wf-modal-actions">
            <button type="button" className="wf-btn" onClick={dismissImport} disabled={importing}>Agora não</button>
            <button type="button" className="wf-btn wf-btn-primary" onClick={importLegacy} disabled={importing}>
              {importing ? 'Enviando...' : 'Enviar'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/** Carregando: o layout final com barras cinza no lugar dos valores. */
function BoardSkeleton() {
  return (
    <div className="wf-skeleton" role="status" aria-label="Carregando simulações">
      <div className="wf-panel wf-outlook">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="wf-kpi"><span className="wf-sk wf-sk-label" /><span className="wf-sk wf-sk-value" /></div>
        ))}
      </div>
      <div className="wf-panel wf-sk-board" />
    </div>
  );
}
