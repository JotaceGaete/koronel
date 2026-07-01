import React from 'react';

const SECTORS = [
  { value: '', label: 'Todos' },
  { value: 'Centro', label: 'Centro' },
  { value: 'Lagunillas', label: 'Lagunillas' },
  { value: 'Schwager', label: 'Schwager' },
  { value: 'Puchoco', label: 'Puchoco' },
  { value: 'Las Higueras', label: 'Las Higueras' },
  { value: 'Punta de Parra', label: 'Punta de Parra' },
  { value: 'Otro', label: 'Otro' },
];

export default function SectorFilterPills({ value, onChange }) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
      {SECTORS.map(s => (
        <button
          key={s.value}
          onClick={() => onChange(s.value)}
          className={`
            flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-150 border
            ${value === s.value
              ? 'text-white border-transparent'
              : 'bg-background border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
            }
          `}
          style={value === s.value ? { background: 'var(--color-primary)', borderColor: 'var(--color-primary)' } : {}}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
