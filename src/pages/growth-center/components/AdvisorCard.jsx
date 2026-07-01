import React from 'react';
import Icon from 'components/AppIcon';

export default function AdvisorCard({ event, onCreateAction, onDismiss }) {
  if (!event) return null;

  const daysLeft = Math.ceil((new Date(event.date) - new Date()) / 86400000);
  const label = daysLeft <= 1 ? 'Es hoy' : daysLeft <= 7 ? `En ${daysLeft} días` : `En ${Math.ceil(daysLeft / 7)} semana${daysLeft > 13 ? 's' : ''}`;

  return (
    <div className="bg-card border border-primary/20 rounded-2xl p-4">
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'var(--color-primary)' }}>
          <Icon name="Lightbulb" size={18} color="white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="text-sm font-semibold font-heading text-foreground">Oportunidad</p>
            <span className="text-xs font-caption px-2 py-0.5 rounded-full bg-primary/10 text-primary">{label}</span>
          </div>
          <p className="text-sm font-caption text-foreground/80">
            Se acerca el <strong>{event.name}</strong>.
            {event.description ? ` ${event.description}.` : ''}
            {' '}¿Quieres preparar una acción?
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={onCreateAction}
              className="flex-1 h-9 rounded-lg text-sm font-caption font-semibold text-primary-foreground transition-colors hover:opacity-90"
              style={{ background: 'var(--color-primary)' }}
            >
              Crear acción
            </button>
            <button
              onClick={onDismiss}
              className="h-9 px-4 rounded-lg text-sm font-caption text-muted-foreground border border-border hover:bg-muted transition-colors"
            >
              Ahora no
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
