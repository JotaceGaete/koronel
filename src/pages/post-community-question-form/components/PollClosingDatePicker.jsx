import React, { useState } from 'react';

const PRESETS = [
  { value: 'none', label: 'Sin fecha', days: null },
  { value: '1d', label: '1 día', days: 1 },
  { value: '3d', label: '3 días', days: 3 },
  { value: '1w', label: '1 semana', days: 7 },
  { value: 'custom', label: 'Personalizada', days: null },
];

function toLocalDatetimeInputValue(date) {
  const pad = n => String(n)?.padStart(2, '0');
  return `${date?.getFullYear()}-${pad(date?.getMonth() + 1)}-${pad(date?.getDate())}T${pad(date?.getHours())}:${pad(date?.getMinutes())}`;
}

export default function PollClosingDatePicker({ onChange, error }) {
  const [preset, setPreset] = useState('none');
  const [customValue, setCustomValue] = useState('');

  const emit = (nextPreset, nextCustomValue) => {
    if (nextPreset === 'none') {
      onChange?.(null);
      return;
    }
    if (nextPreset === 'custom') {
      onChange?.(nextCustomValue ? new Date(nextCustomValue)?.toISOString() : null);
      return;
    }
    const days = PRESETS?.find(p => p?.value === nextPreset)?.days;
    const closesAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    onChange?.(closesAt?.toISOString());
  };

  const handlePresetClick = (value) => {
    setPreset(value);
    emit(value, customValue);
  };

  const handleCustomChange = (value) => {
    setCustomValue(value);
    emit('custom', value);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1.5">Finaliza</label>
      <div className="flex flex-wrap gap-2">
        {PRESETS?.map(p => (
          <button
            key={p?.value}
            type="button"
            onClick={() => handlePresetClick(p?.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 ${
              preset === p?.value ? 'text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
            style={preset === p?.value ? { background: 'var(--color-accent)' } : {}}
          >
            {p?.label}
          </button>
        ))}
      </div>
      {preset === 'custom' && (
        <input
          type="datetime-local"
          value={customValue}
          min={toLocalDatetimeInputValue(new Date())}
          onChange={e => handleCustomChange(e?.target?.value)}
          className="mt-2 w-full sm:w-auto px-3 py-2 text-sm border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          style={{ borderColor: error ? 'var(--color-error)' : 'var(--color-border)' }}
        />
      )}
      {error && <p className="text-xs mt-1.5" style={{ color: 'var(--color-error)' }}>{error}</p>}
    </div>
  );
}
