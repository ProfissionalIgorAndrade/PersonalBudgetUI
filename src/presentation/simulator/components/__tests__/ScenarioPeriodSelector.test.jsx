import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import React from 'react';
import ScenarioPeriodSelector from '../ScenarioPeriodSelector';

afterEach(cleanup);

describe('ScenarioPeriodSelector', () => {
  it('renders all three options', () => {
    render(<ScenarioPeriodSelector value={6} onChange={() => {}} />);
    expect(screen.getByText('3 meses')).toBeTruthy();
    expect(screen.getByText('6 meses')).toBeTruthy();
    expect(screen.getByText('12 meses')).toBeTruthy();
  });

  it('marks the active option', () => {
    render(<ScenarioPeriodSelector value={6} onChange={() => {}} />);
    expect(screen.getByText('6 meses').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText('3 meses').getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByText('12 meses').getAttribute('aria-pressed')).toBe('false');
  });

  it('calls onChange with the selected value', () => {
    const onChange = vi.fn();
    render(<ScenarioPeriodSelector value={6} onChange={onChange} />);
    fireEvent.click(screen.getByText('12 meses'));
    expect(onChange).toHaveBeenCalledWith(12);
  });

  it('calls onChange with 3 when 3 meses is clicked', () => {
    const onChange = vi.fn();
    render(<ScenarioPeriodSelector value={6} onChange={onChange} />);
    fireEvent.click(screen.getByText('3 meses'));
    expect(onChange).toHaveBeenCalledWith(3);
  });
});
