import React, { useMemo, useState } from 'react';
import { R$ } from '../../core/utils/format';
import { accountLabel } from '../../application/mappers/index';
import SavingsBoxCard from './components/SavingsBoxCard';
import SavingsBoxForm from './components/SavingsBoxForm';
import MoveMoneyForm from './components/MoveMoneyForm';

/**
 * Dinheiro guardado, no formato das caixinhas do Nubank.
 *
 * Uma caixinha é uma conta de tipo Savings ligada a uma conta corrente.
 * Guardar e resgatar são transferências entre as duas, então o valor sai do
 * saldo disponível sem virar despesa — guardar não é gastar.
 */
export default function SavingsView({ accounts = [], members = [], onCreateBox, onRenameBox, onMove, notify }) {
  const [boxForm, setBoxForm]   = useState(null);
  const [moveForm, setMoveForm] = useState(null);

  const checking = useMemo(() => accounts.filter(a => a.kind !== 'savings' && a.isActive), [accounts]);
  const boxes    = useMemo(() => accounts.filter(a => a.kind === 'savings' && a.isActive), [accounts]);

  const totalSaved = boxes.reduce((s, b) => s + Number(b.balance || 0), 0);

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
          <p className="page-sub">
            {boxes.length} caixinha{boxes.length === 1 ? '' : 's'} · <strong>{R$(totalSaved)}</strong>
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
                    onRename={() => setBoxForm({ id: b.id, parentAccountId: acc.id, name: b.name })}
                  />
                ))}
              </div>
            </div>
          ))}

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
              if (boxForm.id) await onRenameBox(boxForm.id, boxForm.name);
              else await onCreateBox(boxForm.parentAccountId, boxForm.name);
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
