import React from 'react';
import { Link } from 'react-router-dom';
import Icon from 'components/AppIcon';
import Image from 'components/AppImage';
import { mapService } from '../../../services/mapService';

const CATEGORY_CONFIG = {
  church: { label: 'Iglesia', color: '#7c3aed', bg: '#f3e8ff' },
  courses: { label: 'Cursos', color: '#0891b2', bg: '#e0f2fe' },
  meetups: { label: 'Encuentros', color: '#059669', bg: '#d1fae5' },
  other: { label: 'Otro', color: '#d97706', bg: '#fef3c7' },
};

export default function EventBottomSheet({ event, onClose }) {
  if (!event) return null;

  const cat = CATEGORY_CONFIG?.[event?.category] || { label: event?.category || '', color: '#6b7280', bg: '#f3f4f6' };

  const handleWhatsApp = () => {
    if (!event?.contact_whatsapp) return;
    const phone = event?.contact_whatsapp?.replace(/\D/g, '');
    const msg = encodeURIComponent(`Hola, vi el evento "${event?.title}" en CoronelLocal y me gustaría más información.`);
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  };

  const dateStr = mapService?.formatEventDate(event?.start_datetime);
  const timeStr = mapService?.formatEventTime(event?.start_datetime);

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
            <span className="text-xs text-muted-foreground">Evento</span>
          </div>
          <h3 className="font-heading font-bold text-foreground text-base leading-tight line-clamp-2">
            {event?.title}
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
      {event?.image_url && (
        <div className="mx-4 mb-3 rounded-lg overflow-hidden" style={{ height: '110px' }}>
          <Image
            src={event?.image_url}
            alt={`Imagen del evento: ${event?.title}`}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Info */}
      <div className="px-4 space-y-2 flex-1">
        {(dateStr || timeStr) && (
          <div className="flex items-center gap-2">
            <Icon name="Calendar" size={14} color="var(--color-primary)" />
            <span className="text-sm text-muted-foreground">
              {dateStr}{timeStr ? ` · ${timeStr}` : ''}
            </span>
          </div>
        )}
        {event?.venue_name && (
          <div className="flex items-start gap-2">
            <Icon name="MapPin" size={14} color="var(--color-primary)" className="mt-0.5 shrink-0" />
            <div>
              <span className="text-sm text-foreground font-medium">{event?.venue_name}</span>
              {event?.displayAddress && (
                <p className="text-xs text-muted-foreground">{event?.displayAddress}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 pt-3 pb-4 flex gap-2">
        {event?.contact_whatsapp && (
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
          to={`/eventos/${event?.id}`}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium border border-border hover:bg-muted transition-colors text-foreground"
        >
          <Icon name="ExternalLink" size={15} color="currentColor" />
          Ver detalles
        </Link>
      </div>
    </div>
  );
}
