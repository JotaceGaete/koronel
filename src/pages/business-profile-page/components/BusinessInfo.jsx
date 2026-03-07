import React from 'react';
import Icon from 'components/AppIcon';
import Button from 'components/ui/Button';

function StarRating({ rating, reviewCount }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5]?.map((star) => (
          <Icon
            key={star}
            name="Star"
            size={16}
            color={star <= Math.round(rating) ? 'var(--color-accent)' : 'var(--color-border)'}
          />
        ))}
      </div>
      <span className="text-sm font-data font-medium text-foreground">{rating?.toFixed(1)}</span>
      <span className="text-sm font-caption text-muted-foreground">({reviewCount} reseñas)</span>
    </div>
  );
}

export default function BusinessInfo({ business, onCall, onWhatsApp, onDirections, onShare }) {
  // Build category breadcrumb
  const parentCat = business?.parentCategoryName || (business?.categories?.[0]) || business?.category || null;
  const subCat = business?.subCategoryName || (business?.categories?.length > 1 ? business?.categories?.[1] : null);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              {/* Category breadcrumb */}
              {parentCat && (
                <div className="flex items-center gap-1">
                  <span
                    className="px-2 py-0.5 text-xs font-caption font-medium rounded-full"
                    style={{ background: 'var(--color-muted)', color: 'var(--color-secondary)' }}
                  >
                    {parentCat}
                  </span>
                  {subCat && (
                    <>
                      <Icon name="ChevronRight" size={12} color="var(--color-muted-foreground)" />
                      <span
                        className="px-2 py-0.5 text-xs font-caption font-medium rounded-full text-white"
                        style={{ background: 'var(--color-primary)' }}
                      >
                        {subCat}
                      </span>
                    </>
                  )}
                </div>
              )}
              {business?.claimed && (
                <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-caption font-medium rounded-full bg-success/10 text-success">
                  <Icon name="BadgeCheck" size={12} color="var(--color-success)" />
                  Verificado
                </span>
              )}
            </div>
            <h1 className="font-heading font-bold text-2xl md:text-3xl lg:text-4xl text-foreground leading-tight">
              {business?.name}
            </h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onShare}
            aria-label="Compartir negocio"
          >
            <Icon name="Share2" size={20} color="currentColor" />
          </Button>
        </div>

        <div className="mt-2">
          <StarRating rating={business?.rating} reviewCount={business?.reviewCount} />
        </div>

        <div className="flex items-start gap-1.5 mt-3 text-sm font-caption text-muted-foreground">
          <Icon name="MapPin" size={16} color="var(--color-secondary)" className="mt-0.5 shrink-0" />
          <span>{business?.address}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button variant="default" iconName="Phone" iconPosition="left" iconSize={16} onClick={onCall}>
          Llamar
        </Button>
        <Button variant="success" iconName="MessageCircle" iconPosition="left" iconSize={16} onClick={onWhatsApp}>
          WhatsApp
        </Button>
        <Button variant="outline" iconName="Navigation" iconPosition="left" iconSize={16} onClick={onDirections}>
          Cómo llegar
        </Button>
      </div>
    </div>
  );
}