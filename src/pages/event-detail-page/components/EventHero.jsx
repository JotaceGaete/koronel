import React from 'react';
import Icon from 'components/AppIcon';

const CATEGORY_CONFIG = {
  church: { label: 'Iglesia', color: 'bg-purple-100 text-purple-700' },
  courses: { label: 'Cursos', color: 'bg-blue-100 text-blue-700' },
  meetups: { label: 'Encuentros', color: 'bg-green-100 text-green-700' },
  other: { label: 'Otro', color: 'bg-gray-100 text-gray-600' },
};

export default function EventHero({ event }) {
  const cat = CATEGORY_CONFIG?.[event?.category] || CATEGORY_CONFIG?.other;

  return (
    <div className="relative w-full rounded-xl overflow-hidden bg-muted" style={{ minHeight: '280px', maxHeight: '420px' }}>
      {event?.imageUrl ? (
        <img
          src={event?.imageUrl}
          alt={`${event?.title} - evento en ${event?.venueName}, Coronel`}
          className="w-full h-full object-cover"
          style={{ maxHeight: '420px', minHeight: '280px' }}
        />
      ) : (
        <div className="w-full flex items-center justify-center" style={{ height: '280px', background: 'var(--color-muted)' }}>
          <Icon name="Calendar" size={64} color="var(--color-muted-foreground)" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      <div className="absolute bottom-4 left-4 flex items-center gap-2">
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${cat?.color}`}>{cat?.label}</span>
        {event?.isFeatured && (
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-400 text-amber-900">
            <Icon name="Star" size={11} color="currentColor" />
            Destacado
          </span>
        )}
      </div>
    </div>
  );
}
