import React from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from 'components/AppIcon';
import { isValidWalinkaCatalogUrl } from '../../../lib/walinka';

const PRICE_LABELS = {
  free_quote: 'Presupuesto gratuito',
  visit: 'Visita desde',
  from: 'Desde',
  hourly: 'Por hora',
  negotiable: 'A convenir',
};

export default function ProfesionalCard({ ad }) {
  const navigate = useNavigate();
  const phone = ad?.phone;
  const hasWhatsApp = !!ad?.whatsapp && !!phone;

  const priceLabel = PRICE_LABELS[ad?.price_type];
  const showPrice = ad?.price_type === 'from' || ad?.price_type === 'hourly' || ad?.price_type === 'visit';

  const trustChecks = [
    { active: ad?.available_urgency, label: 'Urgencias' },
    { active: ad?.weekend_service, label: 'Fines de semana' },
    { active: ad?.issues_invoice, label: 'Boleta' },
  ].filter(c => c.active);

  return (
    <div className="bg-card border border-border rounded-xl hover:shadow-lg hover:border-primary/40 transition-all duration-200 flex flex-col">

      {/* ── Header azul + avatar flotante ── */}
      <div className="relative">
        {/* Bloque azul — altura suficiente para respirar */}
        <div
          className="h-24 rounded-t-xl"
          style={{
            background: 'var(--color-primary)',
            backgroundImage: 'linear-gradient(135deg, var(--color-primary) 55%, rgba(0,0,0,0.18))',
          }}
        />

        {/* Avatar centrado, sobresale ~48 px hacia el cuerpo blanco */}
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 z-10 cursor-pointer"
          onClick={() => navigate(`/clasificados/${ad?.id}`)}
        >
          <div
            className="rounded-full overflow-hidden bg-white/20 flex items-center justify-center"
            style={{
              width: 96,
              height: 96,
              border: '4px solid white',
              boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
            }}
          >
            {ad?.image ? (
              <img
                src={ad.image}
                alt={ad.imageAlt || ad.providerLabel || ad.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <Icon name="User" size={40} color="var(--color-primary)" />
            )}
          </div>

          {/* Badge verificado sobre el avatar */}
          {ad?.provider_verified && (
            <div
              className="absolute bottom-0.5 right-0.5 w-6 h-6 rounded-full flex items-center justify-center"
              style={{ background: 'var(--color-success)', border: '2px solid white' }}
            >
              <Icon name="Check" size={12} color="white" />
            </div>
          )}
        </div>
      </div>

      {/* ── Nombre + oficio (debajo del avatar flotante) ── */}
      {/* pt-14 = 56 px para dejar paso al avatar que sobresale ~48 px */}
      <div className="pt-14 px-4 pb-2 flex flex-col items-center text-center gap-0.5">
        <h3
          className="font-heading font-bold text-foreground text-base leading-tight line-clamp-1 cursor-pointer hover:text-primary transition-colors"
          onClick={() => navigate(`/clasificados/${ad?.id}`)}
        >
          {ad?.providerLabel || ad?.title}
        </h3>
        {ad?.providerLabel && (
          <p className="text-sm font-caption text-muted-foreground line-clamp-1" style={{ color: 'var(--color-primary)' }}>
            {ad.title}
          </p>
        )}
      </div>

      {/* ── Resto del contenido ── */}
      <div className="px-3 pb-3 flex-1 flex flex-col gap-2.5">

        {/* Badges */}
        {(ad?.isNew || ad?.ratings_enabled || ad?.category || (ad?.walinka_enabled && isValidWalinkaCatalogUrl(ad?.walinka_catalog_url))) && (
          <div className="flex flex-wrap justify-center gap-1">
            {ad?.category && (
              <span className="text-xs font-caption px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                {ad.category}
              </span>
            )}
            {ad?.walinka_enabled && isValidWalinkaCatalogUrl(ad?.walinka_catalog_url) && (
              <span className="inline-flex items-center gap-1 text-xs font-caption px-2 py-0.5 rounded-full text-white" style={{ background: 'var(--color-primary)' }}>
                <Icon name="ShoppingBag" size={10} color="white" />
                Catálogo online
              </span>
            )}
            {ad?.isNew && (
              <span className="text-xs font-caption px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                🆕 Nuevo
              </span>
            )}
            {ad?.ratings_enabled && (
              <span
                className="inline-flex items-center gap-1 text-xs font-caption px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(56,161,105,0.12)', color: 'var(--color-success)' }}
              >
                <Icon name="ThumbsUp" size={10} color="currentColor" />
                Recomendaciones
              </span>
            )}
          </div>
        )}

        <div className="border-t border-border" />

        {/* Zonas */}
        {ad?.location && (
          <div className="flex items-start gap-1.5">
            <Icon name="MapPin" size={12} color="var(--color-secondary)" className="mt-0.5 shrink-0" />
            <span className="text-xs font-caption text-muted-foreground line-clamp-1">{ad.location}</span>
          </div>
        )}

        {/* Descripción */}
        {ad?.description && (
          <p className="text-xs font-body text-muted-foreground line-clamp-2">{ad.description}</p>
        )}

        {/* Checks de confianza */}
        {trustChecks.length > 0 && (
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {trustChecks.map(c => (
              <span key={c.label} className="flex items-center gap-1 text-xs font-caption text-muted-foreground">
                <Icon name="Check" size={11} color="var(--color-success)" />
                {c.label}
              </span>
            ))}
          </div>
        )}

        {/* Precio */}
        {ad?.price_type && priceLabel && (
          <div className="flex items-center gap-1.5">
            <Icon name="DollarSign" size={12} color="var(--color-secondary)" className="shrink-0" />
            <span className="text-xs font-caption text-foreground">
              <span className="font-medium">{priceLabel}</span>
              {showPrice && ad?.price && (
                <span className="font-bold ml-0.5" style={{ color: 'var(--color-primary)' }}>
                  {' '}${Number(ad.price).toLocaleString('es-CL')}
                </span>
              )}
            </span>
          </div>
        )}

        {/* Acciones */}
        <div className="mt-auto flex gap-1.5 pt-1">
          {hasWhatsApp ? (
            <a
              href={`https://wa.me/${String(phone).replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-caption font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: '#25d366' }}
            >
              <Icon name="MessageCircle" size={13} color="white" />
              WhatsApp
            </a>
          ) : phone ? (
            <a
              href={`tel:${phone}`}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-caption font-semibold border border-border bg-muted hover:bg-primary hover:text-primary-foreground transition-all"
            >
              <Icon name="Phone" size={13} color="currentColor" />
              Llamar
            </a>
          ) : null}
          <button
            onClick={() => navigate(`/clasificados/${ad?.id}`)}
            className="px-3 py-2 rounded-md text-xs font-caption font-medium border border-border bg-card hover:bg-muted transition-colors shrink-0"
          >
            Ver perfil
          </button>
        </div>

      </div>
    </div>
  );
}
