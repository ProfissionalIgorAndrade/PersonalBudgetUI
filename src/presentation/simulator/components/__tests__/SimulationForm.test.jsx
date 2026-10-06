import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import React from 'react';
import SimulationForm, { validateSimulationForm } from '../SimulationForm';

afterEach(cleanup);

const setup = (props = {}) => {
  const onSave = vi.fn();
  const onClose = vi.fn();
  const utils = render(<SimulationForm defaultMonth="2026-10" onSave={onSave} onClose={onClose} {...props} />);
  return { onSave, onClose, ...utils };
};

const submit = (container) => fireEvent.submit(container.querySelector('form'));
const type = (label, value) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const typeAmount = (label, value) => {
  const input = screen.getByLabelText(label);
  fireEvent.change(input, { target: { value } });
  fireEvent.blur(input);
};
const preview = () => screen.getByTestId('wi-preview').textContent.replace(/\u00a0/g, ' ');

describe('SimulationForm: campos e rótulos', () => {
  it('começa em Despesa / Única, com o mês padrão e rótulos ligados por htmlFor', () => {
    setup();
    expect(screen.getByText(/Despesa/).closest('button').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText('Única').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByLabelText('Descrição')).toBeTruthy();
    expect(screen.getByLabelText('Valor (R$)')).toBeTruthy();
    expect(screen.getByLabelText('Mês do impacto').value).toBe('2026-10');
    expect(screen.getByLabelText('Mês do impacto').getAttribute('type')).toBe('month');
  });

  it('oferece as três modalidades e mostra só os campos de cada uma', () => {
    setup();
    expect(screen.getByText('Única')).toBeTruthy();
    expect(screen.getByText('Parcelada')).toBeTruthy();
    expect(screen.getByText('Mensal')).toBeTruthy();
    expect(screen.queryByLabelText('Número de parcelas')).toBeNull();
    expect(screen.queryByLabelText(/Duração em meses/)).toBeNull();

    fireEvent.click(screen.getByText('Parcelada'));
    expect(screen.getByLabelText('Número de parcelas')).toBeTruthy();
    expect(screen.getByText('Valor da parcela')).toBeTruthy();
    expect(screen.getByText('Valor total')).toBeTruthy();
    expect(screen.queryByLabelText(/Duração em meses/)).toBeNull();

    fireEvent.click(screen.getByText('Mensal'));
    expect(screen.getByLabelText(/Duração em meses/)).toBeTruthy();
    expect(screen.queryByLabelText('Número de parcelas')).toBeNull();
    expect(screen.queryByText('Valor total')).toBeNull();
  });

  it('alterna receita e despesa', () => {
    setup();
    const income = screen.getByText(/Receita/).closest('button');
    fireEvent.click(income);
    expect(income.getAttribute('aria-pressed')).toBe('true');
  });
});

describe('SimulationForm: validação visível, sem retorno silencioso', () => {
  it('mostra mensagens para descrição e valor e não salva', () => {
    const { onSave, onClose, container } = setup();
    submit(container);
    const alerts = screen.getAllByRole('alert').map(a => a.textContent);
    expect(alerts.some(t => /descrição/i.test(t))).toBe(true);
    expect(alerts.some(t => /valor maior que zero/i.test(t))).toBe(true);
    expect(screen.getByLabelText('Descrição').getAttribute('aria-invalid')).toBe('true');
    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('exige o mês de início', () => {
    const { onSave, container } = setup({ defaultMonth: '' });
    type('Descrição', 'Viagem');
    typeAmount('Valor (R$)', '500,00');
    submit(container);
    expect(screen.getByRole('alert').textContent).toMatch(/mês de início/i);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('parcelas fora de 1..120 são recusadas com mensagem', () => {
    const { onSave, container } = setup();
    fireEvent.click(screen.getByText('Parcelada'));
    type('Descrição', 'Carro');
    typeAmount('Valor da parcela (R$)', '150,00');
    for (const bad of ['0', '121', '']) {
      type('Número de parcelas', bad);
      submit(container);
      expect(screen.getByRole('alert').textContent).toMatch(/1 a 120 parcelas/);
    }
    expect(onSave).not.toHaveBeenCalled();
  });

  it('duração mensal acima de 120 é recusada', () => {
    const errors = validateSimulationForm({
      description: 'x', amount: 10, startMonth: '2026-10', mode: 'Monthly', months: '121', installments: '', amountKind: 'PerInstallment',
    });
    expect(errors.months).toBeTruthy();
  });
});

describe('SimulationForm: prévia ao vivo', () => {
  it('parcela x total: 12x R$ 150,00 e última parcela', () => {
    setup();
    fireEvent.click(screen.getByText('Parcelada'));
    typeAmount('Valor da parcela (R$)', '150,00');
    type('Número de parcelas', '12');
    expect(preview()).toContain('12× R$ 150,00 · última parcela R$ 150,00 · total R$ 1.800,00');

    fireEvent.click(screen.getByText('Valor total'));
    typeAmount('Valor total (R$)', '1000,00');
    expect(preview()).toContain('12× R$ 83,33 · última parcela R$ 83,37 · total R$ 1.000,00');
  });

  it('mensal sem duração diz "até o fim do horizonte"', () => {
    setup();
    fireEvent.click(screen.getByText('Mensal'));
    typeAmount('Valor por mês (R$)', '800,00');
    expect(preview()).toContain('até o fim do horizonte');
    type(/Duração em meses/, '6');
    expect(preview()).toContain('por 6 meses');
  });
});

describe('SimulationForm: salvar', () => {
  it('parcelada por valor total envia amountKind e parcelas', () => {
    const { onSave, onClose, container } = setup();
    fireEvent.click(screen.getByText('Parcelada'));
    fireEvent.click(screen.getByText('Valor total'));
    type('Descrição', '  Celular ');
    typeAmount('Valor total (R$)', '1000,00');
    type('Número de parcelas', '12');
    type('Mês de início', '2026-12');
    submit(container);
    expect(onSave).toHaveBeenCalledWith({
      description: 'Celular', type: 'Expense', mode: 'Installment', startMonth: '2026-12',
      amount: 1000, amountKind: 'Total', installments: 12, months: null,
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('mensal com duração vazia envia months null; com valor envia o número', () => {
    const { onSave, container } = setup();
    fireEvent.click(screen.getByText(/Receita/).closest('button'));
    fireEvent.click(screen.getByText('Mensal'));
    type('Descrição', 'Freela');
    typeAmount('Valor por mês (R$)', '1200,00');
    submit(container);
    expect(onSave.mock.calls[0][0]).toMatchObject({ type: 'Income', mode: 'Monthly', amount: 1200, months: null, installments: null });
    type(/Duração em meses/, '6');
    submit(container);
    expect(onSave.mock.calls[1][0].months).toBe(6);
  });

  it('edição abre com os dados da simulação', () => {
    setup({
      initial: {
        id: 'a', enabled: true, description: 'Carro', type: 'Expense', mode: 'Installment', startMonth: '2026-11',
        amount: 1800, amountKind: 'Total', installments: 12, months: null,
      },
    });
    expect(screen.getByText('Editar simulação')).toBeTruthy();
    expect(screen.getByLabelText('Descrição').value).toBe('Carro');
    expect(screen.getByLabelText('Número de parcelas').value).toBe('12');
    expect(screen.getByText('Valor total').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByLabelText('Mês de início').value).toBe('2026-11');
  });
});
