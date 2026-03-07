import React from 'react';
import { Link } from 'react-router-dom';
import Icon from 'components/AppIcon';
import Image from 'components/AppImage';

export default function BusinessCard({ business }) {
  const category = business?.parentCategoryName || business?.subCategoryName || business?.category || '';
  const hasContact = business?.phone || business?.whatsapp;

  return (
    <article className={`flex flex-col h-full bg-card border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 ${business?.featured ? 'border-accent/50' : 'border-border'}`}>
      <div className="relative aspect-[3/2] overflow-hidden bg-muted shrink-0 rounded-t-2xl">
        <Image
          src={business?.image}
          alt={business?.imageAlt || business?.name}
          className="w-full h-full object-cover"
        />
        {business?.featured && (
          <span className="absolute top-2 left-2 px-2 py-1 text-xs font-caption font-semibold rounded-lg backdrop-blur-sm" style={{ background: 'var(--color-accent)', color: 'var(--color-accent-foreground)' }}>
            Destacado
          </span>
        )}
        {category && (
          <span className="absolute top-2 right-2 px-2 py-1 text-xs font-caption font-medium rounded-lg bg-card/95 text-card-foreground backdrop-blur-sm max-w-[50%] truncate">
            {category}
          </span>
        )}
      </div>
      <div className="p-3 flex flex-col flex-1 min-w-0">
        <h3 className="font-heading font-semibold text-base text-card-foreground line-clamp-1 mb-0.5">{business?.name}</h3>
        <p className="text-xs text-muted-foreground mb-3">Coronel</p>
        <div className="mt-auto flex flex-col gap-2">
          <Link
            to={`/business-profile-page?id=${business?.id}`}
            className="min-h-[44px] w-full inline-flex items-center justify-center px-4 rounded-xl text-sm font-caption font-semibold text-primary-foreground bg-primary hover:bg-primary/90 transition-colors"
          >
            Ver negocio
          </Link>
          {hasContact && (
            <div className="flex gap-2 min-w-0">
              {business?.phone && (
                <a
                  href={`tel:${business.phone}`}
                  className="flex-1 min-h-[44px] min-w-0 inline-flex items-center justify-center gap-2 px-3 rounded-xl border border-border text-sm font-caption font-semibold text-foreground hover:bg-muted transition-colors"
                  aria-label="Llamar"
                >
                  <Icon name="Phone" size={18} color="currentColor" className="shrink-0" />
                  <span>Llamar</span>
                </a>
              )}
              <a
                href={`https://wa.me/${(business?.whatsapp || business?.phone)?.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 min-h-[44px] min-w-0 inline-flex items-center justify-center gap-2 px-3 rounded-xl text-sm font-caption font-semibold text-white hover:opacity-90 transition-opacity"
                style={{ background: '#25D366' }}
                aria-label="WhatsApp"
              >
                <Icon name="MessageCircle" size={18} color="white" className="shrink-0" />
                <span>WhatsApp</span>
              </a>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}