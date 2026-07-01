import React from 'react';
import Icon from 'components/AppIcon';
import { INTENT_OPTIONS } from '../../../lib/intentToSuggestion';

export default function IntentStep({ selected, onSelect }) {
  return (
    <div>
      <h2 className="font-heading font-bold text-xl text-foreground mb-1">¿Qué necesitas hoy?</h2>
      <p className="text-sm font-caption text-muted-foreground mb-5">
        Cuéntanos qué quieres conseguir y te ayudamos a crear la acción correcta.
      </p>
      <div className="grid grid-cols-1 gap-3">
        {INTENT_OPTIONS.map(opt => (
          <button
            key={opt.key}
            onClick={() => onSelect(opt.key)}
            className={`flex items-center gap-4 p-4 rounded-xl border text-left transition-all ${
              selected === opt.key
                ? 'border-primary bg-primary/5 shadow-sm'
                : 'border-border bg-card hover:border-primary/40 hover:shadow-sm'
            }`}
          >
            <div
              className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: opt.color + '18' }}
            >
              <Icon name={opt.icon} size={20} color={opt.color} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold font-caption text-foreground">{opt.label}</p>
            </div>
            {selected === opt.key && (
              <Icon name="CheckCircle2" size={18} color="var(--color-primary)" className="shrink-0" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
