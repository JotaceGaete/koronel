import React from 'react';
import Icon from 'components/AppIcon';

const PRICE_TYPE_LABELS = {
  free_quote: 'Presupuesto gratuito',
  visit: 'Visita desde',
  from: 'Desde',
  hourly: 'Por hora',
  negotiable: 'A convenir',
};

export default function OficioPreviewCard({ form, profilePhoto, portfolioPhotos }) {
  const hasContent = form.providerName || form.title || form.category || form.description;
  const providerLabel = form.providerDisplayName?.trim()
    || [form.providerName, form.providerLastName]?.filter(Boolean)?.join(' ')?.trim()
    || null;

  if (!hasContent) {
    return (
      <div className="bg-card border border-dashed border-border rounded-xl p-8 text-center">
        <Icon name="User" size={40} color="var(--color-muted-foreground)" className="mx-auto mb-3" />
        <p className="text-sm font-caption text-muted-foreground">
          A medida que completes el formulario,<br />tu ficha irá apareciendo aquí.
        </p>
      </div>
    );
  }

  const allZones = [
    ...(form.zones || []),
    ...(form.otherZones ? form.otherZones.split(',').map(z => z.trim()).filter(Boolean) : []),
  ];

  const priceLabel = PRICE_TYPE_LABELS[form.priceType];
  const showPrice = form.priceType === 'from' || form.priceType === 'hourly' || form.priceType === 'visit';

  const trustChecks = [
    { active: form.availableUrgency, label: 'Atiende urgencias' },
    { active: form.weekendService, label: 'Trabaja fines de semana' },
    { active: form.issuesInvoice, label: 'Boleta disponible' },
  ].filter(c => c.active);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
      {/* 1-2-3: Foto + Nombre + Oficio */}
      <div className="p-5 flex flex-col items-center text-center gap-3" style={{ background: 'var(--color-primary)', backgroundImage: 'linear-gradient(135deg, var(--color-primary) 60%, rgba(0,0,0,0.15))' }}>
        <div className="w-20 h-20 rounded-full border-3 border-white overflow-hidden bg-white/20 flex items-center justify-center shrink-0"
          style={{ borderWidth: 3, borderColor: 'rgba(255,255,255,0.8)' }}>
          {profilePhoto ? (
            <img src={profilePhoto.url} alt={profilePhoto.alt} className="w-full h-full object-cover" />
          ) : (
            <Icon name="User" size={36} color="white" />
          )}
        </div>
        <div>
          <h3 className="font-heading font-bold text-white text-lg leading-tight line-clamp-1">
            {providerLabel || 'Tu nombre'}
          </h3>
          <p className="text-white/90 text-sm font-caption mt-0.5 line-clamp-1">
            {form.title || 'Tu oficio'}
          </p>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* 4: Badges de confianza */}
        <div className="flex flex-wrap gap-1.5">
          {form.category && (
            <span className="inline-block text-xs font-caption font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {form.category}
            </span>
          )}
          {form.ratingsEnabled && (
            <span className="inline-flex items-center gap-1 text-xs font-caption font-medium px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(56,161,105,0.12)', color: 'var(--color-success)' }}>
              <Icon name="ThumbsUp" size={11} color="currentColor" />
              Acepta recomendaciones
            </span>
          )}
        </div>

        {/* 5: Zonas */}
        {allZones.length > 0 && (
          <div className="flex items-start gap-2 pt-1 border-t border-border">
            <Icon name="MapPin" size={14} color="var(--color-secondary)" className="mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-caption font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Atiende en</p>
              <p className="text-sm font-caption text-foreground">{allZones.join(' · ')}</p>
            </div>
          </div>
        )}

        {/* 6: Descripción */}
        {form.description && (
          <p className="text-sm font-body text-muted-foreground line-clamp-3 pt-1 border-t border-border">
            {form.description}
          </p>
        )}

        {/* Checks de confianza */}
        {trustChecks.length > 0 && (
          <div className="pt-1 border-t border-border space-y-1">
            {trustChecks.map(c => (
              <div key={c.label} className="flex items-center gap-1.5">
                <Icon name="Check" size={13} color="var(--color-success)" className="shrink-0" />
                <span className="text-sm font-caption text-foreground">{c.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Horario */}
        {form.scheduleNote && (
          <div className="flex items-start gap-2">
            <Icon name="Clock" size={14} color="var(--color-secondary)" className="mt-0.5 shrink-0" />
            <p className="text-sm font-caption text-foreground">{form.scheduleNote}</p>
          </div>
        )}

        {/* 7: Precio */}
        {form.priceType && (
          <div className="flex items-center gap-2 pt-1 border-t border-border">
            <Icon name="DollarSign" size={14} color="var(--color-secondary)" className="shrink-0" />
            <p className="text-sm font-caption text-foreground">
              <span className="font-medium">{priceLabel}</span>
              {showPrice && form.price && (
                <span className="font-bold" style={{ color: 'var(--color-primary)' }}> ${form.price}</span>
              )}
            </p>
          </div>
        )}

        {/* 8: Portfolio */}
        {portfolioPhotos?.length > 0 && (
          <div className="pt-2 border-t border-border">
            <p className="text-xs font-caption font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Trabajos realizados
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {portfolioPhotos.slice(0, 3).map(photo => (
                <div key={photo.id} className="aspect-square rounded overflow-hidden bg-muted">
                  <img src={photo.url} alt={photo.alt} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 9: CTA contacto */}
        <div className="flex gap-2 pt-2">
          {form.whatsapp && form.phone ? (
            <div className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-caption font-semibold text-white"
              style={{ background: '#25d366' }}>
              <Icon name="MessageCircle" size={16} color="white" />
              WhatsApp
            </div>
          ) : form.phone ? (
            <div className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-caption font-semibold border border-border bg-muted text-foreground">
              <Icon name="Phone" size={16} color="currentColor" />
              Llamar
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center py-2.5 rounded-md text-sm font-caption text-muted-foreground border border-dashed border-border">
              Agrega tu número de contacto
            </div>
          )}
        </div>
      </div>

      <div className="px-4 py-2 border-t border-border bg-muted text-center">
        <p className="text-xs font-caption text-muted-foreground">Vista previa — así verán tu ficha</p>
      </div>
    </div>
  );
}
