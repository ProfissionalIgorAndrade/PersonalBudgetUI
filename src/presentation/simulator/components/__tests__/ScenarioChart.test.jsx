import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import React from 'react';
import ScenarioChart from '../ScenarioChart';

vi.mock('chart.js/auto', () => ({
  default: class {
    constructor() {}
    resize() {}
    destroy() {}
  },
}));

globalThis.ResizeObserver = globalThis.ResizeObserver || class {
  observe() {} unobserve() {} disconnect() {}
};

afterEach(cleanup);

const months = [
  { label: 'Jan/27', baseBalance: 10000, scenarioBalance: 8000 },
  { label: 'Fev/27', baseBalance: 11000, scenarioBalance: 8400 },
  { label: 'Mar/27', baseBalance: 12000, scenarioBalance: 8800 },
];

describe('ScenarioChart', () => {
  it('renders a canvas element', () => {
    const { container } = render(<ScenarioChart months={months} theme="dark" />);
    expect(container.querySelector('canvas')).toBeTruthy();
  });

  it('renders without errors for light theme', () => {
    const { container } = render(<ScenarioChart months={months} theme="light" />);
    expect(container.querySelector('canvas')).toBeTruthy();
  });

  it('renders without errors when months is empty', () => {
    const { container } = render(<ScenarioChart months={[]} theme="dark" />);
    expect(container.querySelector('canvas')).toBeTruthy();
  });
});
