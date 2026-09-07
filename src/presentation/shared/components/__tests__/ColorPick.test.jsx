import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import React from 'react';
import ColorPick from '../ColorPick';
import { PALETTE, inkOn } from '../../../../core/constants/palette';

afterEach(cleanup);

describe('ColorPick', () => {
  it('renders the whole palette', () => {
    render(<ColorPick val={PALETTE[0]} onChange={() => {}} />);
    expect(screen.getAllByRole('radio').length).toBe(PALETTE.length);
  });

  it('marks exactly one swatch as selected, with a visible tick', () => {
    render(<ColorPick val="#fde047" onChange={() => {}} />);
    const checked = screen.getAllByRole('radio').filter(b => b.getAttribute('aria-checked') === 'true');
    expect(checked.length).toBe(1);
    expect(checked[0].textContent).toBe('✓');
    expect(checked[0].className).toContain('sel');
  });

  it('draws the tick in dark ink on a pale swatch and light ink on a deep one', () => {
    expect(inkOn('#fde047')).toBe('#0b0f14');
    expect(inkOn('#0d9488')).toBe('#ffffff');
  });

  it('keeps a saved colour that is no longer in the palette', () => {
    render(<ColorPick val="#123456" onChange={() => {}} />);
    expect(screen.getAllByRole('radio').length).toBe(PALETTE.length + 1);
    expect(screen.getByTitle('#123456').getAttribute('aria-checked')).toBe('true');
  });

  it('reports the clicked colour', () => {
    let got = null;
    render(<ColorPick val={PALETTE[0]} onChange={v => { got = v; }} />);
    fireEvent.click(screen.getByTitle('#f472b6'));
    expect(got).toBe('#f472b6');
  });
});
