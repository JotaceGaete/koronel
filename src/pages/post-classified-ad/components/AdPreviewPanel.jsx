import React from 'react';
import Icon from 'components/AppIcon';
import Image from 'components/AppImage';

const CATEGORY_LABELS = {
  vehicles: 'Vehículos', 'real-estate': 'Inmuebles', electronics: 'Electrónica',
  clothing: 'Ropa', jobs: 'Empleos', services: 'Servicios',
  furniture: 'Muebles', sports: 'Deportes', other: 'Otros',
};

export default function AdPreviewPanel({ formData, photos }) {
  const hasContent = formData?.title || formData?.description || photos?.length > 0;

  return (
    <div className="bg-card border border-border rounded-md overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-2"
        style={{ background: 'var(--color-muted)' }}>
        <Icon name="Eye" size={16} color="var(--color-primary)" />
        <span className="text-sm font-caption font-semibold text-foreground">Vista previa del aviso</span>
      </div>
      {!hasContent ? (
        <div className="p-8 text-center">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
            style={{ background: 'var(--color-muted)' }}>
            <Icon name="FileText" size={22} color="var(--color-secondary)" />
          </div>
          <p className="text-sm font-caption text-muted-foreground">
            Completa el formulario para ver la vista previa
          </p>
        </div>
      ) : (
        <div className="p-4">
          {/* Image */}
          <div className="w-full h-40 md:h-48 rounded-md overflow-hidden bg-muted mb-4">
            {photos?.length > 0 ? (
              <Image
                src={photos?.[0]?.url}
                alt={photos?.[0]?.alt}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Icon name="Image" size={32} color="var(--color-secondary)" />
              </div>
            )}
          </div>

          {/* Category Badge */}
          {formData?.category && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-caption font-medium mb-2"
              style={{ background: 'var(--color-muted)', color: 'var(--color-secondary)' }}>
              <Icon name="Tag" size={11} color="currentColor" />
              {CATEGORY_LABELS?.[formData?.category] || formData?.category}
            </span>
          )}

          {/* Title */}
          <h3 className="font-heading font-semibold text-base text-card-foreground line-clamp-2 mb-1">
            {formData?.title || <span className="text-muted-foreground italic">Título del aviso</span>}
          </h3>

          {/* Price */}
          {formData?.price && (
            <p className="font-data font-semibold text-lg mb-2" style={{ color: 'var(--color-primary)' }}>
              ${Number(formData?.price?.replace(/\D/g, ''))?.toLocaleString('es-CL')}
            </p>
          )}

          {/* Description */}
          {formData?.description && (
            <p className="text-sm font-body text-card-foreground line-clamp-3 mb-3">
              {formData?.description}
            </p>
          )}

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-3 text-xs font-caption text-muted-foreground border-t border-border pt-3">
            {formData?.location && (
              <span className="flex items-center gap-1">
                <Icon name="MapPin" size={12} color="currentColor" />
                {formData?.location}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Icon name="Clock" size={12} color="currentColor" />
              Hace unos momentos
            </span>
            {formData?.phone && (
              <span className="flex items-center gap-1">
                <Icon name={formData?.whatsapp ? 'MessageCircle' : 'Phone'} size={12} color="currentColor" />
                {formData?.phone}
              </span>
            )}
          </div>

          {/* Photos count */}
          {photos?.length > 1 && (
            <div className="flex items-center gap-1 mt-2 text-xs font-caption text-muted-foreground">
              <Icon name="Images" size={12} color="currentColor" />
              {photos?.length} fotos
            </div>
          )}
        </div>
      )}
    </div>
  );
}