import React from 'react';
import { Link } from 'react-router-dom';
import Icon from 'components/AppIcon';
import { businessService } from '../../../services/businessService';

const STATUS_CONFIG = {
  pending: { label: 'Pendiente', icon: 'Clock', bg: '#fef3c7', color: '#92400e' },
  published: { label: 'Publicado', icon: 'CheckCircle', bg: '#dcfce7', color: '#166534' },
  premium: { label: 'Premium', icon: 'Star', bg: '#ede9fe', color: '#5b21b6' },
  rejected: { label: 'Rechazado', icon: 'XCircle', bg: '#fee2e2', color: '#991b1b' },
};

export default function BusinessCard({ business, onEdit }) {
  const status = business?.status || 'pending';
  const statusCfg = STATUS_CONFIG?.[status] || STATUS_CONFIG?.pending;

  const primaryImg = business?.business_images?.find(img => img?.is_primary) || business?.business_images?.[0];
  const imageUrl = primaryImg?.storage_path
    ? businessService?.getImageUrl(primaryImg?.storage_path)
    : null;

  const premiumUntil = business?.premium_until
    ? new Date(business.premium_until)?.toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })
    : null;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
      {/* Image */}
      <div className="h-36 bg-muted flex items-center justify-center overflow-hidden relative">
        {imageUrl ? (
          <img src={imageUrl} alt={`${business?.name} - imagen`} className="w-full h-full object-cover" />
        ) : (
          <Icon name="Building2" size={40} color="var(--color-muted-foreground)" />
        )}
        {/* Status badge */}
        <div
          className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
          style={{ background: statusCfg?.bg, color: statusCfg?.color }}
        >
          <Icon name={statusCfg?.icon} size={12} color="currentColor" />
          {statusCfg?.label}
        </div>
      </div>
      {/* Content */}
      <div className="p-4">
        <h3 className="font-heading font-semibold text-foreground text-base mb-0.5 line-clamp-1">{business?.name}</h3>
        <p className="text-xs text-muted-foreground mb-1">{business?.category} · {business?.address}</p>

        {status === 'premium' && premiumUntil && (
          <p className="text-xs font-medium mb-2" style={{ color: '#5b21b6' }}>
            <Icon name="Star" size={11} color="currentColor" className="inline mr-1" />
            Premium hasta el {premiumUntil}
          </p>
        )}
        {status === 'pending' && (
          <p className="text-xs text-muted-foreground mb-2">En revisión por el equipo de CoronelLocal</p>
        )}
        {business?.rejection_reason && status === 'rejected' && (
          <p className="text-xs mb-2" style={{ color: '#991b1b' }}>Motivo: {business?.rejection_reason}</p>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={onEdit}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border hover:bg-muted transition-colors text-foreground"
          >
            <Icon name="Pencil" size={13} color="currentColor" />
            Editar
          </button>
          {status !== 'pending' && status !== 'rejected' && (
            <Link
              to={`/business-profile-page?id=${business?.id}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-colors"
              style={{ background: 'var(--color-primary)' }}
            >
              <Icon name="ExternalLink" size={13} color="white" />
              Ver en directorio
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
