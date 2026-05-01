import React, { useState, useEffect } from 'react';

function numToStr(num) {
  if (!num && num !== 0) return '';
  return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
}

function strToNum(str) {
  if (!str) return 0;
  const cleaned = str.replace(/\./g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export default function CurrencyInput({ value, onChange, placeholder = '0,00', className = 'form-input', required, style }) {
  const [display, setDisplay] = useState(() => (value ? numToStr(Number(value)) : ''));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setDisplay(value ? numToStr(Number(value)) : '');
    }
  }, [value, focused]);

  const handleChange = (e) => {
    const raw = e.target.value.replace(/[^\d,]/g, '');
    setDisplay(raw);
    onChange(strToNum(raw));
  };

  const handleBlur = () => {
    setFocused(false);
    const num = strToNum(display);
    setDisplay(num > 0 ? numToStr(num) : '');
    onChange(num);
  };

  const handleFocus = (e) => {
    setFocused(true);
    const raw = display.replace(/\./g, '');
    setDisplay(raw);
    setTimeout(() => e.target.select(), 0);
  };

  return (
    <input
      className={className}
      style={style}
      value={display}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={handleFocus}
      placeholder={placeholder}
      required={required}
      inputMode="decimal"
    />
  );
}
