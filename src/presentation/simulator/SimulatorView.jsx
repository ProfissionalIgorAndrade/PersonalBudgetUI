import React from 'react';
import { useSimulator } from '../../application/hooks/useSimulator';
import ScenarioPeriodSelector from './components/ScenarioPeriodSelector';
import ScenarioBuilder        from './components/ScenarioBuilder';
import ScenarioChart          from './components/ScenarioChart';
import ScenarioImpactCards    from './components/ScenarioImpactCards';
import ScenarioInsight        from './components/ScenarioInsight';

export default function SimulatorView({ theme }) {
  const {
    scenario, months, result, loading, error,
    setName, setMonths,
    addImpact, editImpact, removeImpact,
    calculate, reset,
  } = useSimulator();

  const canCalculate = scenario.impacts.length > 0 && !loading;

  return (
    <div className="sim-view">
      <div className="page-header">
        <div>
          <h1 className="page-title">E se eu fizer isso?</h1>
          <p className="page-subtitle tmuted">
            Simule cenários hipotéticos sem alterar seus dados reais.
          </p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={reset}>
          Limpar
        </button>
      </div>

      <div className="sim-layout">
        {/* ── Coluna esquerda: configuração ── */}
        <div className="sim-left">
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label" htmlFor="scenario-name">Nome do cenário</label>
              <input
                id="scenario-name"
                className="form-input"
                value={scenario.name}
                onChange={e => setName(e.target.value)}
                placeholder="Ex: Comprar carro, Trocar de apartamento..."
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Horizonte de projeção</label>
              <ScenarioPeriodSelector value={months} onChange={setMonths} />
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, marginTop: 0 }}>
              Impactos simulados
            </h3>
            <ScenarioBuilder
              scenario={scenario}
              onAdd={addImpact}
              onEdit={editImpact}
              onRemove={removeImpact}
            />
          </div>

          <button
            type="button"
            className="btn btn-primary sim-calc-btn"
            onClick={calculate}
            disabled={!canCalculate}
          >
            {loading ? 'Calculando...' : '🔮 Calcular impacto'}
          </button>

          {error && (
            <p className="tsm" style={{ color: 'var(--red)', marginTop: 8 }}>{error}</p>
          )}
        </div>

        {/* ── Coluna direita: resultados ── */}
        <div className="sim-right">
          <ScenarioInsight result={result} months={months} />

          {result ? (
            <>
              <div style={{ marginTop: 12 }}>
                <ScenarioImpactCards result={result} />
              </div>

              <div className="card" style={{ marginTop: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4, marginTop: 0 }}>
                  Projeção de {months} {months === 1 ? 'mês' : 'meses'}
                </h3>
                <p className="txxs tmuted" style={{ marginBottom: 12 }}>
                  Barras: receitas e gastos mensais · Linhas: saldo projetado
                </p>
                <ScenarioChart months={result.months} theme={theme} />
              </div>
            </>
          ) : (
            !loading && (
              <div className="sim-results-placeholder card" style={{ marginTop: 12 }}>
                <p className="tmuted" style={{ textAlign: 'center', padding: '32px 0' }}>
                  Configure os impactos e clique em <strong>Calcular impacto</strong> para ver a projeção.
                </p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
