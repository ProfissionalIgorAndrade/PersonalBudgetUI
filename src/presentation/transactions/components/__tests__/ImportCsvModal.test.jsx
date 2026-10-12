import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import ImportCsvModal from '../ImportCsvModal';

afterEach(cleanup);

const categories = [{ id: 'c1', name: 'Mercado', icon: '🛒', type: 'expense' }];
const members = [{ id: 'm1', name: 'Familia', emoji: '👨‍👩‍👧' }];
const cards = [{ id: 'cc1', name: 'Inter Black' }, { id: 'cc2', name: 'Nubank' }];

const csv = [
  'id_sistema;descricao;valor;data;tipo;categoria;membro;observacoes',
  'tx-1;Compra 1;10,00;2026-07-01;Despesa;Mercado;Familia;',
  ';Compra 2;20,00;2026-07-02;Despesa;Mercado;Familia;',
  ';Compra 3;30,00;2026-07-03;Despesa;Mercado;Familia;',
].join('\r\n');

// The server decides what already exists; here the first line does.
const previewWithFirstExisting = (rows) => ({
  created: 0, skipped: 1, errors: [],
  rows: rows.map((_, index) => ({ index, status: index === 0 ? 'Existing' : 'New', message: null })),
});

const makeImport = (onCommit = (rows) => ({ created: rows.length, skipped: 0, errors: [], rows: [] })) =>
  vi.fn(async (cardId, month, year, rows, dryRun) =>
    (dryRun ? previewWithFirstExisting(rows) : onCommit(rows)));

const renderModal = (props = {}) => render(
  <ImportCsvModal transactions={[]} cards={cards} categories={categories} members={members}
    activeMonth="2026-08" onImportStatement={makeImport()} onClose={() => {}} {...props} />);

const uploadCsv = (container, content = csv) => {
  fireEvent.click(screen.getByText('Importar'));
  const file = new File([content], 'fatura.csv', { type: 'text/csv' });
  fireEvent.change(container.querySelector('input[type="file"]'), { target: { files: [file] } });
};

describe('ImportCsvModal statement selection', () => {
  it('asks for card and statement before importing, defaulting to the active month', () => {
    renderModal();
    fireEvent.click(screen.getByText('Importar'));

    expect(screen.getByLabelText(/Cartão de crédito/).value).toBe('cc1');
    expect(screen.getByLabelText(/Fatura \(mês\/ano\)/).value).toBe('8');
    expect(screen.getByLabelText('Ano da fatura').value).toBe('2026');
  });

  it('asks for the same card and statement before exporting', () => {
    renderModal();
    fireEvent.click(screen.getByText('Exportar'));

    expect(screen.getByLabelText(/Cartão de crédito/)).toBeTruthy();
    expect(screen.getByLabelText(/Fatura \(mês\/ano\)/)).toBeTruthy();
  });

  it('lists the shared columns so the format is discoverable', () => {
    renderModal();
    fireEvent.click(screen.getByText('Importar'));
    expect(screen.getByText(/id_sistema, descricao, valor, data, tipo, categoria, membro, observacoes/)).toBeTruthy();
  });

  it('cannot pick a file without a card', () => {
    renderModal({ cards: [] });
    fireEvent.click(screen.getByText('Importar'));
    expect(screen.getByText(/Nenhum cartão de crédito cadastrado/)).toBeTruthy();
    expect(screen.getByText(/Selecionar arquivo CSV/).closest('button').disabled).toBe(true);
  });
});

describe('ImportCsvModal import flow', () => {
  it('previews against the chosen statement and shows only new rows for editing', async () => {
    const onImportStatement = makeImport();
    const { container } = renderModal({ onImportStatement });

    fireEvent.click(screen.getByText('Importar'));
    fireEvent.change(screen.getByLabelText(/Cartão de crédito/), { target: { value: 'cc2' } });
    fireEvent.change(screen.getByLabelText(/Fatura \(mês\/ano\)/), { target: { value: '9' } });
    const file = new File([csv], 'fatura.csv', { type: 'text/csv' });
    fireEvent.change(container.querySelector('input[type="file"]'), { target: { files: [file] } });

    await waitFor(() => expect(screen.getByText(/1 linha\(s\) já existem nesta fatura/)).toBeTruthy());

    const [cardId, month, year, rows, dryRun] = onImportStatement.mock.calls[0];
    expect([cardId, month, year, dryRun]).toEqual(['cc2', 9, 2026, true]);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({ externalId: 'tx-1', description: 'Compra 1', amount: 10, type: 'Expense' });

    // Existing rows are listed read-only; only the two new ones get inputs.
    expect(screen.queryByDisplayValue('Compra 1')).toBeNull();
    expect(screen.getByDisplayValue('Compra 2')).toBeTruthy();
    expect(screen.getByDisplayValue('Compra 3')).toBeTruthy();
    expect(screen.getByText(/Importar 2 na fatura 09\/2026/)).toBeTruthy();
  });

  it('sends only the new rows, with edits, and reports the outcome', async () => {
    const onImportStatement = makeImport();
    const { container } = renderModal({ onImportStatement });
    uploadCsv(container);

    await waitFor(() => expect(screen.getByDisplayValue('Compra 2')).toBeTruthy());
    fireEvent.change(screen.getByDisplayValue('Compra 2'), { target: { value: 'Compra editada' } });
    fireEvent.click(screen.getByText(/Importar 2 na fatura/));

    await waitFor(() => expect(screen.getByText('Importação concluída')).toBeTruthy());

    const [cardId, month, year, rows, dryRun] = onImportStatement.mock.calls[1];
    expect([cardId, month, year, dryRun]).toEqual(['cc1', 8, 2026, false]);
    expect(rows.map(r => r.description)).toEqual(['Compra editada', 'Compra 3']);
    expect(rows[0]).toMatchObject({ categoryId: 'c1', attributionProfileId: 'm1', amount: 20 });

    expect(screen.getByText('novos criados').previousSibling.textContent).toBe('2');
    expect(screen.getByText('já existentes ignorados').previousSibling.textContent).toBe('1');
  });

  it('leaves out rows the user unchecked', async () => {
    const onImportStatement = makeImport();
    const { container } = renderModal({ onImportStatement });
    uploadCsv(container);

    await waitFor(() => expect(screen.getByDisplayValue('Compra 2')).toBeTruthy());
    const rowCheckbox = screen.getByDisplayValue('Compra 2').closest('tr').querySelector('input[type="checkbox"]');
    fireEvent.click(rowCheckbox);
    fireEvent.click(screen.getByText(/Importar 1 na fatura/));

    await waitFor(() => expect(screen.getByText('Importação concluída')).toBeTruthy());
    expect(onImportStatement.mock.calls[1][3].map(r => r.description)).toEqual(['Compra 3']);
  });

  it('offers nothing to import when every row already exists', async () => {
    const onImportStatement = vi.fn(async (cardId, month, year, rows) => ({
      created: 0, skipped: rows.length, errors: [],
      rows: rows.map((_, index) => ({ index, status: 'Existing', message: null })),
    }));
    const { container } = renderModal({ onImportStatement });
    uploadCsv(container);

    await waitFor(() => expect(screen.getByText(/Todas as linhas do arquivo já existem nesta fatura/)).toBeTruthy());
    expect(screen.queryByText(/💾 Importar/)).toBeNull();
    expect(onImportStatement).toHaveBeenCalledTimes(1);
  });

  it('blocks a new row with an unknown category and says which one', async () => {
    const bad = csv.replace(';Compra 2;20,00;2026-07-02;Despesa;Mercado;', ';Compra 2;20,00;2026-07-02;Despesa;Inexistente;');
    const { container } = renderModal();
    uploadCsv(container, bad);

    await waitFor(() => expect(screen.getByDisplayValue('Compra 3')).toBeTruthy());
    // The row comes unchecked; checking it surfaces why it cannot be sent.
    const rowCheckbox = screen.getByDisplayValue('Compra 2').closest('tr').querySelector('input[type="checkbox"]');
    expect(rowCheckbox.checked).toBe(false);
    fireEvent.click(rowCheckbox);

    expect(screen.getByText(/Categoria "Inexistente" não existe/)).toBeTruthy();
    expect(screen.getByText(/Importar 1 na fatura/)).toBeTruthy();
  });

  it('shows server errors per line after importing', async () => {
    const onImportStatement = makeImport(() => ({
      created: 1, skipped: 0, errors: ['Linha 2: "Compra 3": Valor inválido'], rows: [],
    }));
    const { container } = renderModal({ onImportStatement });
    uploadCsv(container);

    await waitFor(() => expect(screen.getByText(/Importar 2 na fatura/)).toBeTruthy());
    fireEvent.click(screen.getByText(/Importar 2 na fatura/));

    await waitFor(() => expect(screen.getByText(/Linha 2: "Compra 3": Valor inválido/)).toBeTruthy());
    expect(screen.getByText('1 erro(s):')).toBeTruthy();
  });

  it('stays on the upload step and explains when the preview fails', async () => {
    const onImportStatement = vi.fn(async () => { throw new Error('Cartão de crédito não encontrado.'); });
    const { container } = renderModal({ onImportStatement });
    uploadCsv(container);

    await waitFor(() => expect(screen.getByText('Cartão de crédito não encontrado.')).toBeTruthy());
    expect(screen.getByText(/Selecionar arquivo CSV/)).toBeTruthy();
  });
});
