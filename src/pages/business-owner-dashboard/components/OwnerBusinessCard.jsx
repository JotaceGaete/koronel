import React from 'react';
import { Link } from 'react-router-dom';
import Icon from 'components/AppIcon';
import { businessService } from '../../../services/businessService';

const STATUS_CONFIG = {
  published: { label: 'Publicado', color: '#16a34a', bg: '#dcfce7' },
  premium: { label: 'Premium', color: '#7c3aed', bg: '#ede9fe' },
  pending: { label: 'Pendiente', color: '#d97706', bg: '#fef3c7' },
  rejected: { label: 'Rechazado', color: '#dc2626', bg: '#fee2e2' },
};

export default function OwnerBusinessCard({ business, onEdit }) {
  const primaryImage = business?.business_images?.find(img => img?.is_primary) || business?.business_images?.[0];
  const imageUrl = primaryImage ? businessService?.getImageUrl(primaryImage?.storage_path) : null;
  const status = STATUS_CONFIG?.[business?.status] || STATUS_CONFIG?.pending;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Business Header */}
      <div className="flex items-start gap-3 p-4">
        <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 border border-border bg-muted flex items-center justify-center">
          {imageUrl ? (
            <img src={imageUrl} alt={`Logo de ${business?.name}`} className="w-full h-full object-cover" />
          ) : (
            <Icon name="Building2" size={24} color="var(--color-muted-foreground)" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-heading font-semibold text-foreground text-sm leading-tight truncate">{business?.name}</h3>
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0"
              style={{ background: status?.bg, color: status?.color }}
            >
              {status?.label}
            </span>
          </div>
          {business?.category_key && (
            <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {business?.category_key}
            </span>
          )}
          {business?.address && (
            <p className="text-xs text-muted-foreground mt-1 truncate">{business?.address}</p>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="flex items-center gap-0 border-t border-border">
        <div className="flex-1 flex flex-col items-center py-3 border-r border-border">
          <div className="flex items-center gap-1 text-primary">
            <Icon name="Eye" size={14} color="currentColor" />
            <span className="font-heading font-bold text-sm">{business?.profile_visits || 0}</span>
          </div>
          <span className="text-xs text-muted-foreground mt-0.5">Visitas</span>
        </div>
        <div className="flex-1 flex flex-col items-center py-3 border-r border-border">
          <div className="flex items-center gap-1" style={{ color: 'var(--color-accent)' }}>
            <Icon name="Phone" size={14} color="currentColor" />
            <span className="font-heading font-bold text-sm">{business?.contacts_count || 0}</span>
          </div>
          <span className="text-xs text-muted-foreground mt-0.5">Contactos</span>
        </div>
        <div className="flex-1 flex flex-col items-center py-3">
          <div className="flex items-center gap-1" style={{ color: '#f59e0b' }}>
            <Icon name="Star" size={14} color="currentColor" />
            <span className="font-heading font-bold text-sm">{business?.rating ? parseFloat(business?.rating)?.toFixed(1) : '—'}</span>
          </div>
          <span className="text-xs text-muted-foreground mt-0.5">{business?.review_count || 0} reseñas</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 p-3 border-t border-border">
        <button
          onClick={() => onEdit(business)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium border border-border rounded-lg hover:bg-muted transition-colors"
        >
          <Icon name="Pencil" size={14} color="currentColor" />
          Editar
        </button>
        {business?.status !== 'pending' && (
          <Link
            to={`/business-profile-page?id=${business?.id}`}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-lg text-white transition-colors"
            style={{ background: 'var(--color-primary)' }}
          >
            <Icon name="ExternalLink" size={14} color="white" />
            Ver en directorio
          </Link>
        )}
      </div>
    </div>
  );
}
