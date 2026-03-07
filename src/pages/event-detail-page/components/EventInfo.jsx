import React from 'react';
import { Link } from 'react-router-dom';
import Icon from 'components/AppIcon';

function formatDateTime(dt) {
  if (!dt) return '';
  const d = new Date(dt);
  return d?.toLocaleString('es-CL', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function EventInfo({ event }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
      <h1 className="font-heading font-bold text-xl md:text-2xl text-foreground leading-tight">
        {event?.title}
      </h1>

      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-primary)/10' }}>
            <Icon name="CalendarDays" size={16} color="var(--color-primary)" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Inicio</p>
            <p className="text-sm font-medium text-foreground capitalize">{formatDateTime(event?.startDatetime)}</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-primary)/10' }}>
            <Icon name="CalendarCheck" size={16} color="var(--color-primary)" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Fin</p>
            <p className="text-sm font-medium text-foreground capitalize">{formatDateTime(event?.endDatetime)}</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-primary)/10' }}>
            <Icon name="MapPin" size={16} color="var(--color-primary)" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Lugar</p>
            <p className="text-sm font-semibold text-foreground">{event?.venueName}</p>
            <p className="text-xs text-muted-foreground">{event?.address}</p>
          </div>
        </div>

        {event?.organizer && (
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-primary)/10' }}>
              <Icon name="Building2" size={16} color="var(--color-primary)" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Organizador</p>
              <Link
                to={`/business-profile-page?id=${event?.organizer?.id}`}
                className="text-sm font-semibold text-primary hover:underline"
              >
                {event?.organizer?.name}
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
