import React from 'react';
import { Link } from 'react-router-dom';
import Icon from 'components/AppIcon';
import Image from 'components/AppImage';
import { useCity } from 'contexts/CityContext';
import { getDirectionsUrl } from '../../../utils/nearbyLocation';
import { getBusinessCatalogUrl } from '../../../utils/walinkaCatalog';
import { getCategoryLabel } from '../../../utils/businessCategoryFilter';

const CATEGORY_CONFIG = {
  supermercados: { label: 'Supermercados', color: '#0891b2', bg: '#e0f2fe' },
  farmacias: { label: 'Farmacias', color: '#059669', bg: '#d1fae5' },
  restaurantes: { label: 'Restaurantes', color: '#d97706', bg: '#fef3c7' },
  'iglesias-templos': { label: 'Iglesias', color: '#7c3aed', bg: '#f3e8ff' },
  ferreterias: { label: 'Ferreterías', color: '#dc2626', bg: '#fee2e2' },
};

export default function BusinessBottomSheet({ business, onClose }) {
  const CITY_CONFIG = useCity();
  if (!business) return null;

  const cat = CATEGORY_CONFIG?.[business?.category_key] || { label: getCategoryLabel(business?.category, ''), color: '#6b7280', bg: '#f3f4f6' };
  const directionsUrl = business?.directionsUrl || getDirectionsUrl(business?.lat, business?.lng);
  const catalogUrl = getBusinessCatalogUrl(business);

  const handleWhatsApp = () => {
    if (!business?.phone) return;
    const phone = business?.phone?.replace(/\D/g, '');
    const msg = encodeURIComponent(`Hola, vi ${business?.name} en ${CITY_CONFIG.siteName} y me gustaría más información.`);
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Handle bar (mobile) */}
      <div className="flex justify-center pt-2 pb-1 md:hidden">
        <div className="w-10 h-1 rounded-full" style={{ background: 'var(--color-border)' }} />
      </div>

      {/* Header */}
      <div className="flex items-start justify-between px-4 pt-2 pb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ background: cat?.bg, color: cat?.color }}
            >
              {cat?.label}
            </span>
          </div>
          <h3 className="font-heading font-bold text-foreground text-base leading-tight truncate">
            {business?.name}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="ml-2 p-1.5 rounded-full hover:bg-muted transition-colors shrink-0"
          aria-label="Cerrar"
        >
          <Icon name="X" size={16} color="currentColor" />
        </button>
      </div>

      {/* Image */}
      {business?.image_url && (
        <div className="mx-4 mb-3 rounded-lg overflow-hidden" style={{ height: '120px' }}>
          <Image
            src={business?.image_url}
            alt={`Foto de ${business?.name}`}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Info */}
      <div className="px-4 space-y-2 flex-1">
        {business?.address && (
          <div className="flex items-start gap-2">
            <Icon name="MapPin" size={14} color="var(--color-primary)" className="mt-0.5 shrink-0" />
            <span className="text-sm text-muted-foreground">{business?.address}</span>
          </div>
        )}
        {business?.distanceLabel && (
          <div className="flex items-center gap-2">
            <Icon name="Navigation" size={14} color="var(--color-primary)" />
            <span className="text-sm text-muted-foreground">{business?.distanceLabel}</span>
          </div>
        )}
        {business?.phone && (
          <div className="flex items-center gap-2">
            <Icon name="Phone" size={14} color="var(--color-primary)" />
            <a href={`tel:${business?.phone}`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {business?.phone}
            </a>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 pt-3 pb-4 space-y-2">
        {catalogUrl && (
          <a
            href={catalogUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium text-white transition-colors"
            style={{ background: 'var(--color-primary)' }}
          >
            <Icon name="ShoppingBag" size={15} color="currentColor" />
            Ver catálogo
          </a>
        )}
        <div className="flex gap-2">
          {business?.phone && (
            <button
              onClick={handleWhatsApp}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium text-white transition-colors"
              style={{ background: '#25d366' }}
            >
              <Icon name="MessageCircle" size={15} color="white" />
              WhatsApp
            </button>
          )}
          <Link
            to={`/negocios/${business?.id}`}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium border border-border hover:bg-muted transition-colors text-foreground"
          >
            <Icon name="ExternalLink" size={15} color="currentColor" />
            Ver detalles
          </Link>
          {directionsUrl && (
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium border border-border hover:bg-muted transition-colors text-foreground"
            >
              <Icon name="Route" size={15} color="currentColor" />
              Cómo llegar
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
