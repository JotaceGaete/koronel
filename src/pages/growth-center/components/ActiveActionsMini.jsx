import React from 'react';
import { Link } from 'react-router-dom';
import Icon from 'components/AppIcon';
import { ACTION_TYPE_LABELS } from '../../../lib/intentToSuggestion';

function countdown(endsAt) {
  const ms = new Date(endsAt) - Date.now();
  if (ms <= 0) return 'Expirada';
  const h = Math.floor(ms / 3600000);
  const d = Math.floor(ms / 86400000);
  if (d >= 2) return `${d} días`;
  if (h >= 1) return `${h}h`;
  const m = Math.floor(ms / 60000);
  return `${m}m`;
}

function ActionRow({ action }) {
  const timeLeft = countdown(action?.ends_at);
  const isUrgent = new Date(action?.ends_at) - Date.now() < 48 * 3600000;
  const typeLabel = ACTION_TYPE_LABELS[action?.action_type] || action?.action_type;

  return (
    <div className="flex items-center gap-3 py-3 border-b border-border last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold font-heading text-foreground line-clamp-1">{action?.title}</p>
        <p className="text-xs font-caption text-muted-foreground mt-0.5">{typeLabel}</p>
      </div>
      <div className="shrink-0 text-right">
        <span className={`text-xs font-caption font-semibold ${isUrgent ? 'text-red-500' : 'text-muted-foreground'}`}>
          {isUrgent && <Icon name="Clock" size={10} className="inline mr-0.5" />}
          {timeLeft}
        </span>
        <p className="text-xs text-muted-foreground mt-0.5">
          {action?.views || 0} vistas
        </p>
      </div>
    </div>
  );
}

export default function ActiveActionsMini({ actions, loading }) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2].map(i => <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />)}
      </div>
    );
  }

  if (!actions?.length) {
    return (
      <div className="py-6 text-center">
        <p className="text-sm font-caption text-muted-foreground">No tienes acciones activas.</p>
        <Link
          to="/crecer/nueva"
          className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold font-caption text-primary"
        >
          <Icon name="Plus" size={14} />
          Crear tu primera acción
        </Link>
      </div>
    );
  }

  return (
    <div>
      {actions.slice(0, 5).map(a => <ActionRow key={a.id} action={a} />)}
      {actions.length > 5 && (
        <Link
          to="/crecer/acciones"
          className="mt-2 flex items-center gap-1 text-xs font-caption text-primary font-semibold"
        >
          Ver todas ({actions.length}) <Icon name="ChevronRight" size={12} />
        </Link>
      )}
    </div>
  );
}
