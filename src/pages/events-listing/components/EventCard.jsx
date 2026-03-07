import React from 'react';
import { Link } from 'react-router-dom';
import Icon from 'components/AppIcon';

const CATEGORY_CONFIG = {
  church: { label: 'Iglesia', color: 'bg-purple-100 text-purple-700', icon: 'Church' },
  courses: { label: 'Cursos', color: 'bg-blue-100 text-blue-700', icon: 'BookOpen' },
  meetups: { label: 'Encuentros', color: 'bg-green-100 text-green-700', icon: 'Users' },
  other: { label: 'Otro', color: 'bg-gray-100 text-gray-600', icon: 'Calendar' },
};

function formatDate(dt) {
  if (!dt) return '';
  const d = new Date(dt);
  return d?.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatTime(dt) {
  if (!dt) return '';
  const d = new Date(dt);
  return d?.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
}

export default function EventCard({ event }) {
  const cat = CATEGORY_CONFIG?.[event?.category] || CATEGORY_CONFIG?.other;

  return (
    <Link
      to={`/eventos/${event?.id}`}
      className="group block bg-card border border-border rounded-xl overflow-hidden hover:shadow-md hover:border-primary/30 transition-all duration-200"
    >
      {/* Image */}
      <div className="relative h-44 overflow-hidden bg-muted">
        {event?.imageUrl ? (
          <img
            src={event?.imageUrl}
            alt={`${event?.title} - evento en ${event?.venueName}`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--color-muted)' }}>
            <Icon name="Calendar" size={40} color="var(--color-muted-foreground)" />
          </div>
        )}
        {/* Featured badge */}
        {event?.isFeatured && (
          <span className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-400 text-amber-900">
            <Icon name="Star" size={11} color="currentColor" />
            Destacado
          </span>
        )}
        {/* Category badge */}
        <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-medium ${cat?.color}`}>
          {cat?.label}
        </span>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-heading font-semibold text-sm text-foreground line-clamp-2 mb-2 group-hover:text-primary transition-colors">
          {event?.title}
        </h3>
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Icon name="Calendar" size={13} color="currentColor" />
            <span>{formatDate(event?.startDatetime)} · {formatTime(event?.startDatetime)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Icon name="MapPin" size={13} color="currentColor" />
            <span className="truncate">{event?.venueName}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
