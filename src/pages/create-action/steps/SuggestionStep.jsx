import React from 'react';
import { getSuggestionsForIntent } from '../../../lib/intentToSuggestion';

const SITUATION_RESPONSE = {
  low_traffic:   'Entendido. Cuando bajan las visitas, lo que mejor funciona es generar urgencia ahora mismo.',
  excess_stock:  'Claro. Para mover stock rápido, lo mejor es ofrecer un precio irresistible por tiempo limitado.',
  new_customers: 'Perfecto. Para conseguir nuevos clientes, necesitas que te descubran y que tengan un motivo para venir.',
  event:         'Excelente. Un evento bien comunicado puede llenar tu negocio. Vamos a correr la voz.',
  idea:          'Cuéntame más. Elige el tipo de publicación que mejor describe lo que tienes en mente.',
};

// Map situation key → intent key used in intentToSuggestion
const SITUATION_TO_INTENT = {
  low_traffic:   'low_sales',
  excess_stock:  'excess_stock',
  new_customers: 'new_customers',
  event:         'event',
  idea:          'free_publish',
};

export default function SuggestionStep({ situation, categoryKey, lastActionType, onSelect }) {
  const intentKey = SITUATION_TO_INTENT[situation] || 'free_publish';
  const suggestions = getSuggestionsForIntent(intentKey, categoryKey);
  const responseText = SITUATION_RESPONSE[situation] || '';

  // If the merchant's last action matches a suggestion, surface it first
  const sorted = lastActionType
    ? [
        ...suggestions.filter(s => s.type === lastActionType),
        ...suggestions.filter(s => s.type !== lastActionType),
      ]
    : suggestions;

  return (
    <div className="flex flex-col min-h-[70vh]">
      {/* System response */}
      <div className="mb-8">
        <p className="text-base font-caption text-foreground leading-relaxed mb-4">
          {responseText}
        </p>
        <p className="text-base font-heading font-semibold text-foreground">
          ¿Cuál prefieres?
        </p>
      </div>

      {/* Suggestions as conversation choices */}
      <div className="flex flex-col gap-3 flex-1">
        {sorted.map((s, i) => {
          const isRepeat = s.type === lastActionType && i === 0;
          return (
            <button
              key={`${s.type}-${i}`}
              onClick={() => onSelect(s)}
              className="group flex items-start gap-4 w-full text-left p-4 bg-card border border-border rounded-2xl hover:border-primary/50 hover:shadow-sm active:scale-[0.99] transition-all duration-150"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-base font-semibold font-caption text-foreground">{s.label}</p>
                  {isRepeat && (
                    <span className="text-xs font-caption px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold shrink-0">
                      La usaste antes
                    </span>
                  )}
                </div>
                <p className="text-sm font-caption text-muted-foreground mt-1 leading-snug">{s.tagline}</p>
                {s.hint && (
                  <p className="text-xs font-caption text-primary mt-1.5">{s.hint}</p>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
