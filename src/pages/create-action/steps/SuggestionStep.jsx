import React from 'react';
import Icon from 'components/AppIcon';
import { getSuggestionsForIntent, INTENT_OPTIONS, ACTION_TYPE_LABELS } from '../../../lib/intentToSuggestion';

const TYPE_ICONS = {
  offer:       'Tag',
  liquidation: 'Percent',
  launch:      'Rocket',
  event:       'Calendar',
  happy_hour:  'Clock',
  season:      'Sun',
  anniversary: 'Star',
  new_product: 'Sparkles',
};

export default function SuggestionStep({ intent, categoryKey, selectedType, onSelect }) {
  const suggestions = getSuggestionsForIntent(intent, categoryKey);
  const intentLabel = INTENT_OPTIONS.find(o => o.key === intent)?.label || '';

  return (
    <div>
      <p className="text-sm font-caption text-muted-foreground mb-1">Para "{intentLabel}", te sugerimos:</p>
      <h2 className="font-heading font-bold text-xl text-foreground mb-5">¿Qué tipo de acción quieres crear?</h2>

      <div className="space-y-3">
        {suggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => onSelect(s.type, s, i === 0)}
            className={`w-full flex items-start gap-4 p-4 rounded-xl border text-left transition-all ${
              selectedType === s.type && i === suggestions.findIndex(x => x.type === s.type)
                ? 'border-primary bg-primary/5 shadow-sm'
                : 'border-border bg-card hover:border-primary/40 hover:shadow-sm'
            }`}
          >
            <div className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-muted">
              <Icon name={TYPE_ICONS[s.type] || 'Star'} size={20} color="var(--color-primary)" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold font-caption text-foreground">{s.label}</p>
              <p className="text-xs font-caption text-muted-foreground mt-0.5">{s.tagline}</p>
              {s.hint && (
                <p className="text-xs font-caption mt-1 px-2 py-0.5 rounded-full inline-block" style={{ background: 'var(--color-primary)/8', color: 'var(--color-primary)' }}>
                  {s.hint}
                </p>
              )}
            </div>
          </button>
        ))}
      </div>

      <p className="text-xs font-caption text-muted-foreground text-center mt-4">
        ¿Tienes algo distinto en mente? Elige cualquier opción y la adaptas tú.
      </p>
    </div>
  );
}
