import React from 'react';
import Icon from 'components/AppIcon';
import Image from 'components/AppImage';

const CATEGORY_CONFIG = {
  church: { label: 'Iglesia', color: '#7c3aed', bg: '#f3e8ff' },
  courses: { label: 'Cursos', color: '#0891b2', bg: '#e0f2fe' },
  meetups: { label: 'Encuentros', color: '#059669', bg: '#d1fae5' },
  other: { label: 'Otro', color: '#d97706', bg: '#fef3c7' },
};

export default function EventPreviewPanel({ formData, photo }) {
  const cat = CATEGORY_CONFIG?.[formData?.category];

  const formatDate = (dtStr) => {
    if (!dtStr) return null;
    try {
      const d = new Date(dtStr);
      return d?.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' });
    } catch { return null; }
  };

  const formatTime = (dtStr) => {
    if (!dtStr) return null;
    try {
      const d = new Date(dtStr);
      return d?.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
    } catch { return null; }
  };

  const hasContent = formData?.title || formData?.startDatetime || formData?.venueName;

  return (
    <div className="sticky top-24">
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <Icon name="Eye" size={16} color="var(--color-primary)" />
          <span className="text-sm font-caption font-semibold text-foreground">Vista previa</span>
          <span className="ml-auto text-xs text-muted-foreground">Así se verá tu evento</span>
        </div>

        {!hasContent ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: 'var(--color-muted)' }}>
              <Icon name="CalendarDays" size={22} color="var(--color-muted-foreground)" />
            </div>
            <p className="text-sm text-muted-foreground">Completa el formulario para ver la vista previa</p>
          </div>
        ) : (
          <div>
            {/* Image */}
            <div className="relative" style={{ aspectRatio: '16/7', background: 'var(--color-muted)' }}>
              {photo?.url ? (
                <Image src={photo?.url} alt={photo?.alt || 'Imagen del evento'} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Icon name="Image" size={32} color="var(--color-muted-foreground)" />
                </div>
              )}
              {cat && (
                <span
                  className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-caption font-semibold"
                  style={{ background: cat?.bg, color: cat?.color }}
                >
                  {cat?.label}
                </span>
              )}
            </div>

            {/* Content */}
            <div className="p-4 space-y-2">
              <h3 className="font-heading font-semibold text-foreground text-base leading-snug line-clamp-2">
                {formData?.title || 'Título del evento'}
              </h3>

              {formData?.startDatetime && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Icon name="Calendar" size={14} color="var(--color-primary)" />
                  <span>{formatDate(formData?.startDatetime)}</span>
                  {formatTime(formData?.startDatetime) && (
                    <>
                      <span>·</span>
                      <Icon name="Clock" size={14} color="currentColor" />
                      <span>{formatTime(formData?.startDatetime)}</span>
                    </>
                  )}
                </div>
              )}

              {formData?.venueName && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Icon name="MapPin" size={14} color="var(--color-primary)" />
                  <span className="truncate">{formData?.venueName}</span>
                </div>
              )}

              {formData?.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 pt-1">
                  {formData?.description}
                </p>
              )}

              <div className="pt-2 border-t border-border">
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-caption" style={{ background: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}>
                  <Icon name="Clock" size={11} color="currentColor" />
                  Pendiente de aprobación
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="mt-4 p-4 rounded-lg border border-border" style={{ background: 'var(--color-muted)' }}>
        <div className="flex items-start gap-2">
          <Icon name="Info" size={16} color="var(--color-primary)" className="mt-0.5 shrink-0" />
          <div className="text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">¿Cómo funciona?</p>
            <p>Tu evento será revisado por nuestro equipo antes de publicarse.</p>
            <p>El proceso de aprobación toma entre 24 y 48 horas hábiles.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
