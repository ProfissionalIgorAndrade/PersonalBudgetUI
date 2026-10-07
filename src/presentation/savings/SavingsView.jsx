import React, { useMemo, useState } from 'react';
import { R$ } from '../../core/utils/format';
import { accountLabel } from '../../application/mappers/index';
import { TotalCard, SummaryCard } from './components/SavingsOverview';
import SavingsBoxPanel from './components/SavingsBoxPanel';
import SavingsEvolution from './components/SavingsEvolution';
import SavingsMovements from './components/SavingsMovements';
import { savingsMovements, savingsSeries, savingsGrowth, netOf } from './savingsHistory';
import { boxNameResolver } from './savingsTimeline';
import { useLocalStorage } from '../../core/hooks/useLocalStorage';
import SavingsBoxForm from './components/SavingsBoxForm';
import MoveMoneyForm from './components/MoveMoneyForm';
import DeleteSavingsBoxForm from './components/DeleteSavingsBoxForm';

/**
 * Dinheiro guardado, no formato das caixinhas do Nubank.
 *
 * Uma caixinha é uma conta de tipo Savings ligada a uma conta corrente.
 * Guardar e resgatar são transferências entre as duas, então o valor sai do
 * saldo disponível sem virar despesa — guardar não é gastar.
 */
export default function SavingsView({ accounts = [], members = [], movements = [], events = [], onCreateBox, onRenameBox, onSetGoal, onMove, onDeleteBox, notify, theme }) {
  const [months, setMonths] = useLocalStorage('pb_savings_months', 12);
  const [boxForm, setBoxForm]   = useState(null);
  const [moveForm, setMoveForm] = useState(null);
  const [deleteBox, setDeleteBox] = useState(null);

  const checking = useMemo(() => accounts.filter(a => a.kind !== 'savings' && a.isActive), [accounts]);
  const boxes    = useMemo(() => accounts.filter(a => a.kind === 'savings' && a.isActive), [accounts]);

  const totalSaved = boxes.reduce((s, b) => s + Number(b.balance || 0), 0);
  // Meta total é a soma das metas definidas — não existe meta do lar à parte.
  //
  // O progresso compara apenas o saldo das caixinhas que TÊM meta. Somar o
  // saldo de todas contra a meta de algumas dava 100% com a meta longe de
  // batida: uma caixinha sem alvo empurrava a barra da que tem.
  const withGoal   = boxes.filter(b => Number(b.savingsGoal || 0) > 0);
  const goalTotal  = withGoal.reduce((s, b) => s + Number(b.savingsGoal), 0);
  const towardGoal = withGoal.reduce((s, b) => s + Number(b.balance || 0), 0);

  // Caixinhas excluídas continuam no extrato e nos totais: a exclusão move o
  // saldo para outra caixinha (resgate lá, depósito aqui), então contar só uma
  // das pernas inflaria o mês e distorceria a evolução. Elas entram com saldo 0,
  // que é o saldo delas depois do resgate.
  const trackedBoxes = useMemo(() => {
    const active = new Set(boxes.map(b => b.id));
    const gone = [...new Set(events.map(e => e.accountId))].filter(id => !active.has(id));
    return [...boxes, ...gone.map(id => ({ id, balance: 0 }))];
  }, [boxes, events]);

  const moves   = useMemo(() => savingsMovements(movements, trackedBoxes.map(b => b.id)), [movements, trackedBoxes]);
  const series  = useMemo(() => savingsSeries(movements, trackedBoxes, months), [movements, trackedBoxes, months]);
  const growth  = useMemo(() => savingsGrowth(movements, trackedBoxes, 3), [movements, trackedBoxes]);
  const thisKey = new Date().toISOString().slice(0, 7);
  const monthNet = netOf(moves.filter(m => String(m.date).slice(0, 7) === thisKey));

  const boxNameOf = useMemo(() => boxNameResolver(boxes, events), [boxes, events]);
  const accountNameOf = (id) => {
    const acc = checking.find(a => a.id === id);
    return acc ? accountLabel(acc, members) : null;
  };

  const thisYear = String(new Date().getFullYear());
  const savedThisYear = netOf(moves.filter(m => String(m.date).slice(0, 4) === thisYear));



  return (
    <div>
      <div className="page-header">
        <div>
          <div className="txxs tmuted" style={{ textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 2 }}>
            Planejamento financeiro
          </div>
          <h1 className="page-title">Cofrinho</h1>
          <p className="page-sub">
            {boxes.length} caixinha{boxes.length === 1 ? '' : 's'} · acompanhe seus objetivos e evolução
          </p>
        </div>
        <button
          className="btn btn-primary"
          disabled={checking.length === 0}
          title={checking.length === 0 ? 'Crie uma conta corrente primeiro' : undefined}
          onClick={() => setBoxForm({ parentAccountId: checking[0]?.id || '', name: '' })}
        >
          + Nova Caixinha
        </button>
      </div>

      <div className="savings-grid">
        <div className="savings-col">
          <TotalCard total={totalSaved} towardGoal={towardGoal} goalTotal={goalTotal} monthNet={monthNet} />
          <SavingsEvolution series={series} growth={growth} months={months} onChangeMonths={setMonths} theme={theme} />
          <SavingsMovements movements={moves} events={events} boxNameOf={boxNameOf} />
        </div>

        <div className="savings-col">
          <SummaryCard
            boxCount={boxes.length}
            savedThisYear={savedThisYear}
            hasGoal={goalTotal > 0}
          />
          <SavingsBoxPanel
            boxes={[...boxes].sort((a, b) => Number(b.balance || 0) - Number(a.balance || 0))}
            accountNameOf={accountNameOf}
            onMove={(b, dir) => setMoveForm({ box: b, account: checking.find(a => a.id === b.parentAccountId), direction: dir, amount: '' })}
            onRename={(b) => setBoxForm({ id: b.id, parentAccountId: b.parentAccountId, name: b.name, goal: b.savingsGoal ?? '' })}
          />
        </div>
      </div>

      {boxForm && (
        <SavingsBoxForm
          f={boxForm}
          accounts={checking}
          members={members}
          onChange={setBoxForm}
          onClose={() => setBoxForm(null)}
          onDelete={onDeleteBox ? () => {
            const target = boxes.find(b => b.id === boxForm.id);
            if (!target) return;
            setBoxForm(null);
            setDeleteBox(target);
          } : undefined}
          onSave={async () => {
            try {
              // A meta tem endpoint próprio: criar e renomear não a carregam.
              // Na criação, usa o id devolvido — antes a meta digitada era
              // silenciosamente descartada na primeira caixinha.
              const goal = Number(boxForm.goal) > 0 ? Number(boxForm.goal) : null;
              const id = boxForm.id
                ? (await onRenameBox(boxForm.id, boxForm.name), boxForm.id)
                : await onCreateBox(boxForm.parentAccountId, boxForm.name);

              // Sem id não dá para gravar a meta, e falhar aqui perderia a
              // caixinha que já foi criada; o aviso é melhor que o erro.
              if (onSetGoal && id) await onSetGoal(id, goal);
              else if (goal && !id) notify?.('Caixinha criada, mas não foi possível salvar a meta.', 'error');
              setBoxForm(null);
            } catch (e) { notify?.(e.message || 'Não foi possível salvar.', 'error'); }
          }}
        />
      )}

      {moveForm && (
        <MoveMoneyForm
          f={moveForm}
          onChange={setMoveForm}
          onClose={() => setMoveForm(null)}
          onSave={async () => {
            try {
              await onMove(moveForm);
              setMoveForm(null);
            } catch (e) { notify?.(e.message || 'Não foi possível mover o dinheiro.', 'error'); }
          }}
        />
      )}

      {deleteBox && (
        <DeleteSavingsBoxForm
          box={deleteBox}
          others={boxes.filter(b => b.id !== deleteBox.id)}
          accountNameOf={accountNameOf}
          onClose={() => setDeleteBox(null)}
          onConfirm={async (payload) => {
            const result = await onDeleteBox(deleteBox.id, payload);
            setDeleteBox(null);
            if (result?.refreshFailed) notify?.('Caixinha excluída, mas não foi possível atualizar a tela. Recarregue a página.', 'error');
            else notify?.('Caixinha excluída.');
          }}
        />
      )}
    </div>
  );
}
