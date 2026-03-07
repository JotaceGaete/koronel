import React from 'react';
import { Link } from 'react-router-dom';
import Icon from 'components/AppIcon';
import Image from 'components/AppImage';
import Button from 'components/ui/Button';

export default function AdCard({ ad }) {
  const formatPrice = (price) => {
    if (!price) return 'Precio a convenir';
    return `$${price?.toLocaleString('es-CL')}`;
  };

  const handleWhatsApp = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    window.open(`https://wa.me/56${ad?.phone}?text=Hola, vi tu aviso "${ad?.title}" en CoronelLocal`, '_blank');
  };

  const handleCall = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    window.location.href = `tel:+56${ad?.phone}`;
  };

  return (
    <Link
      to={`/clasificados/${ad?.id}`}
      className="block bg-card border border-border rounded-md overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-250 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group relative"
    >
      {ad?.featured && (
        <span
          className="absolute top-2 left-2 z-10 px-2 py-0.5 text-xs font-caption font-semibold rounded-sm"
          style={{ background: 'var(--color-accent)', color: 'var(--color-accent-foreground)' }}
        >
          Destacado
        </span>
      )}
      <div className="relative h-44 overflow-hidden bg-muted">
        <Image
          src={ad?.image}
          alt={ad?.imageAlt}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-250"
        />
        <span
          className="absolute top-2 right-2 px-2 py-0.5 text-xs font-caption rounded-sm bg-card border border-border text-card-foreground"
        >
          {ad?.condition}
        </span>
      </div>
      <div className="p-3 md:p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-heading font-semibold text-sm md:text-base text-card-foreground line-clamp-2 leading-snug flex-1">
            {ad?.title}
          </h3>
        </div>
        <p className="text-base md:text-lg font-data font-bold mb-2" style={{ color: 'var(--color-primary)' }}>
          {formatPrice(ad?.price)}
        </p>
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-caption rounded-sm"
            style={{ background: 'var(--color-muted)', color: 'var(--color-secondary)' }}
          >
            <Icon name="Tag" size={11} color="currentColor" />
            {ad?.category}
          </span>
          <span className="flex items-center gap-1 text-xs font-caption text-muted-foreground">
            <Icon name="MapPin" size={11} color="currentColor" />
            {ad?.location}
          </span>
          <span className="flex items-center gap-1 text-xs font-caption text-muted-foreground ml-auto whitespace-nowrap">
            <Icon name="Clock" size={11} color="currentColor" />
            {ad?.timeAgo}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            iconName="Phone"
            iconPosition="left"
            iconSize={14}
            onClick={handleCall}
            className="flex-1 text-xs"
          >
            Llamar
          </Button>
          <Button
            variant="default"
            size="sm"
            iconName="MessageCircle"
            iconPosition="left"
            iconSize={14}
            onClick={handleWhatsApp}
            className="flex-1 text-xs"
          >
            WhatsApp
          </Button>
        </div>
      </div>
    </Link>
  );
}