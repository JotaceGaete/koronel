import React from 'react';
import Icon from 'components/AppIcon';

export const MIN_POLL_OPTIONS = 2;
export const MAX_POLL_OPTIONS = 6;

export default function PollOptionsEditor({ options, onChange, error }) {
  const handleOptionChange = (idx, value) => {
    const next = [...options];
    next[idx] = value;
    onChange?.(next);
  };

  const handleAdd = () => {
    if (options?.length >= MAX_POLL_OPTIONS) return;
    onChange?.([...options, '']);
  };

  const handleRemove = (idx) => {
    if (options?.length <= MIN_POLL_OPTIONS) return;
    onChange?.(options?.filter((_, i) => i !== idx));
  };

  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1">
        Opciones <span style={{ color: 'var(--color-error)' }}>*</span>
        <span className="text-muted-foreground font-normal ml-1">(entre {MIN_POLL_OPTIONS} y {MAX_POLL_OPTIONS})</span>
      </label>
      <div className="space-y-2">
        {options?.map((option, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <input
              type="text"
              value={option}
              onChange={e => handleOptionChange(idx, e?.target?.value)}
              placeholder={`Opción ${idx + 1}`}
              maxLength={80}
              className="w-full px-3 py-2 text-sm border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              style={{ borderColor: error ? 'var(--color-error)' : 'var(--color-border)' }}
            />
            {options?.length > MIN_POLL_OPTIONS && (
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                className="p-2 rounded-md hover:bg-muted transition-colors flex-shrink-0"
                title="Quitar opción"
                aria-label={`Quitar opción ${idx + 1}`}
              >
                <Icon name="X" size={16} color="var(--color-muted-foreground)" />
              </button>
            )}
          </div>
        ))}
      </div>
      {options?.length < MAX_POLL_OPTIONS && (
        <button
          type="button"
          onClick={handleAdd}
          className="flex items-center gap-1.5 text-sm font-medium mt-2 transition-colors"
          style={{ color: 'var(--color-primary)' }}
        >
          <Icon name="PlusCircle" size={16} color="currentColor" />
          Agregar opción
        </button>
      )}
      {error && <p className="text-xs mt-1.5" style={{ color: 'var(--color-error)' }}>{error}</p>}
    </div>
  );
}
