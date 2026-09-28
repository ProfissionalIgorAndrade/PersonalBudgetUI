import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';
import ScenarioImpactCards from '../ScenarioImpactCards';

afterEach(cleanup);

const makeResult = (summaryOverrides) => ({
  summary: {
    baseEndBalance:       10000,
    scenarioEndBalance:   8000,
    totalSimulatedImpact: -2000,
    ...summaryOverrides,
  },
});

describe('ScenarioImpactCards', () => {
  it('renders three cards', () => {
    const { container } = render(<ScenarioImpactCards result={makeResult()} />);
    expect(container.querySelectorAll('.sim-impact-card').length).toBe(3);
  });

  it('shows the three labels', () => {
    render(<ScenarioImpactCards result={makeResult()} />);
    expect(screen.getByText('Saldo Final')).toBeTruthy();
    expect(screen.getByText('Saldo com Cenário')).toBeTruthy();
    expect(screen.getByText('Impacto')).toBeTruthy();
  });

  it('applies red color for negative impact', () => {
    const { container } = render(<ScenarioImpactCards result={makeResult({ totalSimulatedImpact: -500 })} />);
    const values = container.querySelectorAll('.sim-impact-value');
    expect(values[1].style.color).toBe('var(--red)');
    expect(values[2].style.color).toBe('var(--red)');
  });

  it('applies green color for positive impact', () => {
    const { container } = render(
      <ScenarioImpactCards result={makeResult({ totalSimulatedImpact: 1000, scenarioEndBalance: 11000 })} />
    );
    const values = container.querySelectorAll('.sim-impact-value');
    expect(values[1].style.color).toBe('var(--green)');
    expect(values[2].style.color).toBe('var(--green)');
  });

  it('shows + prefix for positive impact', () => {
    render(
      <ScenarioImpactCards result={makeResult({ totalSimulatedImpact: 2000, scenarioEndBalance: 12000 })} />
    );
    expect(screen.getAllByText(/\+/).length).toBeGreaterThan(0);
  });
});
