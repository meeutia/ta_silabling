import React from 'react';

export function normalizeCurrencyDigits(value) {
  return String(value ?? '').replace(/\D/g, '');
}

export function formatCurrencyDigits(value) {
  const digits = normalizeCurrencyDigits(value);

  if (!digits) return '';

  return Number(digits).toLocaleString('id-ID');
}

export function CurrencyInput({ name = 'tarif', value, onChange, className = '', placeholder = 'Contoh: 10.000', ...props }) {
  const handleChange = (event) => {
    const rawValue = normalizeCurrencyDigits(event.target.value);

    onChange({
      ...event,
      target: {
        ...event.target,
        name,
        value: rawValue,
        type: 'text',
      },
    });
  };

  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-sm font-medium text-gray-500">
        Rp
      </span>
      <input
        {...props}
        type="text"
        inputMode="numeric"
        name={name}
        value={formatCurrencyDigits(value)}
        onChange={handleChange}
        className={`w-full rounded-lg border border-gray-200 py-2.5 pl-11 pr-4 outline-none focus:border-transparent focus:ring-2 focus:ring-emerald-500 ${className}`}
        placeholder={placeholder}
      />
    </div>
  );
}
