import React from 'react';
import { Link } from 'react-router-dom';
import Image from 'components/AppImage';
import Icon from 'components/AppIcon';
import { ACTION_TYPE_LABELS } from '../../../lib/intentToSuggestion';

function UrgencyBadge({ hoursLeft, isUrgent }) {
  if (!isUrgent) return null;
  const label = hoursLeft >= 1 ? `${hoursLeft}h` : '< 1h';
  return (
    <span className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full text-xs font-caption font-bold text-white" style={{ background: '#ef4444' }}>
      <Icon name="Clock" size={10} color="white" />
      {label}
    </span>
  );
}

export default function ActionCard({ action }) {
  const formatted = action?._formatted || action;
  const coverUrl = formatted?.coverUrl || formatted?.cover_image_url;
  const typeLabel = ACTION_TYPE_LABELS[action?.action_type] || 'Acción';
  const business = action?.business;

  return (
    <Link
      to={`/acciones/${action?.slug}`}
      className="group flex flex-col h-full bg-card border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
    >
      {/* Cover */}
      <div className="relative aspect-[3/2] overflow-hidden bg-muted shrink-0">
        {coverUrl ? (
          <Image src={coverUrl} alt={action?.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <Icon name="Tag" size={36} color="var(--color-muted-foreground)" />
          </div>
        )}
        <span className="absolute top-2 left-2 px-2 py-1 text-xs font-caption font-medium rounded-lg bg-card/95 text-card-foreground backdrop-blur-sm">
          {typeLabel}
        </span>
        <UrgencyBadge hoursLeft={formatted?.hoursLeft} isUrgent={formatted?.isUrgent} />
        {action?.discount_display || formatted?.discountDisplay ? (
          <span className="absolute bottom-2 left-2 px-2 py-1 rounded-lg text-xs font-caption font-bold text-white" style={{ background: 'var(--color-primary)' }}>
            {action?.discount_display || formatted?.discountDisplay}
          </span>
        ) : null}
      </div>

      {/* Content */}
      <div className="p-3 flex flex-col flex-1">
        {business?.name && (
          <p className="text-xs font-caption text-muted-foreground mb-0.5">{business.name}</p>
        )}
        <h3 className="font-heading font-semibold text-sm text-card-foreground line-clamp-2 flex-1">{action?.title}</h3>

        <div className="mt-2 flex items-center gap-2">
          {action?.original_price && action?.promo_price && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-caption text-muted-foreground line-through">
                ${Number(action.original_price).toLocaleString('es-CL')}
              </span>
              <span className="text-sm font-data font-bold" style={{ color: 'var(--color-primary)' }}>
                ${Number(action.promo_price).toLocaleString('es-CL')}
              </span>
            </div>
          )}
        </div>

        <div className="mt-2 h-9 rounded-lg flex items-center justify-center text-xs font-caption font-semibold text-primary-foreground transition-opacity hover:opacity-90" style={{ background: 'var(--color-primary)' }}>
          Ver acción
        </div>
      </div>
    </Link>
  );
}
