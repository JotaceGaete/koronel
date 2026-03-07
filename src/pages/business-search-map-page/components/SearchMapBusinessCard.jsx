import React from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from 'components/AppIcon';
import Image from 'components/AppImage';

export default function SearchMapBusinessCard({ business, isSelected, onClick, cardRef }) {
  const navigate = useNavigate();

  const renderStars = (rating) =>
    Array.from({ length: 5 }, (_, i) => (
      <Icon
        key={i}
        name="Star"
        size={12}
        color={i < Math.floor(rating || 0) ? 'var(--color-accent)' : 'var(--color-border)'}
      />
    ));

  const hasBreadcrumb = business?.parentCategoryName || business?.category;
  const breadcrumbParent = business?.parentCategoryName || business?.category;
  const breadcrumbChild = business?.subCategoryName;

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      className={`flex gap-3 p-3 border rounded-lg cursor-pointer transition-all duration-200 bg-card hover:shadow-md ${
        isSelected
          ? 'border-primary ring-2 ring-primary ring-offset-1 shadow-md'
          : 'border-border hover:border-primary/40'
      }`}
    >
      {/* Image */}
      <div className="w-24 h-20 rounded-md overflow-hidden shrink-0 bg-muted">
        <Image
          src={business?.image}
          alt={business?.imageAlt || business?.name}
          className="w-full h-full object-cover"
        />
      </div>
      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          <h3 className="font-heading font-semibold text-sm text-card-foreground line-clamp-1 mb-0.5">
            {business?.name}
          </h3>
          {hasBreadcrumb && (
            <div className="flex items-center gap-1 flex-wrap mb-1">
              <span className="text-xs font-caption px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                {breadcrumbParent}
              </span>
              {breadcrumbChild && (
                <>
                  <Icon name="ChevronRight" size={10} color="var(--color-muted-foreground)" />
                  <span className="text-xs font-caption px-1.5 py-0.5 rounded-full text-white" style={{ background: 'var(--color-primary)' }}>
                    {breadcrumbChild}
                  </span>
                </>
              )}
            </div>
          )}
          <div className="flex items-center gap-1 mb-1">
            {renderStars(business?.rating)}
            <span className="text-xs font-data text-card-foreground ml-0.5">{business?.rating || '—'}</span>
          </div>
          {business?.address && (
            <div className="flex items-start gap-1">
              <Icon name="MapPin" size={11} color="var(--color-secondary)" className="mt-0.5 shrink-0" />
              <span className="text-xs font-caption text-muted-foreground line-clamp-1">{business?.address}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 mt-1.5">
          <button
            onClick={(e) => { e?.stopPropagation(); navigate(`/negocios/${business?.id}`); }}
            className="text-xs font-caption font-medium px-2 py-1 rounded-md transition-colors"
            style={{ background: 'var(--color-primary)', color: 'var(--color-primary-foreground)' }}
          >
            Ver
          </button>
          {business?.phone && (
            <a
              href={`tel:${business?.phone}`}
              onClick={(e) => e?.stopPropagation()}
              className="flex items-center justify-center w-7 h-7 rounded-md border border-border bg-muted hover:bg-primary hover:text-primary-foreground transition-all shrink-0"
              aria-label="Llamar"
            >
              <Icon name="Phone" size={12} color="currentColor" />
            </a>
          )}
          {business?.whatsapp && (
            <a
              href={`https://wa.me/${business?.whatsapp?.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e?.stopPropagation()}
              className="flex items-center justify-center w-7 h-7 rounded-md border border-green-200 bg-green-50 hover:bg-green-500 hover:text-white transition-all shrink-0"
              aria-label="WhatsApp"
            >
              <Icon name="MessageCircle" size={12} color="currentColor" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
