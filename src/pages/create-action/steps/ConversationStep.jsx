import React from 'react';

const SITUATIONS = [
  {
    key: 'low_traffic',
    emoji: '📉',
    label: 'Hoy entró poca gente.',
    subtext: 'Necesito más clientes ahora.',
  },
  {
    key: 'excess_stock',
    emoji: '📦',
    label: 'Tengo productos que no se venden.',
    subtext: 'Quiero mover stock rápido.',
  },
  {
    key: 'new_customers',
    emoji: '👥',
    label: 'Quiero que más personas me conozcan.',
    subtext: 'Mi negocio necesita más visibilidad.',
  },
  {
    key: 'event',
    emoji: '🎉',
    label: 'Tengo un evento o lanzamiento.',
    subtext: 'Quiero invitar a la comunidad.',
  },
  {
    key: 'idea',
    emoji: '💡',
    label: 'Tengo una idea.',
    subtext: 'Sé lo que quiero publicar.',
  },
];

export default function ConversationStep({ businessName, onSelect }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';
  const name = businessName?.split(' ')?.[0] || '';

  return (
    <div className="flex flex-col min-h-[70vh]">
      {/* Greeting */}
      <div className="mb-8">
        <p className="text-muted-foreground text-base font-caption mb-1">{greeting}{name ? `, ${name}` : ''}.</p>
        <h1 className="font-heading font-bold text-2xl text-foreground leading-snug">
          ¿Qué está pasando<br />hoy en tu negocio?
        </h1>
      </div>

      {/* Options */}
      <div className="flex flex-col gap-3 flex-1">
        {SITUATIONS.map((s) => (
          <button
            key={s.key}
            onClick={() => onSelect(s.key)}
            className="group flex items-center gap-4 w-full text-left p-4 bg-card border border-border rounded-2xl hover:border-primary/50 hover:shadow-sm active:scale-[0.99] transition-all duration-150"
          >
            <span className="text-2xl shrink-0 leading-none">{s.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-base font-semibold font-caption text-foreground leading-tight">{s.label}</p>
              <p className="text-sm font-caption text-muted-foreground mt-0.5">{s.subtext}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
