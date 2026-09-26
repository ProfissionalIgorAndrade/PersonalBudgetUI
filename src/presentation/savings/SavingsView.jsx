import React, { useMemo, useState } from 'react';
import { R$ } from '../../core/utils/format';
import { accountLabel } from '../../application/mappers/index';
import SavingsSummary from './components/SavingsSummary';
import SavingsEvolution from './components/SavingsEvolution';
import SavingsMovements from './components/SavingsMovements';
import SavingsBoxCard from './components/SavingsBoxCard';
import { savingsMovements, savingsSeries, savingsGrowth, netOf } from './savingsHistory';
import { useLocalStorage } from '../../core/hooks/useLocalStorage';
import SavingsBoxForm from './components/SavingsBoxForm';
import MoveMoneyForm from './components/MoveMoneyForm';

/**
 * Dinheiro guardado, no formato das caixinhas do Nubank.
 *
 * Uma caixinha é uma conta de tipo Savings ligada a uma conta corrente.
 * Guardar e resgatar são transferências entre as duas, então o valor sai do
 * saldo disponível sem virar despesa — guardar não é gastar.
 */
export default function SavingsView({ accounts = [], members = [], movements = [], onCreateBox, onRenameBox, onSetGoal, onMove, notify }) {
  const [months, setMonths] = useLocalStorage('pb_savings_months', 12);
  const [boxForm, setBoxForm]   = useState(null);
  const [moveForm, setMoveForm] = useState(null);

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

  const moves   = useMemo(() => savingsMovements(movements, boxes.map(b => b.id)), [movements, boxes]);
  const series  = useMemo(() => savingsSeries(movements, boxes, months), [movements, boxes, months]);
  const growth  = useMemo(() => savingsGrowth(movements, boxes, 3), [movements, boxes]);
  const thisKey = new Date().toISOString().slice(0, 7);
  const monthNet = netOf(moves.filter(m => String(m.date).slice(0, 7) === thisKey));

  const boxNameOf = (id) => boxes.find(b => b.id === id)?.name || 'caixinha removida';

  const grouped = checking
    .map(acc => ({ acc, boxes: boxes.filter(b => b.parentAccountId === acc.id) }))
    .filter(g => g.boxes.length > 0);

  // Caixinha cuja conta de origem foi desativada aparece à parte em vez de
  // sumir da tela: o dinheiro continua lá.
  const orphans = boxes.filter(b => !checking.some(a => a.id === b.parentAccountId));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Cofrinho</h1>
          <p className="page-sub">acompanhe seus objetivos e a evolução do que você guarda</p>
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

      <SavingsSummary total={totalSaved} towardGoal={towardGoal} goalTotal={goalTotal} monthNet={monthNet} boxCount={boxes.length} />

      {boxes.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: 34, marginBottom: 10 }}>🐷</div>
          <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Nenhum dinheiro guardado ainda</p>
          <p className="tmuted tsm" style={{ maxWidth: 440, margin: '0 auto', lineHeight: 1.6 }}>
            Uma caixinha separa parte do saldo de uma conta. O dinheiro sai do
            disponível e continua seu — guardar não conta como despesa.
          </p>
        </div>
      ) : (
        <>
          {grouped.map(({ acc, boxes: bs }) => (
            <div key={acc.id} style={{ marginBottom: 20 }}>
              <div className="flex jcb aib" style={{ marginBottom: 10, gap: 10, flexWrap: 'wrap' }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.5px' }}>
                  {accountLabel(acc, members)}
                </h3>
                <span className="txxs tmuted">
                  Disponível na conta: <strong style={{ color: 'var(--text)' }}>{R$(acc.balance)}</strong>
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
                {bs.map(b => (
                  <SavingsBoxCard
                    key={b.id}
                    box={b}
                    onMove={dir => setMoveForm({ box: b, account: acc, direction: dir, amount: '' })}
                    onRename={() => setBoxForm({ id: b.id, parentAccountId: acc.id, name: b.name, goal: b.savingsGoal ?? '' })}
                  />
                ))}
              </div>
            </div>
          ))}

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.6fr) minmax(0,1fr)', gap: 14, alignItems: 'start' }} className="savings-split">
            <SavingsEvolution series={series} growth={growth} months={months} onChangeMonths={setMonths} />
            <SavingsMovements movements={moves} boxNameOf={boxNameOf} />
          </div>

          {orphans.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>
                Sem conta de origem
              </h3>
              <p className="txxs tmuted" style={{ marginBottom: 10 }}>
                A conta destas caixinhas foi desativada. O dinheiro continua aqui.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
                {orphans.map(b => <SavingsBoxCard key={b.id} box={b} />)}
              </div>
            </div>
          )}
        </>
      )}

      {boxForm && (
        <SavingsBoxForm
          f={boxForm}
          accounts={checking}
          members={members}
          onChange={setBoxForm}
          onClose={() => setBoxForm(null)}
          onSave={async () => {
            try {
              // A meta é um endpoint próprio: criar/renomear não a carrega.
              if (boxForm.id) await onRenameBox(boxForm.id, boxForm.name);
              else await onCreateBox(boxForm.parentAccountId, boxForm.name);
              if (onSetGoal && boxForm.id) {
                await onSetGoal(boxForm.id, Number(boxForm.goal) > 0 ? Number(boxForm.goal) : null);
              }
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
    </div>
  );
}
