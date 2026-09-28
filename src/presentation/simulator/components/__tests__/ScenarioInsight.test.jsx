import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';
import ScenarioInsight from '../ScenarioInsight';

afterEach(cleanup);

const makeResult = (overrides) => ({
  months: [
    { label: 'Jan/27', scenarioBalance: 1000 },
    { label: 'Fev/27', scenarioBalance: 500  },
  ],
  summary: {
    totalSimulatedImpact: -2000,
    endBalanceDelta: -2000,
    baseEndBalance: 10000,
    scenarioEndBalance: 8000,
    scenarioGoesNegative: false,
    firstNegativeMonthIndex: null,
    ...overrides,
  },
});

describe('ScenarioInsight', () => {
  it('shows neutral hint when no result', () => {
    render(<ScenarioInsight result={null} months={6} />);
    expect(screen.getByText(/Adicione impactos/)).toBeTruthy();
  });

  it('shows warning when scenario goes negative', () => {
    const result = makeResult({
      scenarioGoesNegative: true,
      firstNegativeMonthIndex: 1,
    });
    render(<ScenarioInsight result={result} months={6} />);
    expect(screen.getByText(/saldo ficaria negativo/)).toBeTruthy();
    expect(screen.getByText(/Fev\/27/)).toBeTruthy();
  });

  it('shows negative message when totalImpact is negative', () => {
    render(<ScenarioInsight result={makeResult({ totalSimulatedImpact: -5000 })} months={6} />);
    expect(screen.getByText(/reduziria/)).toBeTruthy();
  });

  it('shows positive message when totalImpact is positive', () => {
    render(<ScenarioInsight result={makeResult({ totalSimulatedImpact: 3000, endBalanceDelta: 3000 })} months={6} />);
    expect(screen.getByText(/aumentaria/)).toBeTruthy();
  });

  it('shows neutral when totalImpact is zero', () => {
    render(<ScenarioInsight result={makeResult({ totalSimulatedImpact: 0, endBalanceDelta: 0 })} months={6} />);
    expect(screen.getByText(/Adicione impactos/)).toBeTruthy();
  });
});
