import React from 'react';
import Icon from 'components/AppIcon';

const TYPES = [
  {
    value: 'question',
    icon: 'MessageCircle',
    label: 'Pregunta',
    description: 'Pide una recomendación o consulta a la comunidad',
  },
  {
    value: 'poll',
    icon: 'BarChart3',
    label: 'Encuesta',
    description: 'Deja que la comunidad vote en un clic',
  },
];

export default function PostTypeSelector({ value, onChange }) {
  return (
    <div role="radiogroup" aria-label="Tipo de publicación" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {TYPES?.map(type => {
        const selected = value === type?.value;
        return (
          <button
            key={type?.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange?.(type?.value)}
            className="flex items-start gap-3 p-4 rounded-xl border text-left transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-ring"
            style={{
              borderColor: selected ? 'var(--color-primary)' : 'var(--color-border)',
              background: selected ? 'var(--color-muted)' : 'var(--color-card)',
            }}
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: selected ? 'var(--color-primary)' : 'var(--color-muted)' }}
            >
              <Icon name={type?.icon} size={18} color={selected ? 'white' : 'var(--color-muted-foreground)'} />
            </div>
            <div className="min-w-0">
              <p className="font-heading font-semibold text-foreground text-sm">{type?.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{type?.description}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
