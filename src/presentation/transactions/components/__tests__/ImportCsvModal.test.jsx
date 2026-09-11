import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import ImportCsvModal from '../ImportCsvModal';
import { parseImportCsv } from '../../../../core/utils/csvImport';

afterEach(cleanup);

const categories = [{ id: 'c1', name: 'Mercado', icon: '🛒', type: 'expense' }];
const members = [{ id: 'm1', name: 'Familia', emoji: '👨‍👩‍👧' }];
const cards = [{ id: 'cc1', name: 'Inter Black' }];

const csv = [
  'descricao,valor,data,categoria,membro,observacoes',
  'Compra 1,10,2026-07-01,Mercado,Familia,',
  'Compra 2,20,2026-07-02,Mercado,Familia,',
  'Compra 3,30,2026-07-03,Mercado,Familia,',
].join('\n');

const seededRows = () => parseImportCsv(csv, { categories, members }).rows;

// The modal reads the file through FileReader; seeding the parsed rows
// directly keeps these tests on the behaviour that matters — the stepper and
// the progress reporting — rather than on the browser file API.
const openAtReview = (props = {}) => {
  const rows = seededRows();
  const utils = render(
    <ImportCsvModal cards={cards} categories={categories} members={members}
      onCreate={async () => {}} onClose={() => {}} {...props} />);
  return { ...utils, rows };
};

describe('ImportCsvModal first step', () => {
  it('offers both the template download and the file picker', () => {
    openAtReview();
    expect(screen.getByText(/Baixar modelo CSV/)).toBeTruthy();
    expect(screen.getByText(/Selecionar arquivo preenchido/)).toBeTruthy();
  });

  it('lists the expected columns so the format is discoverable', () => {
    openAtReview();
    expect(screen.getByText(/descricao, valor, data, categoria, membro, observacoes/)).toBeTruthy();
  });
});

describe('progress reporting', () => {
  // The reported requirement: while saving, say how many of the total are done.
  it('counts each saved row and ends with the full tally', async () => {
    const calls = [];
    const onCreate = vi.fn(async (payload) => { calls.push(payload); });

    const { container } = render(
      <ImportCsvModal cards={cards} categories={categories} members={members}
        onCreate={onCreate} onClose={() => {}} />);

    // Drive the component through its own file input.
    const file = new File([csv], 'lancamentos.csv', { type: 'text/csv' });
    const input = container.querySelector('input[type="file"]');
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(screen.getByText(/3 linha\(s\)/)).toBeTruthy());
    fireEvent.click(screen.getByText(/Continuar \(3\)/));
    fireEvent.click(screen.getByText(/Importar 3/));

    await waitFor(() => expect(screen.getByText(/Concluído — 3 de 3 salvos/)).toBeTruthy());
    expect(onCreate).toHaveBeenCalledTimes(3);
  });

  it('keeps going after a failure and reports which line broke', async () => {
    let n = 0;
    const onCreate = vi.fn(async () => {
      n += 1;
      if (n === 2) throw new Error('Valor inválido');
    });

    const { container } = render(
      <ImportCsvModal cards={cards} categories={categories} members={members}
        onCreate={onCreate} onClose={() => {}} />);

    const file = new File([csv], 'x.csv', { type: 'text/csv' });
    fireEvent.change(container.querySelector('input[type="file"]'), { target: { files: [file] } });

    await waitFor(() => expect(screen.getByText(/3 linha\(s\)/)).toBeTruthy());
    fireEvent.click(screen.getByText(/Continuar \(3\)/));
    fireEvent.click(screen.getByText(/Importar 3/));

    await waitFor(() => expect(screen.getByText(/Concluído — 2 de 3 salvos/)).toBeTruthy());
    expect(screen.getByText(/1 não salvo\(s\)/)).toBeTruthy();
    expect(screen.getByText(/Valor inválido/)).toBeTruthy();
    expect(onCreate).toHaveBeenCalledTimes(3);
  });

  it('sends the chosen card and statement on every row, not the row date', async () => {
    const seen = [];
    const onCreate = vi.fn(async (p) => { seen.push(p); });

    const { container } = render(
      <ImportCsvModal cards={cards} categories={categories} members={members}
        onCreate={onCreate} onClose={() => {}} />);

    const file = new File([csv], 'x.csv', { type: 'text/csv' });
    fireEvent.change(container.querySelector('input[type="file"]'), { target: { files: [file] } });
    await waitFor(() => expect(screen.getByText(/3 linha\(s\)/)).toBeTruthy());
    fireEvent.click(screen.getByText(/Continuar \(3\)/));

    const selects = [...container.querySelectorAll('select')];
    const monthSel = selects.find(s => [...s.options].some(o => o.textContent === 'Outubro'));
    fireEvent.change(monthSel, { target: { value: '10' } });

    fireEvent.click(screen.getByText(/Importar 3/));
    await waitFor(() => expect(screen.getByText(/Concluído/)).toBeTruthy());

    expect(seen).toHaveLength(3);
    for (const p of seen) {
      expect(p.cardId).toBe('cc1');
      expect(p.statementMonth).toBe(10);
      expect(p.recurrence).toBe('variable');
      expect(p.status).toBe('pending');
    }
    // Dates stay per-row; only the statement is shared.
    expect(seen.map(p => p.date)).toEqual(['2026-07-01', '2026-07-02', '2026-07-03']);
  });
});
